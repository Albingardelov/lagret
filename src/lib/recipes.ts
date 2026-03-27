import type { MealDBMeal, MealDBResponse, Recipe } from '../types'
import { getCached, setCache } from './recipeMatching'
import { translateToEnglish, translateQueryToEnglish } from './ingredientTranslations'

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1'

function parseMeal(meal: MealDBMeal): Recipe {
  const ingredients: { name: string; measure: string }[] = []
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]
    const measure = meal[`strMeasure${i}`]
    if (name && name.trim()) {
      ingredients.push({ name: name.trim(), measure: measure?.trim() ?? '' })
    }
  }
  return {
    idMeal: meal.idMeal,
    strMeal: meal.strMeal,
    strMealThumb: meal.strMealThumb,
    strCategory: meal.strCategory,
    strArea: meal.strArea,
    strInstructions: meal.strInstructions,
    strYoutube: meal.strYoutube,
    ingredients,
  }
}

export async function searchRecipesByIngredient(ingredient: string): Promise<Recipe[]> {
  const res = await fetch(
    `${BASE_URL}/filter.php?i=${encodeURIComponent(translateToEnglish(ingredient))}`
  )
  const data: MealDBResponse = await res.json()
  if (!data.meals) return []
  // filter.php returns partial data — fetch full details for first 10
  const details = await Promise.all(data.meals.slice(0, 10).map((m) => getRecipeById(m.idMeal)))
  return details.filter(Boolean) as Recipe[]
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const cacheKey = `recipe:${id}`
  const cached = getCached<Recipe>(cacheKey)
  if (cached) return cached
  const res = await fetch(`${BASE_URL}/lookup.php?i=${id}`)
  const data: MealDBResponse = await res.json()
  if (!data.meals?.[0]) return null
  const recipe = parseMeal(data.meals[0])
  setCache(cacheKey, recipe)
  return recipe
}

export async function searchRecipesByName(name: string): Promise<Recipe[]> {
  const res = await fetch(
    `${BASE_URL}/search.php?s=${encodeURIComponent(translateQueryToEnglish(name))}`
  )
  const data: MealDBResponse = await res.json()
  if (!data.meals) return []
  return data.meals.map(parseMeal)
}

/** Returns recipes that match the most inventory ingredients */
export async function suggestRecipes(ingredientNames: string[]): Promise<Recipe[]> {
  if (ingredientNames.length === 0) return []

  const recipeMap = new Map<string, { recipe: Recipe; matchCount: number }>()

  // Translate all names to English and deduplicate before searching,
  // so e.g. "mjölk" and "lättmjölk" (both → "milk") only generate one API call.
  const uniqueEnglish = [...new Set(ingredientNames.map(translateToEnglish))]

  await Promise.all(
    uniqueEnglish.map(async (ingredient) => {
      const recipes = await searchRecipesByIngredient(ingredient)
      for (const recipe of recipes) {
        const existing = recipeMap.get(recipe.idMeal)
        if (existing) {
          existing.matchCount++
        } else {
          recipeMap.set(recipe.idMeal, { recipe, matchCount: 1 })
        }
      }
    })
  )

  return Array.from(recipeMap.values())
    .sort((a, b) => b.matchCount - a.matchCount)
    .map((e) => e.recipe)
}
