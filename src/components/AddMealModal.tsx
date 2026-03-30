import { useState, useEffect, useRef, useCallback } from 'react'
import {
  TextInput,
  Tabs,
  Stack,
  Text,
  Group,
  UnstyledButton,
  Badge,
  Loader,
  Center,
} from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import dayjs from 'dayjs'
import 'dayjs/locale/sv'
import { BottomSheet } from './BottomSheet'
import { useMealPlanStore } from '../store/mealPlanStore'
import { useInventoryStore } from '../store/inventoryStore'
import { suggestRecipes, searchRecipes } from '../lib/recipes'
import { matchRecipe } from '../lib/recipeMatching'
import type { Recipe } from '../types'
import type { RecipeMatch } from '../lib/recipeMatching'

dayjs.locale('sv')

interface AddMealModalProps {
  opened: boolean
  onClose: () => void
  date: string | null
}

const FAVORITES_KEY = 'lagret:favorite-recipes'

function getFavoriteIds(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (raw) return JSON.parse(raw) as number[]
  } catch {
    // ignore
  }
  return []
}

function RecipeItem({
  recipe,
  match,
  onClick,
}: {
  recipe: Recipe
  match: RecipeMatch | null
  onClick: () => void
}) {
  const total = match ? match.matched.length + match.missing.length : 0
  const matchedCount = match ? match.matched.length : 0
  const score = match ? Math.round(match.score * 100) : 0

  return (
    <UnstyledButton
      onClick={onClick}
      p="sm"
      style={{
        borderRadius: 8,
        border: '1px solid #ecefe3',
        width: '100%',
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm" lineClamp={1}>
            {recipe.name}
          </Text>
          {total > 0 && (
            <Text size="xs" c="dimmed">
              {matchedCount} av {total} ingredienser hemma
            </Text>
          )}
          {recipe.totalTime && (
            <Text size="xs" c="dimmed">
              {recipe.totalTime}
            </Text>
          )}
        </Stack>
        {total > 0 && (
          <Badge
            variant="light"
            color={score >= 75 ? 'green' : score >= 40 ? 'yellow' : 'gray'}
            size="sm"
          >
            {score}%
          </Badge>
        )}
      </Group>
    </UnstyledButton>
  )
}

export function AddMealModal({ opened, onClose, date }: AddMealModalProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Recipe[]>([])
  const [suggestions, setSuggestions] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addItem = useMealPlanStore((s) => s.addItem)
  const inventoryItems = useInventoryStore((s) => s.items)
  const mealPlanItems = useMealPlanStore((s) => s.items)

  const inventoryNames = inventoryItems.map((i) => i.name)

  const getMatch = useCallback(
    (recipe: Recipe): RecipeMatch => matchRecipe(recipe, inventoryNames),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventoryNames.join(',')]
  )

  // Load suggestions when modal opens
  useEffect(() => {
    if (!opened) return
    setQuery('')
    setSearchResults([])

    if (inventoryNames.length > 0) {
      setSuggestionsLoading(true)
      suggestRecipes(inventoryNames, 20)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setSearchResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(() => {
      searchRecipes(query.trim())
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setLoading(false))
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleSelect = async (recipe: Recipe) => {
    if (!date) return
    try {
      await addItem(date, recipe.name ?? 'Okänt recept', recipe.id)
      onClose()
    } catch {
      // error handled by store
    }
  }

  const handleFreetext = async () => {
    if (!date || !query.trim()) return
    try {
      await addItem(date, query.trim())
      onClose()
    } catch {
      // error handled by store
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      handleFreetext()
    }
  }

  // Favorites: filter suggestions or search results by favorite IDs
  const favoriteIds = getFavoriteIds()
  const allKnownRecipes = [...suggestions, ...searchResults]
  const favoriteRecipes = allKnownRecipes.filter((r) => favoriteIds.includes(r.id))
  // Deduplicate
  const uniqueFavorites = Array.from(new Map(favoriteRecipes.map((r) => [r.id, r])).values())

  // Recent: recipes from meal plan history with recipe IDs, deduplicated by title
  const recentRecipes = (() => {
    const seen = new Set<string>()
    const result: { title: string; recipeId: number | null }[] = []
    const sorted = [...mealPlanItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    for (const item of sorted) {
      if (!seen.has(item.title) && result.length < 10) {
        seen.add(item.title)
        result.push({ title: item.title, recipeId: item.recipeId })
      }
    }
    return result
  })()

  const formattedDate = date ? dayjs(date).format('dddd D MMMM') : ''

  const renderRecipeList = (recipes: Recipe[]) => {
    if (recipes.length === 0) {
      return (
        <Text size="sm" c="dimmed" ta="center" py="md">
          Inga recept hittades
        </Text>
      )
    }
    return (
      <Stack gap="xs">
        {recipes.map((recipe) => (
          <RecipeItem
            key={recipe.id}
            recipe={recipe}
            match={getMatch(recipe)}
            onClick={() => handleSelect(recipe)}
          />
        ))}
      </Stack>
    )
  }

  // Show search results when searching, otherwise show tabs
  const showSearch = query.trim().length > 0

  return (
    <BottomSheet opened={opened} onClose={onClose} title={formattedDate}>
      <Stack gap="md">
        <TextInput
          placeholder="Sök recept eller skriv fritext..."
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />

        {showSearch ? (
          loading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : (
            <Stack gap="xs">
              {searchResults.length > 0 ? (
                renderRecipeList(searchResults)
              ) : (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  Tryck Enter för att lägga till &quot;{query.trim()}&quot; som fritext
                </Text>
              )}
            </Stack>
          )
        ) : (
          <Tabs defaultValue="suggestions">
            <Tabs.List>
              <Tabs.Tab value="suggestions">Förslag</Tabs.Tab>
              <Tabs.Tab value="favorites">Favoriter</Tabs.Tab>
              <Tabs.Tab value="recent">Senaste</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="suggestions" pt="md">
              {suggestionsLoading ? (
                <Center py="xl">
                  <Loader size="sm" />
                </Center>
              ) : (
                renderRecipeList(suggestions)
              )}
            </Tabs.Panel>

            <Tabs.Panel value="favorites" pt="md">
              {uniqueFavorites.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  Inga favoriter sparade
                </Text>
              ) : (
                renderRecipeList(uniqueFavorites)
              )}
            </Tabs.Panel>

            <Tabs.Panel value="recent" pt="md">
              {recentRecipes.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  Inga senaste måltider
                </Text>
              ) : (
                <Stack gap="xs">
                  {recentRecipes.map((item, i) => (
                    <UnstyledButton
                      key={`${item.title}-${i}`}
                      onClick={async () => {
                        if (!date) return
                        try {
                          await addItem(date, item.title, item.recipeId ?? undefined)
                          onClose()
                        } catch {
                          // error handled by store
                        }
                      }}
                      p="sm"
                      style={{
                        borderRadius: 8,
                        border: '1px solid #ecefe3',
                        width: '100%',
                      }}
                    >
                      <Text fw={600} size="sm">
                        {item.title}
                      </Text>
                    </UnstyledButton>
                  ))}
                </Stack>
              )}
            </Tabs.Panel>
          </Tabs>
        )}
      </Stack>
    </BottomSheet>
  )
}
