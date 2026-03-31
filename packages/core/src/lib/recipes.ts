import type { Recipe } from '../types'
import { getSupabaseClient } from './supabaseClient'

type IngredientGroupRow = {
  name: string | null
  items: string[]
}

type RecipeRow = {
  id: number
  url: string
  slug: string | null
  name: string | null
  description: string | null
  ingredient_groups: IngredientGroupRow[]
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
    ingredientGroups: row.ingredient_groups ?? [],
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
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('search_recipes', { query, lim: limit })
  if (error || !data) return []
  return (data as RecipeRow[]).map(mapRecipe)
}

export async function getRecentRecipes(limit = 20): Promise<Recipe[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id, url, slug, name, description, ingredient_groups, instructions, image_urls, cook_time, prep_time, total_time, servings'
    )
    .not('name', 'is', null)
    .not('image_urls', 'eq', '[]')
    .order('id', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return (data as RecipeRow[]).map(mapRecipe)
}

export async function suggestRecipes(ingredientNames: string[], limit = 20): Promise<Recipe[]> {
  if (ingredientNames.length === 0) return []
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('match_recipes_by_ingredients', {
    search_ingredients: ingredientNames,
    lim: limit,
  })
  if (error || !data) return []

  const matches = data as {
    id: number
    match_count: number
  }[]
  if (matches.length === 0) return []

  const ids = matches.map((m) => m.id)
  const { data: recipes, error: recipeError } = await supabase
    .from('recipes')
    .select(
      'id, url, slug, name, description, ingredient_groups, instructions, image_urls, cook_time, prep_time, total_time, servings'
    )
    .in('id', ids)
  if (recipeError || !recipes) return []

  const recipeMap = new Map((recipes as RecipeRow[]).map((r) => [r.id, mapRecipe(r)]))
  return ids.map((id) => recipeMap.get(id)).filter(Boolean) as Recipe[]
}
