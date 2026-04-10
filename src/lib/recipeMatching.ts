import type { Recipe } from '../types'

export interface RecipeMatch {
  recipe: Recipe
  matched: string[]
  missing: string[]
  score: number // 0–1
}

/** Flattens all ingredient groups into a single string array */
export function getAllIngredients(recipe: Recipe): string[] {
  return recipe.ingredientGroups.flatMap((g) => g.items)
}

/** Normalizes an ingredient name for fuzzy comparison */
export function normalizeIngredient(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Swedish + common units at the start of a recipe ingredient string, e.g. "500 g", "2 dl", "1 msk"
const QUANTITY_UNIT_RE =
  /^[\d.,/½¼¾]+\s*(?:g|kg|hg|mg|dl|l|ml|cl|liter|gram|kilo|msk|tsk|krm|st|st\.|port|förp|burk|paket|pkt|ask|klyfta|klyft|knippe|näve|skiva|skivor|cm|mm|cup|tbsp|tsp|oz|lb)\.?\s+/i

// Common Swedish stopwords that shouldn't count as ingredient words
const STOPWORDS = new Set([
  'och',
  'med',
  'för',
  'som',
  'vid',
  'mot',
  'per',
  'den',
  'det',
  'ett',
  'ska',
  'kan',
  'har',
  'gul',
  'röd',
  'grön',
  'stor',
  'liten',
  'färsk',
])

/** Strips leading quantity+unit from a recipe ingredient, e.g. "500 g fläskfärs" → "fläskfärs" */
function stripQuantityUnit(s: string): string {
  return s
    .replace(QUANTITY_UNIT_RE, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim()
}

/** Returns true if two ingredient names are considered the same */
export function ingredientsMatch(a: string, b: string): boolean {
  const na = normalizeIngredient(a)
  const nb = normalizeIngredient(b)

  // Compare with quantity/unit stripped (e.g. "500 g fläskfärs" → "fläskfärs")
  const ca = stripQuantityUnit(na)
  const cb = stripQuantityUnit(nb)

  if (ca === cb || ca.includes(cb) || cb.includes(ca)) return true
  if (na === nb || na.includes(nb) || nb.includes(na)) return true

  // Word-level overlap: words ≥3 chars, non-numeric, not stopwords
  const significantWords = (s: string) =>
    s.split(/\s+/).filter((w) => w.length >= 3 && !/^\d/.test(w) && !STOPWORDS.has(w))

  const wa = significantWords(ca)
  const wb = significantWords(cb)

  return wa.some((w) => cb.includes(w)) || wb.some((w) => ca.includes(w))
}

/** Computes a match score for one recipe against a list of inventory item names */
export function matchRecipe(recipe: Recipe, inventoryNames: string[]): RecipeMatch {
  const matched: string[] = []
  const missing: string[] = []
  const allIngredients = getAllIngredients(recipe)

  for (const ingredient of allIngredients) {
    const found = inventoryNames.some((inv) => ingredientsMatch(ingredient, inv))
    if (found) {
      matched.push(ingredient)
    } else {
      missing.push(ingredient)
    }
  }

  const total = allIngredients.length
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
