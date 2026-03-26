import { describe, it, expect } from 'vitest'
import { searchRecipesByName, getRecipeById, suggestRecipes } from '../recipes'

describe('recipes', () => {
  it('searchRecipesByName returnerar recept', async () => {
    const results = await searchRecipesByName('chicken')
    expect(results).toHaveLength(1)
    expect(results[0].strMeal).toBe('Teriyaki Chicken Casserole')
  })

  it('searchRecipesByName returnerar [] vid inga resultat', async () => {
    const results = await searchRecipesByName('noresult')
    expect(results).toEqual([])
  })

  it('getRecipeById returnerar recept med parsade ingredienser', async () => {
    const recipe = await getRecipeById('52772')
    expect(recipe).not.toBeNull()
    expect(recipe!.ingredients).toHaveLength(3)
    expect(recipe!.ingredients[0]).toEqual({ name: 'soy sauce', measure: '3/4 cup' })
  })

  it('getRecipeById returnerar null för okänt id', async () => {
    const recipe = await getRecipeById('00000')
    expect(recipe).toBeNull()
  })

  it('suggestRecipes returnerar [] vid tomt inlägg', async () => {
    const results = await suggestRecipes([])
    expect(results).toEqual([])
  })

  it('suggestRecipes returnerar recept för kända ingredienser', async () => {
    const results = await suggestRecipes(['chicken', 'soy sauce'])
    expect(results.length).toBeGreaterThan(0)
  })
})
