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
  Modal,
  ScrollArea,
  List,
  SegmentedControl,
  ActionIcon,
  ThemeIcon,
  Checkbox,
  Divider,
  Alert,
} from '@mantine/core'
import {
  IconSearch,
  IconChefHat,
  IconHeart,
  IconHeartFilled,
  IconCooker,
  IconCheck,
} from '@tabler/icons-react'
import { useInventoryStore } from '../store/inventoryStore'
import { suggestRecipes, searchRecipesByName } from '../lib/recipes'
import { matchRecipes, ingredientsMatch } from '../lib/recipeMatching'
import { translateToEnglish } from '../lib/ingredientTranslations'
import type { RecipeMatch } from '../lib/recipeMatching'

const FAVORITES_KEY = 'lagret:favorite-recipes'

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveFavorites(ids: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

type FilterMode = 'all' | 'ready' | 'almost'

export function RecipesPage() {
  const items = useInventoryStore((s) => s.items)
  const updateItem = useInventoryStore((s) => s.updateItem)
  const [matches, setMatches] = useState<RecipeMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<RecipeMatch | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites())
  const [cooking, setCooking] = useState(false)
  const [cookChecked, setCookChecked] = useState<Set<string>>(new Set())
  const [cookDone, setCookDone] = useState(false)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const inventoryNames = items.map((i) => i.name)

  const handleSuggest = async () => {
    setLoading(true)
    const names = inventoryNames
    const results = await suggestRecipes(names)
    setMatches(matchRecipes(results, names))
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    const results = await searchRecipesByName(searchQuery)
    setMatches(matchRecipes(results, inventoryNames))
    setLoading(false)
  }

  const toggleFavorite = (id: string) => {
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
    return true
  })

  const matchedInventoryItems = selected
    ? items.filter((inv) =>
        selected.matched.some((m) => ingredientsMatch(m, translateToEnglish(inv.name)))
      )
    : []

  const openCook = () => {
    setCookChecked(new Set(matchedInventoryItems.map((i) => i.id)))
    setCookDone(false)
    setCooking(true)
  }

  const handleCook = async () => {
    await Promise.all(
      matchedInventoryItems
        .filter((i) => cookChecked.has(i.id))
        .map((i) => updateItem(i.id, { quantity: Math.max(0, i.quantity - 1) }))
    )
    setCookDone(true)
  }

  const scoreColor = (score: number) => {
    if (score >= 1) return 'green'
    if (score >= 0.6) return 'yellow'
    return 'red'
  }

  return (
    <Stack p="md">
      <Text fw={700} size="xl">
        Recept
      </Text>

      <Button
        leftSection={<IconChefHat size={16} />}
        onClick={handleSuggest}
        loading={loading}
        variant="filled"
      >
        Föreslå recept från mitt lager
      </Button>

      <Group>
        <TextInput
          placeholder="Sök recept..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1 }}
        />
        <Button leftSection={<IconSearch size={16} />} onClick={handleSearch} loading={loading}>
          Sök
        </Button>
      </Group>

      {matches.length > 0 && (
        <SegmentedControl
          value={filter}
          onChange={(v) => setFilter(v as FilterMode)}
          data={[
            { label: 'Alla', value: 'all' },
            { label: 'Kan laga nu', value: 'ready' },
            { label: 'Nästan', value: 'almost' },
          ]}
        />
      )}

      {loading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : (
        <Stack gap="xs">
          {filtered.map((m) => {
            const isFav = favorites.has(m.recipe.idMeal)
            return (
              <Card
                key={m.recipe.idMeal}
                shadow="xs"
                radius="md"
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(m)}
              >
                <Group wrap="nowrap">
                  <Image src={m.recipe.strMealThumb} w={64} h={64} radius="md" />
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Text fw={600}>{m.recipe.strMeal}</Text>
                    <Group gap={4}>
                      <Badge size="xs" variant="light">
                        {m.recipe.strCategory}
                      </Badge>
                      <Badge size="xs" color={scoreColor(m.score)} data-testid="score-badge">
                        {m.matched.length}/{m.recipe.ingredients.length} ingredienser
                      </Badge>
                    </Group>
                    {m.missing.length > 0 && (
                      <Text size="xs" c="dimmed">
                        Saknas: {m.missing.slice(0, 3).join(', ')}
                        {m.missing.length > 3 ? ` +${m.missing.length - 3}` : ''}
                      </Text>
                    )}
                  </Stack>
                  <ActionIcon
                    variant="subtle"
                    color={isFav ? 'red' : 'gray'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(m.recipe.idMeal)
                    }}
                    aria-label={isFav ? 'Ta bort favorit' : 'Spara som favorit'}
                  >
                    {isFav ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                  </ActionIcon>
                </Group>
              </Card>
            )
          })}
        </Stack>
      )}

      <Modal
        opened={!!selected}
        onClose={() => {
          setSelected(null)
          setCooking(false)
          setCookDone(false)
        }}
        title={selected?.recipe.strMeal}
        size="lg"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {selected && (
          <Stack>
            <Image src={selected.recipe.strMealThumb} radius="md" />

            {!cooking ? (
              <>
                <Group justify="space-between">
                  <Text fw={600}>
                    Ingredienser ({selected.matched.length}/{selected.recipe.ingredients.length}{' '}
                    hemma)
                  </Text>
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
                <List>
                  {selected.recipe.ingredients.map((ing, i) => {
                    const have = selected.matched.some(
                      (m) => m.toLowerCase() === ing.name.toLowerCase()
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
                          {ing.measure} {ing.name}
                        </Text>
                      </List.Item>
                    )
                  })}
                </List>
                <Divider />
                <Text fw={600}>Instruktioner</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                  {selected.recipe.strInstructions}
                </Text>
              </>
            ) : cookDone ? (
              <Alert color="green" icon={<IconCheck size={16} />}>
                Lagret uppdaterat! Smaklig måltid.
              </Alert>
            ) : (
              <>
                <Text fw={600}>Vilka varor använde du?</Text>
                <Text size="sm" c="dimmed">
                  Bocka av det du använt — antalet minskas med 1.
                </Text>
                <Stack gap="xs">
                  {matchedInventoryItems.map((inv) => (
                    <Checkbox
                      key={inv.id}
                      checked={cookChecked.has(inv.id)}
                      onChange={() =>
                        setCookChecked((prev) => {
                          const next = new Set(prev)
                          if (next.has(inv.id)) next.delete(inv.id)
                          else next.add(inv.id)
                          return next
                        })
                      }
                      label={
                        <Text size="sm">
                          {inv.name}{' '}
                          <Text span c="dimmed">
                            ({inv.quantity} {inv.unit})
                          </Text>
                        </Text>
                      }
                    />
                  ))}
                </Stack>
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
      </Modal>
    </Stack>
  )
}
