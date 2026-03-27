# Recipe DB Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TheMealDB API with a local Supabase `recipes` table (25k Swedish recipes) as the recipe data source.

**Architecture:** Single Supabase project with all tables. Recipe search uses Postgres full-text search via RPC functions. Ingredient matching done server-side via RPC. Client-side scoring still used for display (matched/missing).

**Tech Stack:** React 19, TypeScript, Supabase JS SDK, Vitest, MSW

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/types/index.ts` | Replace MealDB types with new Recipe type |
| Rewrite | `src/lib/recipes.ts` | Supabase queries instead of MealDB fetch calls |
| Modify | `src/lib/recipeMatching.ts` | Remove English translation, adapt to `string[]` ingredients |
| Delete | `src/lib/ingredientTranslations.ts` | No longer needed |
| Modify | `src/pages/RecipesPage.tsx` | Adapt to new Recipe type and function signatures |
| Rewrite | `src/lib/__tests__/recipes.test.ts` | Mock Supabase RPC instead of MealDB HTTP |
| Modify | `src/lib/__tests__/recipeMatching.test.ts` | Update test fixtures to new Recipe type |
| Rewrite | `src/test/mocks/handlers/mealdb.ts` → `src/test/mocks/handlers/recipes.ts` | Supabase recipe mock handlers |
| Modify | `src/test/mocks/server.ts` | Import new recipe handlers |

---

### Task 1: Update Recipe Type

**Files:**
- Modify: `src/types/index.ts:27-68`

- [ ] **Step 1: Replace Recipe and delete MealDB types**

Replace lines 27-68 in `src/types/index.ts` with:

```ts
export interface Recipe {
  id: number
  url: string
  slug: string | null
  name: string | null
  description: string | null
  ingredients: string[]
  instructions: string[]
  imageUrls: string[]
  cookTime: string | null
  prepTime: string | null
  totalTime: string | null
  servings: string | null
}
```

This deletes `MealDBResponse` and `MealDBMeal` and changes `Recipe` from MealDB shape to the Supabase schema shape.

- [ ] **Step 2: Verify TypeScript compiles (expect errors)**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: Type errors in `recipes.ts`, `recipeMatching.ts`, `RecipesPage.tsx`, and test files. This confirms the type change propagated. These get fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor: replace MealDB types with Supabase Recipe type"
```

---

### Task 2: Add Recipe Row Mapper to recipes.ts

**Files:**
- Rewrite: `src/lib/recipes.ts`

- [ ] **Step 1: Write the failing test**

Replace `src/lib/__tests__/recipes.test.ts` entirely:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing recipes
const mockRpc = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
          limit: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        textSearch: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
      }),
    })),
  },
}))

import { searchRecipes, getRecipeById, getRecipeBySlug, suggestRecipes } from '../recipes'

const MOCK_DB_ROW = {
  id: 1,
  url: 'https://www.ica.se/recept/test-1/',
  slug: 'test-1',
  name: 'Testrecept',
  description: 'Ett testrecept',
  ingredients: ['200 g pasta', '1 burk krossade tomater'],
  instructions: ['Koka pastan.', 'Häll på tomatsåsen.'],
  image_urls: ['https://example.com/image.jpg'],
  cook_time: 'PT20M',
  prep_time: 'PT10M',
  total_time: 'PT30M',
  servings: '4',
}

describe('searchRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls search_recipes RPC and maps results', async () => {
    mockRpc.mockResolvedValue({ data: [MOCK_DB_ROW], error: null })

    const results = await searchRecipes('pasta')
    expect(mockRpc).toHaveBeenCalledWith('search_recipes', { query: 'pasta', lim: 20 })
    expect(results).toHaveLength(1)
    expect(results[0].imageUrls).toEqual(['https://example.com/image.jpg'])
    expect(results[0].cookTime).toBe('PT20M')
  })

  it('returns [] on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } })

    const results = await searchRecipes('pasta')
    expect(results).toEqual([])
  })

  it('returns [] for empty query', async () => {
    const results = await searchRecipes('')
    expect(mockRpc).not.toHaveBeenCalled()
    expect(results).toEqual([])
  })
})

describe('getRecipeById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped recipe for valid id', async () => {
    mockSingle.mockResolvedValue({ data: MOCK_DB_ROW, error: null })

    const recipe = await getRecipeById(1)
    expect(recipe).not.toBeNull()
    expect(recipe!.name).toBe('Testrecept')
    expect(recipe!.ingredients).toEqual(['200 g pasta', '1 burk krossade tomater'])
  })

  it('returns null for unknown id', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const recipe = await getRecipeById(99999)
    expect(recipe).toBeNull()
  })
})

describe('getRecipeBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped recipe for valid slug', async () => {
    mockSingle.mockResolvedValue({ data: MOCK_DB_ROW, error: null })

    const recipe = await getRecipeBySlug('test-1')
    expect(recipe).not.toBeNull()
    expect(recipe!.slug).toBe('test-1')
  })

  it('returns null for unknown slug', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const recipe = await getRecipeBySlug('nonexistent')
    expect(recipe).toBeNull()
  })
})

describe('suggestRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns [] for empty ingredients', async () => {
    const results = await suggestRecipes([])
    expect(mockRpc).not.toHaveBeenCalled()
    expect(results).toEqual([])
  })

  it('calls match_recipes_by_ingredients RPC and fetches full recipes', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: [{ id: 1, name: 'Testrecept', slug: 'test-1', image_urls: ['img.jpg'], match_count: 2 }],
        error: null,
      })
    mockSingle.mockResolvedValue({ data: MOCK_DB_ROW, error: null })

    const results = await suggestRecipes(['pasta', 'tomater'])
    expect(mockRpc).toHaveBeenCalledWith('match_recipes_by_ingredients', {
      search_ingredients: ['pasta', 'tomater'],
      lim: 20,
    })
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Testrecept')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/recipes.test.ts`

Expected: FAIL — `searchRecipes`, `getRecipeBySlug` etc. don't exist yet.

- [ ] **Step 3: Rewrite recipes.ts**

Replace `src/lib/recipes.ts` entirely:

```ts
import { supabase } from './supabase'
import type { Recipe } from '../types'

interface RecipeRow {
  id: number
  url: string
  slug: string | null
  name: string | null
  description: string | null
  ingredients: string[]
  instructions: string[]
  image_urls: string[]
  cook_time: string | null
  prep_time: string | null
  total_time: string | null
  servings: string | null
}

function mapRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    url: row.url,
    slug: row.slug,
    name: row.name,
    description: row.description,
    ingredients: row.ingredients ?? [],
    instructions: row.instructions ?? [],
    imageUrls: row.image_urls ?? [],
    cookTime: row.cook_time,
    prepTime: row.prep_time,
    totalTime: row.total_time,
    servings: row.servings,
  }
}

export async function searchRecipes(query: string, limit = 20): Promise<Recipe[]> {
  if (!query.trim()) return []
  const { data, error } = await supabase.rpc('search_recipes', { query, lim: limit })
  if (error || !data) return []
  return (data as RecipeRow[]).map(mapRecipe)
}

export async function getRecipeById(id: number): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, url, slug, name, description, ingredients, instructions, image_urls, cook_time, prep_time, total_time, servings')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return mapRecipe(data as RecipeRow)
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, url, slug, name, description, ingredients, instructions, image_urls, cook_time, prep_time, total_time, servings')
    .eq('slug', slug)
    .single()
  if (error || !data) return null
  return mapRecipe(data as RecipeRow)
}

export async function suggestRecipes(ingredientNames: string[], limit = 20): Promise<Recipe[]> {
  if (ingredientNames.length === 0) return []
  const { data, error } = await supabase.rpc('match_recipes_by_ingredients', {
    search_ingredients: ingredientNames,
    lim: limit,
  })
  if (error || !data) return []

  const matches = data as { id: number; name: string; slug: string; image_urls: string[]; match_count: number }[]
  const recipes = await Promise.all(matches.map((m) => getRecipeById(m.id)))
  return recipes.filter(Boolean) as Recipe[]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/recipes.test.ts`

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipes.ts src/lib/__tests__/recipes.test.ts
git commit -m "feat: rewrite recipes lib to query Supabase instead of MealDB"
```

---

### Task 3: Update recipeMatching for New Recipe Type

**Files:**
- Modify: `src/lib/recipeMatching.ts`
- Modify: `src/lib/__tests__/recipeMatching.test.ts`

- [ ] **Step 1: Update test fixtures to new Recipe type**

Replace `src/lib/__tests__/recipeMatching.test.ts` entirely:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeIngredient, matchRecipe, matchRecipes } from '../recipeMatching'
import type { Recipe } from '../../types'

const BASE_RECIPE: Recipe = {
  id: 1,
  url: 'https://example.com/pasta-bolognese',
  slug: 'pasta-bolognese',
  name: 'Pasta Bolognese',
  description: 'Klassisk pasta bolognese',
  ingredients: ['200 g pasta', '2 tomater', '300 g nötfärs', '1 lök'],
  instructions: ['Koka pastan.', 'Stek färsen.'],
  imageUrls: [],
  cookTime: null,
  prepTime: null,
  totalTime: null,
  servings: '4',
}

describe('normalizeIngredient', () => {
  it('lowercasar och trimmar', () => {
    expect(normalizeIngredient('  Tomat  ')).toBe('tomat')
  })

  it('kollapsar mellanslag', () => {
    expect(normalizeIngredient('gul  lök')).toBe('gul lök')
  })
})

describe('matchRecipe', () => {
  it('matchar ingredienser mot lager och beräknar poäng', () => {
    const inventory = ['pasta', 'nötfärs', 'salt']
    const result = matchRecipe(BASE_RECIPE, inventory)
    expect(result.matched).toContain('200 g pasta')
    expect(result.matched).toContain('300 g nötfärs')
    expect(result.missing).toContain('2 tomater')
    expect(result.missing).toContain('1 lök')
    expect(result.score).toBeCloseTo(0.5)
  })

  it('returnerar score 1 när allt finns', () => {
    const inventory = ['pasta', 'tomat', 'nötfärs', 'lök']
    const result = matchRecipe(BASE_RECIPE, inventory)
    expect(result.score).toBe(1)
    expect(result.missing).toHaveLength(0)
  })

  it('returnerar score 0 när inget finns', () => {
    const result = matchRecipe(BASE_RECIPE, [])
    expect(result.score).toBe(0)
    expect(result.matched).toHaveLength(0)
  })

  it('matchar case-insensitivt', () => {
    const result = matchRecipe(BASE_RECIPE, ['PASTA', 'TOMAT', 'NÖTFÄRS', 'LÖK'])
    expect(result.score).toBe(1)
  })

  it('returnerar score 0 för recept utan ingredienser', () => {
    const emptyRecipe = { ...BASE_RECIPE, ingredients: [] }
    const result = matchRecipe(emptyRecipe, ['pasta'])
    expect(result.score).toBe(0)
  })
})

describe('matchRecipes', () => {
  it('sorterar recept efter poäng fallande', () => {
    const r2: Recipe = {
      ...BASE_RECIPE,
      id: 2,
      slug: 'enkel-pasta',
      name: 'Enkel pasta',
      ingredients: ['200 g pasta'],
    }
    const inventory = ['pasta', 'tomat', 'nötfärs', 'lök']
    const results = matchRecipes([BASE_RECIPE, r2], inventory)
    expect(results).toHaveLength(2)
  })

  it('det receptet med flest matchande ingredienser sorteras först', () => {
    const lowMatch: Recipe = {
      ...BASE_RECIPE,
      id: 3,
      slug: 'okant-recept',
      name: 'Okänt recept',
      ingredients: ['1 enhörning', '1 drake'],
    }
    const inventory = ['pasta', 'tomat', 'nötfärs', 'lök']
    const results = matchRecipes([lowMatch, BASE_RECIPE], inventory)
    expect(results[0].recipe.id).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/recipeMatching.test.ts`

Expected: FAIL — `matchRecipe` still expects `{ name, measure }[]` ingredients and uses `translateToEnglish`.

- [ ] **Step 3: Update recipeMatching.ts**

Replace `src/lib/recipeMatching.ts` entirely:

```ts
import type { Recipe } from '../types'

export interface RecipeMatch {
  recipe: Recipe
  matched: string[]
  missing: string[]
  score: number // 0–1
}

/** Normalizes an ingredient name for fuzzy comparison */
export function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Returns true if two ingredient names are considered the same */
export function ingredientsMatch(a: string, b: string): boolean {
  const na = normalizeIngredient(a)
  const nb = normalizeIngredient(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

/** Computes a match score for one recipe against a list of inventory item names */
export function matchRecipe(recipe: Recipe, inventoryNames: string[]): RecipeMatch {
  const matched: string[] = []
  const missing: string[] = []

  for (const ingredient of recipe.ingredients) {
    const found = inventoryNames.some((inv) => ingredientsMatch(ingredient, inv))
    if (found) {
      matched.push(ingredient)
    } else {
      missing.push(ingredient)
    }
  }

  const total = recipe.ingredients.length
  const score = total > 0 ? matched.length / total : 0

  return { recipe, matched, missing, score }
}

/** Matches a list of recipes against inventory and sorts by score descending */
export function matchRecipes(recipes: Recipe[], inventoryNames: string[]): RecipeMatch[] {
  return recipes.map((r) => matchRecipe(r, inventoryNames)).sort((a, b) => b.score - a.score)
}

// Session cache for recipe lookups
const sessionCache = new Map<string, unknown>()

export function getCached<T>(key: string): T | null {
  const hit = sessionCache.get(key)
  if (hit !== undefined) return hit as T
  try {
    const raw = sessionStorage.getItem(key)
    if (raw) {
      const val = JSON.parse(raw) as T
      sessionCache.set(key, val)
      return val
    }
  } catch {
    // sessionStorage not available
  }
  return null
}

export function setCache<T>(key: string, value: T): void {
  sessionCache.set(key, value)
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sessionStorage not available or full
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/recipeMatching.test.ts`

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recipeMatching.ts src/lib/__tests__/recipeMatching.test.ts
git commit -m "refactor: adapt recipeMatching to Swedish string[] ingredients"
```

---

### Task 4: Delete ingredientTranslations and Update Test Mocks

**Files:**
- Delete: `src/lib/ingredientTranslations.ts`
- Delete: `src/test/mocks/handlers/mealdb.ts`
- Create: `src/test/mocks/handlers/recipes.ts`
- Modify: `src/test/mocks/server.ts`

- [ ] **Step 1: Delete ingredientTranslations.ts**

```bash
rm src/lib/ingredientTranslations.ts
```

- [ ] **Step 2: Replace mealdb mock handlers with recipe handlers**

Delete `src/test/mocks/handlers/mealdb.ts` and create `src/test/mocks/handlers/recipes.ts`:

```ts
import { http, HttpResponse } from 'msw'

// Supabase REST API base – matchar VITE_SUPABASE_URL i tester
const BASE = 'http://localhost:54321/rest/v1'

export const MOCK_RECIPE_ROW = {
  id: 1,
  url: 'https://www.ica.se/recept/test-1/',
  slug: 'test-1',
  name: 'Testrecept',
  description: 'Ett testrecept',
  ingredients: ['200 g pasta', '1 burk krossade tomater'],
  instructions: ['Koka pastan.', 'Häll på tomatsåsen.'],
  image_urls: ['https://example.com/image.jpg'],
  cook_time: 'PT20M',
  prep_time: 'PT10M',
  total_time: 'PT30M',
  servings: '4',
}

export const recipeHandlers = [
  // GET recipes by id or slug
  http.get(`${BASE}/recipes`, () => {
    return HttpResponse.json(MOCK_RECIPE_ROW)
  }),

  // RPC calls (search_recipes and match_recipes_by_ingredients)
  http.post(`${BASE}/rpc/search_recipes`, () => {
    return HttpResponse.json([MOCK_RECIPE_ROW])
  }),

  http.post(`${BASE}/rpc/match_recipes_by_ingredients`, () => {
    return HttpResponse.json([
      { id: 1, name: 'Testrecept', slug: 'test-1', image_urls: ['https://example.com/image.jpg'], match_count: 2 },
    ])
  }),
]
```

- [ ] **Step 3: Update server.ts**

Replace `src/test/mocks/server.ts`:

```ts
import { setupServer } from 'msw/node'
import { recipeHandlers } from './handlers/recipes'
import { supabaseHandlers } from './handlers/supabase'
import { offHandlers } from './handlers/openFoodFacts'

export const server = setupServer(...recipeHandlers, ...supabaseHandlers, ...offHandlers)
```

- [ ] **Step 4: Delete old mealdb handler**

```bash
rm src/test/mocks/handlers/mealdb.ts
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`

Expected: All PASS. No imports of `ingredientTranslations` or `mealdb` remain.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove MealDB mocks and ingredientTranslations, add recipe handlers"
```

---

### Task 5: Update RecipesPage

**Files:**
- Modify: `src/pages/RecipesPage.tsx`

- [ ] **Step 1: Update imports**

In `src/pages/RecipesPage.tsx`, replace lines 32-35:

```ts
import { suggestRecipes, searchRecipesByName } from '../lib/recipes'
import { matchRecipes, ingredientsMatch } from '../lib/recipeMatching'
import { translateToEnglish } from '../lib/ingredientTranslations'
import type { RecipeMatch } from '../lib/recipeMatching'
```

With:

```ts
import { suggestRecipes, searchRecipes } from '../lib/recipes'
import { matchRecipes, ingredientsMatch } from '../lib/recipeMatching'
import type { RecipeMatch } from '../lib/recipeMatching'
```

- [ ] **Step 2: Update favorites to use number IDs**

Replace the `loadFavorites` and `saveFavorites` functions (lines 39-54) and the favorites state (line 66):

```ts
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
```

Update state declaration:

```ts
const [favorites, setFavorites] = useState<Set<number>>(() => loadFavorites())
```

Update `toggleFavorite` to accept `number`:

```ts
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
```

- [ ] **Step 3: Update handleSearch to use searchRecipes**

Replace `handleSearch` (lines 85-91):

```ts
const handleSearch = async () => {
  if (!searchQuery.trim()) return
  setLoading(true)
  const results = await searchRecipes(searchQuery)
  setMatches(matchRecipes(results, inventoryNames))
  setLoading(false)
}
```

- [ ] **Step 4: Update matchedInventoryItems (remove translateToEnglish)**

Replace lines 111-115:

```ts
const matchedInventoryItems = selected
  ? items.filter((inv) =>
      selected.matched.some((m) => ingredientsMatch(m, inv.name))
    )
  : []
```

- [ ] **Step 5: Update recipe card rendering**

Replace the card map in the filtered list (lines 184-228). Key changes:
- `m.recipe.idMeal` → `m.recipe.id`
- `m.recipe.strMealThumb` → `m.recipe.imageUrls?.[0]`
- `m.recipe.strMeal` → `m.recipe.name`
- `m.recipe.strCategory` badge → remove (no category field on new type)

```tsx
{filtered.map((m) => {
  const isFav = favorites.has(m.recipe.id)
  return (
    <Card
      key={m.recipe.id}
      shadow="xs"
      radius="md"
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={() => setSelected(m)}
    >
      <Group wrap="nowrap">
        {m.recipe.imageUrls?.[0] && (
          <Image src={m.recipe.imageUrls[0]} w={64} h={64} radius="md" />
        )}
        <Stack gap={2} style={{ flex: 1 }}>
          <Text fw={600}>{m.recipe.name}</Text>
          <Group gap={4}>
            <Badge size="xs" color={scoreColor(m.score)} data-testid="score-badge">
              {m.matched.length}/{m.recipe.ingredients.length} ingredienser
            </Badge>
            {m.recipe.totalTime && (
              <Badge size="xs" variant="light">
                {m.recipe.totalTime.replace('PT', '').replace('M', ' min')}
              </Badge>
            )}
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
            toggleFavorite(m.recipe.id)
          }}
          aria-label={isFav ? 'Ta bort favorit' : 'Spara som favorit'}
        >
          {isFav ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
        </ActionIcon>
      </Group>
    </Card>
  )
})}
```

- [ ] **Step 6: Update modal rendering**

Replace the Modal section (lines 232-338). Key changes:
- `selected?.recipe.strMeal` → `selected?.recipe.name`
- `selected.recipe.strMealThumb` → `selected.recipe.imageUrls?.[0]`
- Ingredients list now renders `string` items directly (no `ing.name`/`ing.measure`)
- Instructions rendered as ordered list instead of single text blob

```tsx
<Modal
  opened={!!selected}
  onClose={() => {
    setSelected(null)
    setCooking(false)
    setCookDone(false)
  }}
  title={selected?.recipe.name}
  size="lg"
  scrollAreaComponent={ScrollArea.Autosize}
>
  {selected && (
    <Stack>
      {selected.recipe.imageUrls?.[0] && (
        <Image src={selected.recipe.imageUrls[0]} radius="md" />
      )}

      {selected.recipe.servings && (
        <Text size="sm" c="dimmed">{selected.recipe.servings} portioner</Text>
      )}

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
            {selected.recipe.ingredients.map((ingredient, i) => {
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
          <Divider />
          <Text fw={600}>Instruktioner</Text>
          <List type="ordered" spacing="xs">
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
```

- [ ] **Step 7: Verify build compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 8: Run all tests**

Run: `npx vitest run`

Expected: All PASS.

- [ ] **Step 9: Commit**

```bash
git add src/pages/RecipesPage.tsx
git commit -m "feat: update RecipesPage to use Supabase recipe data"
```

---

### Task 6: Update Environment and Final Verification

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Update .env.local**

Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the new Supabase project values. Same variable names, new values.

- [ ] **Step 2: Verify no remaining MealDB references**

Run: `grep -r "themealdb\|MealDB\|strMeal\|idMeal\|translateToEnglish\|ingredientTranslation" src/`

Expected: No matches.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`

Expected: All PASS.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 5: Start dev server and smoke test**

Run: `npm run dev`

Manual verification:
1. Open the app in browser
2. Navigate to Recept page
3. Search for "pasta" — should return results from Supabase
4. Click a recipe — should show ingredients and instructions
5. Click "Föreslå recept från mitt lager" (if inventory has items) — should return matches
