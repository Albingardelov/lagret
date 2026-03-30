import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { MealPlanPage } from '../MealPlanPage'
import type { MealPlan } from '../../types'

const MEAL_1: MealPlan = {
  id: 'mp-1',
  householdId: 'hh-1',
  date: new Date().toISOString().split('T')[0], // today
  recipeId: 42,
  title: 'Pasta Carbonara',
  createdAt: '2026-03-26T00:00:00Z',
}

const mockFetchItems = vi.fn()
const mockRemoveItem = vi.fn()
const mockSubscribeRealtime = vi.fn(() => vi.fn())

vi.mock('../../store/mealPlanStore', () => ({
  useMealPlanStore: () => ({
    items: [MEAL_1],
    loading: false,
    fetchItems: mockFetchItems,
    removeItem: mockRemoveItem,
    subscribeRealtime: mockSubscribeRealtime,
  }),
}))

vi.mock('../../store/inventoryStore', () => ({
  useInventoryStore: (selector: (s: unknown) => unknown) => selector({ items: [] }),
}))

vi.mock('../../lib/recipes', () => ({
  getRecipeById: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('../../lib/recipeMatching', () => ({
  matchRecipe: vi.fn(() => ({ matched: [], missing: [], score: 0 })),
  getAllIngredients: vi.fn(() => []),
  getCached: vi.fn(() => null),
  setCache: vi.fn(),
}))

vi.mock('../../components/AddMealModal', () => ({
  AddMealModal: () => null,
}))

vi.mock('../../components/IngredientReviewModal', () => ({
  IngredientReviewModal: () => null,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MealPlanPage', () => {
  it('visar veckonummer', () => {
    render(<MealPlanPage />)
    expect(screen.getByText(/Vecka \d+/)).toBeInTheDocument()
  })

  it('visar planerad måltids titel', () => {
    render(<MealPlanPage />)
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
  })

  it('visar "Generera inköpslista" knappen', () => {
    render(<MealPlanPage />)
    expect(
      screen.getByRole('button', { name: /Generera inköpslista för veckan/i })
    ).toBeInTheDocument()
  })

  it('anropar fetchItems och subscribeRealtime vid mount', () => {
    render(<MealPlanPage />)
    expect(mockFetchItems).toHaveBeenCalled()
    expect(mockSubscribeRealtime).toHaveBeenCalled()
  })

  it('visar "Ingen måltid planerad" för tomma dagar', () => {
    render(<MealPlanPage />)
    // There are 7 days, 1 has a meal, so at least 6 should show this text
    const emptyLabels = screen.getAllByText('Ingen måltid planerad')
    expect(emptyLabels.length).toBeGreaterThanOrEqual(6)
  })
})
