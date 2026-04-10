import { supabase } from './supabase'
import type { Recipe } from '../types'

interface IngredientGroupRow {
  name: string | null
  items: string[]
}

interface RecipeRow {
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
  const { data, error } = await supabase.rpc('search_recipes', { query, lim: limit })
  if (error || !data) return []
  return (data as RecipeRow[]).map(mapRecipe)
}

export async function getRecipeById(id: number): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id, url, slug, name, description, ingredient_groups, instructions, image_urls, cook_time, prep_time, total_time, servings'
    )
    .eq('id', id)
    .single()
  if (error || !data) return null
  return mapRecipe(data as RecipeRow)
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id, url, slug, name, description, ingredient_groups, instructions, image_urls, cook_time, prep_time, total_time, servings'
    )
    .eq('slug', slug)
    .single()
  if (error || !data) return null
  return mapRecipe(data as RecipeRow)
}

export async function getRecentRecipes(limit = 50, offset = 0): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id, url, slug, name, description, ingredient_groups, instructions, image_urls, cook_time, prep_time, total_time, servings'
    )
    .not('name', 'is', null)
    .not('image_urls', 'eq', '[]')
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error || !data) return []
  return (data as RecipeRow[]).map(mapRecipe)
}

export async function suggestRecipes(ingredientNames: string[], limit = 20): Promise<Recipe[]> {
  if (ingredientNames.length === 0) return []
  const { data, error } = await supabase.rpc('match_recipes_by_ingredients', {
    search_ingredients: ingredientNames,
    lim: limit,
  })
  if (error || !data) return []
  return (data as RecipeRow[]).map(mapRecipe)
}
