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
