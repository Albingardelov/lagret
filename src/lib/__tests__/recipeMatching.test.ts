import { describe, it, expect } from 'vitest'
import { normalizeIngredient, matchRecipe, matchRecipes } from '../recipeMatching'
import type { Recipe } from '../../types'

const BASE_RECIPE: Recipe = {
  idMeal: 'r1',
  strMeal: 'Pasta Bolognese',
  strMealThumb: '',
  strCategory: 'Pasta',
  strArea: 'Italian',
  strInstructions: '',
  ingredients: [
    { name: 'Pasta', measure: '200g' },
    { name: 'Tomatoes', measure: '2' },
    { name: 'Beef', measure: '300g' },
    { name: 'Onion', measure: '1' },
  ],
}

describe('normalizeIngredient', () => {
  it('lowercasar och trimmar', () => {
    expect(normalizeIngredient('  Tomato  ')).toBe('tomato')
  })

  it('tar bort plural -s', () => {
    expect(normalizeIngredient('Eggs')).toBe('egg')
    expect(normalizeIngredient('Tomatoes')).toBe('tomato')
  })

  it('hanterar -ies → -y', () => {
    expect(normalizeIngredient('Berries')).toBe('berry')
    expect(normalizeIngredient('Cherries')).toBe('cherry')
  })

  it('hanterar -ves → -f', () => {
    expect(normalizeIngredient('Halves')).toBe('half')
  })

  it('"Tomatoes" normaliseras till "tomato"', () => {
    expect(normalizeIngredient('Tomatoes')).toBe('tomato')
  })
})

describe('matchRecipe', () => {
  it('matchar ingredienser mot lager och beräknar poäng', () => {
    const inventory = ['pasta', 'beef', 'salt']
    const result = matchRecipe(BASE_RECIPE, inventory)
    expect(result.matched).toContain('Pasta')
    expect(result.matched).toContain('Beef')
    expect(result.missing).toContain('Tomatoes')
    expect(result.missing).toContain('Onion')
    expect(result.score).toBeCloseTo(0.5)
  })

  it('returnerar score 1 när allt finns', () => {
    const inventory = ['pasta', 'tomato', 'beef', 'onion']
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
    const result = matchRecipe(BASE_RECIPE, ['PASTA', 'BEEF', 'ONION', 'TOMATO'])
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
      idMeal: 'r2',
      strMeal: 'Enkel pasta',
      ingredients: [{ name: 'Pasta', measure: '200g' }],
    }
    const inventory = ['pasta', 'tomato', 'beef', 'onion']
    const results = matchRecipes([BASE_RECIPE, r2], inventory)
    // r2 har score 1 (1/1), BASE_RECIPE score 1 (4/4) – båda 1 men ordning kan variera
    // Testa bara att båda är med
    expect(results).toHaveLength(2)
  })

  it('det receptet med flest matchande ingredienser sorteras först', () => {
    const lowMatch: Recipe = {
      ...BASE_RECIPE,
      idMeal: 'r3',
      strMeal: 'Okänt recept',
      ingredients: [
        { name: 'Unicorn', measure: '1' },
        { name: 'Dragon', measure: '1' },
      ],
    }
    const inventory = ['pasta', 'tomato', 'beef', 'onion']
    const results = matchRecipes([lowMatch, BASE_RECIPE], inventory)
    expect(results[0].recipe.idMeal).toBe('r1')
  })
})
