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
    .replace(/ies$/, 'y') // berries → berry
    .replace(/ves$/, 'f') // halves → half
    .replace(/oes$/, 'o') // tomatoes → tomato
    .replace(/s$/, '') // eggs → egg
}

/** Returns true if two ingredient names are considered the same */
function ingredientsMatch(a: string, b: string): boolean {
  const na = normalizeIngredient(a)
  const nb = normalizeIngredient(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

/** Computes a match score for one recipe against a list of inventory item names */
export function matchRecipe(recipe: Recipe, inventoryNames: string[]): RecipeMatch {
  const matched: string[] = []
  const missing: string[] = []

  for (const ing of recipe.ingredients) {
    const found = inventoryNames.some((inv) => ingredientsMatch(ing.name, inv))
    if (found) {
      matched.push(ing.name)
    } else {
      missing.push(ing.name)
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

// Sessionscache för TheMealDB-anrop
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
