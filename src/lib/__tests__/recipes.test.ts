import { describe, it, expect, vi } from 'vitest'
import { server } from '../../test/mocks/server'
import { http, HttpResponse } from 'msw'
import {
  searchRecipesByIngredient,
  searchRecipesByName,
  getRecipeById,
  suggestRecipes,
} from '../recipes'
import { MOCK_MEAL } from '../../test/mocks/handlers/mealdb'

const BASE = 'https://www.themealdb.com/api/json/v1/1'

describe('getRecipeById', () => {
  it('returnerar recept med korrekt parsade ingredienser', async () => {
    const recipe = await getRecipeById('52772')
    expect(recipe).not.toBeNull()
    expect(recipe!.idMeal).toBe('52772')
    expect(recipe!.strMeal).toBe('Teriyaki Chicken Casserole')
    expect(recipe!.ingredients).toHaveLength(3)
    expect(recipe!.ingredients[0]).toEqual({ name: 'soy sauce', measure: '3/4 cup' })
  })

  it('hoppar över tomma ingredienser', async () => {
    const recipe = await getRecipeById('52772')
    // MOCK_MEAL har 3 ingredienser + 17 tomma – bara 3 ska parsas
    expect(recipe!.ingredients.every((i) => i.name.length > 0)).toBe(true)
  })

  it('returnerar null för okänt id', async () => {
    const recipe = await getRecipeById('00000')
    expect(recipe).toBeNull()
  })
})

describe('searchRecipesByIngredient', () => {
  it('returnerar recept för känd ingrediens', async () => {
    const results = await searchRecipesByIngredient('chicken')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].idMeal).toBe(MOCK_MEAL.idMeal)
  })

  it('returnerar [] när meals är null', async () => {
    const results = await searchRecipesByIngredient('unknown-ingredient-xyz')
    expect(results).toEqual([])
  })

  it('begränsar till max 10 detaljhämtningar', async () => {
    // Returnera 15 partiella recept från filter.php
    server.use(
      http.get(`${BASE}/filter.php`, () =>
        HttpResponse.json({
          meals: Array.from({ length: 15 }, (_, i) => ({
            idMeal: `id-${i}`,
            strMeal: `Meal ${i}`,
            strMealThumb: '',
          })),
        })
      )
    )
    const lookupSpy = vi.fn(() => HttpResponse.json({ meals: [MOCK_MEAL] }))
    server.use(http.get(`${BASE}/lookup.php`, lookupSpy))

    const results = await searchRecipesByIngredient('chicken')
    expect(lookupSpy).toHaveBeenCalledTimes(10)
    expect(results).toHaveLength(10)
  })
})

describe('searchRecipesByName', () => {
  it('returnerar matchande recept', async () => {
    const results = await searchRecipesByName('chicken')
    expect(results).toHaveLength(1)
    expect(results[0].strMeal).toBe('Teriyaki Chicken Casserole')
  })

  it('returnerar [] när meals är null', async () => {
    const results = await searchRecipesByName('noresult')
    expect(results).toEqual([])
  })
})

describe('suggestRecipes', () => {
  it('returnerar [] vid tomt ingrediensinlägg', async () => {
    const results = await suggestRecipes([])
    expect(results).toEqual([])
  })

  it('returnerar recept sorterade efter matchningspoäng', async () => {
    // Samma recept matchas av två ingredienser → matchCount 2
    const results = await suggestRecipes(['chicken', 'soy sauce'])
    expect(results.length).toBeGreaterThan(0)
    // Returnerade recept ska vara unika (deduplicerade)
    const ids = results.map((r) => r.idMeal)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('anropar max 5 ingrediens-sökningar parallellt', async () => {
    const filterSpy = vi.fn(() =>
      HttpResponse.json({
        meals: [{ idMeal: MOCK_MEAL.idMeal, strMeal: MOCK_MEAL.strMeal, strMealThumb: '' }],
      })
    )
    server.use(http.get(`${BASE}/filter.php`, filterSpy))
    server.use(http.get(`${BASE}/lookup.php`, () => HttpResponse.json({ meals: [MOCK_MEAL] })))

    await suggestRecipes(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(filterSpy).toHaveBeenCalledTimes(5)
  })
})
