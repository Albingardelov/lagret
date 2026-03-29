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

  const TERRA = '#B5432A'
  const BG = '#F7F2EB'

  return (
    <Box style={{ maxWidth: 680, margin: '0 auto', background: BG, minHeight: '100%' }}>
      <Stack gap={0}>
        {/* Header */}
        <Box px="md" pt="lg" pb="sm">
          <Text
            style={{
              fontFamily: '"Epilogue", sans-serif',
              fontWeight: 900,
              fontSize: 28,
              color: '#1C1410',
              lineHeight: 1.1,
              letterSpacing: '-0.5px',
            }}
          >
            Recept
          </Text>
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 13,
              color: '#7A6A5A',
              marginTop: 4,
            }}
          >
            Baserat på ditt lager
          </Text>
        </Box>

        <Box px="md" pb="md">
          <TextInput
            placeholder="Sök recept, ingredienser..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            radius="xl"
            styles={{
              input: {
                fontFamily: '"Manrope", sans-serif',
                background: '#FFFFFF',
                border: '1.5px solid #E8E0D8',
                fontSize: 14,
              },
            }}
            rightSection={
              <ActionIcon
                variant="subtle"
                onClick={handleSearch}
                loading={loading}
                size="sm"
                style={{ color: TERRA }}
              >
                <IconSearch size={16} />
              </ActionIcon>
            }
          />
        </Box>

        {/* Hero CTA card */}
        <Box px="md" pb="md">
          <Box
            style={{
              background: TERRA,
              borderRadius: 18,
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
              }}
            />
            <Text
              style={{
                fontFamily: '"Epilogue", sans-serif',
                fontWeight: 800,
                fontSize: 18,
                color: '#FFFFFF',
                lineHeight: 1.3,
                marginBottom: 6,
              }}
            >
              Vad ska vi äta idag?
            </Text>
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 13,
                color: 'rgba(255,255,255,0.8)',
                marginBottom: 14,
              }}
            >
              Vi matchar innehållet i ditt skafferi med de mest populära recepten.
            </Text>
            <Button
              size="sm"
              radius="xl"
              leftSection={<IconChefHat size={15} />}
              onClick={handleSuggest}
              loading={loading}
              style={{
                background: '#FFFFFF',
                color: TERRA,
                fontFamily: '"Manrope", sans-serif',
                fontWeight: 700,
              }}
            >
              Föreslå recept baserat på mitt lager
            </Button>
          </Box>
        </Box>

        {/* Sticky bottom action bar — hidden since we have hero CTA now */}
        <Box style={{ display: 'none' }}>
          <Button
            fullWidth
            leftSection={<IconChefHat size={18} />}
            onClick={handleSuggest}
            loading={loading}
            radius={12}
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontWeight: 700,
              background: TERRA,
              border: 'none',
            }}
          >
            Föreslå recept från mitt lager
          </Button>
        </Box>

        {matches.length > 0 && (
          <ScrollArea scrollbarSize={0} px="md" pb="sm">
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
                      background: active ? TERRA : '#EDE8E2',
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
                        color: active ? '#ffffff' : '#4A3728',
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
          <Stack gap="sm" px="md" pb={40}>
            {filtered.map((m) => {
              const isFav = favorites.has(m.recipe.id)
              return (
                <Card
                  key={m.recipe.id}
                  shadow="none"
                  radius={16}
                  p={0}
                  style={{
                    cursor: 'pointer',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 1px 4px rgba(74,55,40,0.08)',
                    transition: 'box-shadow 0.15s ease',
                  }}
                  onClick={() => setSelected(m)}
                >
                  {m.recipe.imageUrls?.[0] && (
                    <div style={{ position: 'relative' }}>
                      <Image src={m.recipe.imageUrls[0]} h={220} style={{ display: 'block' }} />
                      {/* Gradient overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'linear-gradient(to top, rgba(28,20,16,0.65) 0%, rgba(28,20,16,0.1) 50%, transparent 100%)',
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
                          <IconHeartFilled size={16} color={TERRA} />
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
                              ? 'rgba(22,163,74,0.9)'
                              : m.score >= 0.6
                                ? 'rgba(234,88,12,0.9)'
                                : 'rgba(181,67,42,0.85)',
                          color: '#fff',
                          backdropFilter: 'blur(8px)',
                          fontFamily: '"Manrope", sans-serif',
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      >
                        {m.score >= 1
                          ? 'Du har allt'
                          : `Saknar ${m.missing.length} ingrediens${m.missing.length !== 1 ? 'er' : ''}`}
                      </Badge>
                      {m.recipe.totalTime && (
                        <Badge
                          size="sm"
                          radius="xl"
                          style={{
                            position: 'absolute',
                            bottom: 10,
                            right: 10,
                            background: 'rgba(255,255,255,0.9)',
                            color: '#1C1410',
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
                  <div style={{ padding: '14px 16px 18px' }}>
                    <Text
                      style={{
                        fontFamily: '"Epilogue", sans-serif',
                        fontWeight: 700,
                        fontSize: 16,
                        color: '#1C1410',
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
                          color: '#7A6A5A',
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
    </Box>
  )
}
