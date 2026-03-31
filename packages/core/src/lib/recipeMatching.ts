import type { Recipe } from '../types'

export interface RecipeMatch {
  recipe: Recipe
  matched: string[]
  missing: string[]
  score: number // 0–1
}

export function getAllIngredients(recipe: Recipe): string[] {
  return recipe.ingredientGroups.flatMap((g) => g.items)
}

export function normalizeIngredient(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function ingredientsMatch(a: string, b: string): boolean {
  const na = normalizeIngredient(a)
  const nb = normalizeIngredient(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

export function matchRecipe(recipe: Recipe, inventoryNames: string[]): RecipeMatch {
  const matched: string[] = []
  const missing: string[] = []
  const allIngredients = getAllIngredients(recipe)

  for (const ingredient of allIngredients) {
    const found = inventoryNames.some((inv) => ingredientsMatch(ingredient, inv))
    if (found) matched.push(ingredient)
    else missing.push(ingredient)
  }

  const total = allIngredients.length
  const score = total > 0 ? matched.length / total : 0
  return { recipe, matched, missing, score }
}

export function matchRecipes(recipes: Recipe[], inventoryNames: string[]): RecipeMatch[] {
  return recipes.map((r) => matchRecipe(r, inventoryNames)).sort((a, b) => b.score - a.score)
}
