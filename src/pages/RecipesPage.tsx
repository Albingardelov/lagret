import { useState, useEffect } from 'react'
import {
  Stack,
  Text,
  Button,
  Card,
  Image,
  Group,
  Badge,
  Loader,
  Center,
  TextInput,
  List,
  ScrollArea,
  Box,
  ActionIcon,
  ThemeIcon,
  Checkbox,
  Divider,
  Alert,
} from '@mantine/core'
import { BottomSheet } from '../components/BottomSheet'
import {
  IconSearch,
  IconChefHat,
  IconHeart,
  IconHeartFilled,
  IconCooker,
  IconCheck,
  IconShoppingCart,
} from '@tabler/icons-react'
import { useInventoryStore } from '../store/inventoryStore'
import { useShoppingStore } from '../store/shoppingStore'
import { parseShoppingInput } from '../lib/parseShoppingInput'
import { suggestRecipes, searchRecipes, getRecentRecipes } from '../lib/recipes'
import {
  matchRecipes,
  ingredientsMatch,
  getAllIngredients,
  getCached,
  setCache,
} from '../lib/recipeMatching'
import type { RecipeMatch } from '../lib/recipeMatching'
import type { IngredientGroup } from '../types'

/** Merge all null-named groups into one, keeping named groups as-is */
function mergeUnnamedGroups(groups: IngredientGroup[]): IngredientGroup[] {
  const unnamed = groups.filter((g) => !g.name)
  const named = groups.filter((g) => g.name)
  const merged: IngredientGroup[] = []
  if (unnamed.length > 0) {
    merged.push({ name: null, items: unnamed.flatMap((g) => g.items) })
  }
  return [...merged, ...named]
}

const FAVORITES_KEY = 'lagret:favorite-recipes'

function loadFavorites(): Set<number> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return new Set(raw ? (JSON.parse(raw) as number[]) : [])
  } catch {
    return new Set()
  }
}

function saveFavorites(ids: Set<number>) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

type FilterMode = 'all' | 'ready' | 'almost' | 'favorites'

export function RecipesPage() {
  const items = useInventoryStore((s) => s.items)
  const updateItem = useInventoryStore((s) => s.updateItem)
  const addShoppingItem = useShoppingStore((s) => s.addItem)
  const [matches, setMatches] = useState<RecipeMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<RecipeMatch | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [favorites, setFavorites] = useState<Set<number>>(() => loadFavorites())
  const [cooking, setCooking] = useState(false)
  const [cookChecked, setCookChecked] = useState<Set<string>>(new Set())
  const [cookDone, setCookDone] = useState(false)
  const [addingToList, setAddingToList] = useState(false)
  const [addedToList, setAddedToList] = useState(false)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const inventoryNames = items.map((i) => i.name)

  useEffect(() => {
    const cached = getCached<RecipeMatch[]>('recipes:matches')
    if (cached && cached.length > 0) {
      setMatches(cached)
      return
    }
    const loadInitial = async () => {
      setLoading(true)
      let results: RecipeMatch[]
      if (inventoryNames.length > 0) {
        const recipes = await suggestRecipes(inventoryNames)
        results = matchRecipes(recipes, inventoryNames)
      } else {
        const recipes = await getRecentRecipes()
        results = matchRecipes(recipes, [])
      }
      setMatches(results)
      setCache('recipes:matches', results)
      setLoading(false)
    }
    loadInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSuggest = async () => {
    setLoading(true)
    const names = inventoryNames
    const recipes = await suggestRecipes(names)
    const results = matchRecipes(recipes, names)
    setMatches(results)
    setCache('recipes:matches', results)
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    const recipes = await searchRecipes(searchQuery)
    const results = matchRecipes(recipes, inventoryNames)
    setMatches(results)
    setCache('recipes:matches', results)
    setLoading(false)
  }

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filtered = matches.filter((m) => {
    if (filter === 'ready') return m.score >= 1
    if (filter === 'almost') return m.score >= 0.6
    if (filter === 'favorites') return favorites.has(m.recipe.id)
    return true
  })

  const matchedInventoryItems = selected
    ? items.filter((inv) => selected.matched.some((m) => ingredientsMatch(m, inv.name)))
    : []

  const openCook = () => {
    if (!selected) return
    const preChecked = new Set<string>()
    mergeUnnamedGroups(selected.recipe.ingredientGroups).forEach((group, gi) => {
      group.items.forEach((ingredient, i) => {
        const hasInInventory = matchedInventoryItems.some((inv) =>
          ingredientsMatch(ingredient, inv.name)
        )
        if (hasInInventory) preChecked.add(`${gi}-${i}`)
      })
    })
    setCookChecked(preChecked)
    setCookDone(false)
    setCooking(true)
  }

  const handleCook = async () => {
    if (!selected) return
    const toDecrement = new Set<string>()
    mergeUnnamedGroups(selected.recipe.ingredientGroups).forEach((group, gi) => {
      group.items.forEach((ingredient, i) => {
        if (!cookChecked.has(`${gi}-${i}`)) return
        const inv = matchedInventoryItems.find((it) => ingredientsMatch(ingredient, it.name))
        if (inv) toDecrement.add(inv.id)
      })
    })
    await Promise.all(
      matchedInventoryItems
        .filter((i) => toDecrement.has(i.id))
        .map((i) => updateItem(i.id, { quantity: Math.max(0, i.quantity - 1) }))
    )
    setCookDone(true)
  }

  const handleAddMissingToShoppingList = async () => {
    if (!selected || selected.missing.length === 0) return
    setAddingToList(true)
    try {
      const recipeName = selected.recipe.name
      await Promise.all(
        selected.missing.map((ingredient) => {
          const parsed = parseShoppingInput(ingredient)
          const name = parsed.name || ingredient
          const note =
            parsed.quantity !== 1 || parsed.unit !== 'st'
              ? `${parsed.quantity} ${parsed.unit} — ${recipeName}`
              : (recipeName ?? undefined)
          return addShoppingItem(name, 1, 'st', note)
        })
      )
      setAddedToList(true)
    } finally {
      setAddingToList(false)
    }
  }

  return (
    <Stack p="md">
      <Text fw={700} size="xl">
        Recept
      </Text>

      <Box px="md">
        <Group gap={8}>
          <TextInput
            placeholder="Sök recept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
            styles={{
              input: {
                fontFamily: '"Manrope", sans-serif',
                borderRadius: 12,
                border: '1.5px solid #dde3d3',
                background: '#f8fbee',
              },
            }}
            rightSection={
              <ActionIcon variant="subtle" onClick={handleSearch} loading={loading} size="sm">
                <IconSearch size={16} />
              </ActionIcon>
            }
          />
        </Group>
      </Box>

      {/* Sticky bottom action bar */}
      <Box
        style={{
          position: 'fixed',
          bottom: 72,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '10px 16px',
          background: 'rgba(248, 251, 238, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid #ecefe3',
        }}
      >
        <Button
          fullWidth
          leftSection={<IconChefHat size={18} />}
          onClick={handleSuggest}
          loading={loading}
          radius={12}
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #53642e 0%, #889a5e 100%)',
            border: 'none',
          }}
        >
          Föreslå recept från mitt lager
        </Button>
      </Box>

      {matches.length > 0 && (
        <ScrollArea scrollbarSize={0} px="md">
          <Group gap={8} wrap="nowrap" py={4}>
            {(
              [
                { label: 'Alla', value: 'all' },
                { label: 'Favoriter', value: 'favorites' },
                { label: 'Kan laga nu', value: 'ready' },
                { label: 'Nästan', value: 'almost' },
              ] as const
            ).map((opt) => {
              const active = filter === opt.value
              return (
                <Box
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '7px 14px',
                    borderRadius: 20,
                    background: active ? '#53642e' : '#ecefe3',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontSize: 13,
                      fontWeight: 600,
                      color: active ? '#ffffff' : '#191d16',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Box>
              )
            })}
          </Group>
        </ScrollArea>
      )}

      {loading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : (
        <Stack gap="sm" px="md" pb={80}>
          {filtered.map((m) => {
            const isFav = favorites.has(m.recipe.id)
            const allCount = getAllIngredients(m.recipe).length
            return (
              <Card
                key={m.recipe.id}
                shadow="none"
                radius={16}
                p={0}
                style={{
                  cursor: 'pointer',
                  overflow: 'hidden',
                  border: '1.5px solid #ecefe3',
                  transition: 'box-shadow 0.15s ease',
                }}
                onClick={() => setSelected(m)}
              >
                {m.recipe.imageUrls?.[0] && (
                  <div style={{ position: 'relative' }}>
                    <Image src={m.recipe.imageUrls[0]} h={160} style={{ display: 'block' }} />
                    {/* Gradient overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 60,
                        background: 'linear-gradient(transparent, rgba(25,29,22,0.5))',
                      }}
                    />
                    {/* Favorite button */}
                    <ActionIcon
                      variant="subtle"
                      radius="xl"
                      size={32}
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(8px)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(m.recipe.id)
                      }}
                      aria-label={isFav ? 'Ta bort favorit' : 'Spara som favorit'}
                    >
                      {isFav ? (
                        <IconHeartFilled size={16} color="#e03131" />
                      ) : (
                        <IconHeart size={16} color="#666" />
                      )}
                    </ActionIcon>
                    {/* Score pill on image */}
                    <Badge
                      size="sm"
                      radius="xl"
                      data-testid="score-badge"
                      style={{
                        position: 'absolute',
                        bottom: 10,
                        left: 10,
                        background:
                          m.score >= 1
                            ? 'rgba(64,160,43,0.9)'
                            : m.score >= 0.6
                              ? 'rgba(224,160,43,0.9)'
                              : 'rgba(180,60,60,0.85)',
                        color: '#fff',
                        backdropFilter: 'blur(8px)',
                        fontFamily: '"Manrope", sans-serif',
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      {m.matched.length}/{allCount} ingredienser
                    </Badge>
                    {m.recipe.totalTime && (
                      <Badge
                        size="sm"
                        radius="xl"
                        style={{
                          position: 'absolute',
                          bottom: 10,
                          right: 10,
                          background: 'rgba(255,255,255,0.85)',
                          color: '#191d16',
                          backdropFilter: 'blur(8px)',
                          fontFamily: '"Manrope", sans-serif',
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      >
                        {m.recipe.totalTime} min
                      </Badge>
                    )}
                  </div>
                )}
                <div style={{ padding: '12px 14px 14px' }}>
                  <Text
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontWeight: 700,
                      fontSize: 15,
                      color: '#191d16',
                      lineHeight: 1.3,
                    }}
                  >
                    {m.recipe.name}
                  </Text>
                  {m.missing.length > 0 && (
                    <Text
                      style={{
                        fontFamily: '"Manrope", sans-serif',
                        fontSize: 12,
                        color: '#a8b4a0',
                        marginTop: 4,
                      }}
                    >
                      Saknas: {m.missing.slice(0, 3).join(', ')}
                      {m.missing.length > 3 ? ` +${m.missing.length - 3}` : ''}
                    </Text>
                  )}
                </div>
              </Card>
            )
          })}
        </Stack>
      )}

      <BottomSheet
        opened={!!selected}
        onClose={() => {
          setSelected(null)
          setCooking(false)
          setCookDone(false)
          setAddedToList(false)
        }}
        title={selected?.recipe.name}
        size="xl"
      >
        {selected && (
          <Stack>
            {selected.recipe.imageUrls?.[0] && (
              <Image src={selected.recipe.imageUrls[0]} radius="md" />
            )}
            {selected.recipe.servings && (
              <Text size="sm" c="dimmed">
                {selected.recipe.servings} portioner
              </Text>
            )}

            {!cooking ? (
              <>
                <Group justify="space-between">
                  <Text fw={600}>
                    Ingredienser ({selected.matched.length}/
                    {getAllIngredients(selected.recipe).length} hemma)
                  </Text>
                  <Group gap="xs">
                    {selected.missing.length > 0 && (
                      <Button
                        size="xs"
                        variant="light"
                        color={addedToList ? 'green' : undefined}
                        leftSection={
                          addedToList ? <IconCheck size={14} /> : <IconShoppingCart size={14} />
                        }
                        onClick={handleAddMissingToShoppingList}
                        loading={addingToList}
                        disabled={addedToList}
                      >
                        {addedToList ? 'Tillagda' : 'Handla saknade ingredienser'}
                      </Button>
                    )}
                    {matchedInventoryItems.length > 0 && (
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconCooker size={14} />}
                        onClick={openCook}
                      >
                        Laga rätten
                      </Button>
                    )}
                  </Group>
                </Group>
                {mergeUnnamedGroups(selected.recipe.ingredientGroups).map((group, gi) => (
                  <Stack key={gi} gap={4}>
                    {group.name && (
                      <Text fw={600} size="sm" mt={gi > 0 ? 'xs' : 0}>
                        {group.name}
                      </Text>
                    )}
                    <List>
                      {group.items.map((ingredient, i) => {
                        const have = selected.matched.some(
                          (m) => m.toLowerCase() === ingredient.toLowerCase()
                        )
                        return (
                          <List.Item
                            key={i}
                            icon={
                              <ThemeIcon color={have ? 'green' : 'red'} size={16} radius="xl">
                                <span style={{ fontSize: 10 }}>{have ? '✓' : '✗'}</span>
                              </ThemeIcon>
                            }
                          >
                            <Text size="sm" c={have ? undefined : 'dimmed'}>
                              {ingredient}
                            </Text>
                          </List.Item>
                        )
                      })}
                    </List>
                  </Stack>
                ))}
                <Divider />
                <Text fw={600}>Instruktioner</Text>
                <List type="ordered">
                  {selected.recipe.instructions.map((step, i) => (
                    <List.Item key={i}>
                      <Text size="sm">{step}</Text>
                    </List.Item>
                  ))}
                </List>
              </>
            ) : cookDone ? (
              <Alert color="green" icon={<IconCheck size={16} />}>
                Lagret uppdaterat! Smaklig måltid.
              </Alert>
            ) : (
              <>
                <Text fw={600}>Bocka av ingredienser du använt</Text>
                <Text size="sm" c="dimmed">
                  Varor från lagret minskas med 1 st.
                </Text>
                {mergeUnnamedGroups(selected.recipe.ingredientGroups).map((group, gi) => (
                  <Stack key={gi} gap="xs">
                    {group.name && (
                      <Text fw={600} size="sm" mt={gi > 0 ? 'xs' : 0}>
                        {group.name}
                      </Text>
                    )}
                    {group.items.map((ingredient, i) => {
                      const invItem = matchedInventoryItems.find((inv) =>
                        ingredientsMatch(ingredient, inv.name)
                      )
                      const key = `${gi}-${i}`
                      return (
                        <Checkbox
                          key={key}
                          checked={cookChecked.has(key)}
                          onChange={() =>
                            setCookChecked((prev) => {
                              const next = new Set(prev)
                              if (next.has(key)) next.delete(key)
                              else next.add(key)
                              return next
                            })
                          }
                          label={
                            <Text size="sm">
                              {ingredient}
                              {invItem && (
                                <Text span c="dimmed">
                                  {' '}
                                  ({invItem.quantity} {invItem.unit} i lager)
                                </Text>
                              )}
                            </Text>
                          }
                        />
                      )
                    })}
                  </Stack>
                ))}
                <Group>
                  <Button variant="subtle" color="gray" onClick={() => setCooking(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={handleCook} disabled={cookChecked.size === 0}>
                    Bekräfta
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        )}
      </BottomSheet>
    </Stack>
  )
}
