import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { IngredientReviewModal } from '../IngredientReviewModal'
import type { MealPlan, Recipe } from '../../types'

const mockAddItem = vi.fn()

vi.mock('../../store/shoppingStore', () => ({
  useShoppingStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ items: [], addItem: mockAddItem }),
}))

vi.mock('../../store/inventoryStore', () => ({
  useInventoryStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ items: [{ name: 'Mjölk' }] }),
}))

vi.mock('../../lib/parseShoppingInput', () => ({
  parseShoppingInput: (input: string) => ({ name: input, quantity: 1, unit: 'st' }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockAddItem.mockResolvedValue(undefined)
})

const testRecipe: Recipe = {
  id: 1,
  url: 'https://example.com',
  slug: 'pasta',
  name: 'Pasta Carbonara',
  description: null,
  ingredientGroups: [{ name: null, items: ['Pasta', 'Ägg', 'Mjölk'] }],
  instructions: ['Koka pasta'],
  imageUrls: [],
  cookTime: null,
  prepTime: null,
  totalTime: null,
  servings: null,
}

const testMealPlan: MealPlan = {
  id: 'mp-1',
  householdId: 'h-1',
  date: '2026-03-30',
  recipeId: 1,
  title: 'Pasta Carbonara',
  createdAt: '2026-03-30T00:00:00Z',
}

describe('IngredientReviewModal', () => {
  it('visar receptnamn som grupprubrik', () => {
    render(
      <IngredientReviewModal
        opened={true}
        onClose={vi.fn()}
        mealPlans={[testMealPlan]}
        recipes={{ '1': testRecipe }}
      />
    )
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
  })

  it('visar alla ingredienser från receptet', () => {
    render(
      <IngredientReviewModal
        opened={true}
        onClose={vi.fn()}
        mealPlans={[testMealPlan]}
        recipes={{ '1': testRecipe }}
      />
    )
    expect(screen.getByText('Pasta')).toBeInTheDocument()
    expect(screen.getByText('Ägg')).toBeInTheDocument()
    expect(screen.getByText('Mjölk')).toBeInTheDocument()
  })

  it('visar "Lägg till i inköpslistan" knappen', () => {
    render(
      <IngredientReviewModal
        opened={true}
        onClose={vi.fn()}
        mealPlans={[testMealPlan]}
        recipes={{ '1': testRecipe }}
      />
    )
    expect(screen.getByRole('button', { name: /Lägg till i inköpslistan/ })).toBeInTheDocument()
  })

  it('visar antal valda ingredienser i knappen', () => {
    render(
      <IngredientReviewModal
        opened={true}
        onClose={vi.fn()}
        mealPlans={[testMealPlan]}
        recipes={{ '1': testRecipe }}
      />
    )
    // Pasta and Ägg are missing (not in inventory), Mjölk is in inventory
    expect(
      screen.getByRole('button', { name: /Lägg till i inköpslistan \(2\)/ })
    ).toBeInTheDocument()
  })

  it('visar tom-text när inga recept-kopplade måltider finns', () => {
    render(<IngredientReviewModal opened={true} onClose={vi.fn()} mealPlans={[]} recipes={{}} />)
    expect(screen.getByText('Inga recept-kopplade måltider den här veckan.')).toBeInTheDocument()
  })

  it('anropar addItem för valda ingredienser vid klick', async () => {
    const { user } = render(
      <IngredientReviewModal
        opened={true}
        onClose={vi.fn()}
        mealPlans={[testMealPlan]}
        recipes={{ '1': testRecipe }}
      />
    )

    await user.click(screen.getByRole('button', { name: /Lägg till i inköpslistan/ }))

    // Should add Pasta and Ägg (missing), skip Mjölk (in inventory, unchecked)
    expect(mockAddItem).toHaveBeenCalledTimes(2)
    expect(mockAddItem).toHaveBeenCalledWith('Pasta', 1, 'st', 'Pasta Carbonara')
    expect(mockAddItem).toHaveBeenCalledWith('Ägg', 1, 'st', 'Pasta Carbonara')
  })

  it('visar "Tillagd i inköpslistan!" efter tillägg', async () => {
    const { user } = render(
      <IngredientReviewModal
        opened={true}
        onClose={vi.fn()}
        mealPlans={[testMealPlan]}
        recipes={{ '1': testRecipe }}
      />
    )

    await user.click(screen.getByRole('button', { name: /Lägg till i inköpslistan/ }))

    expect(screen.getByRole('button', { name: /Tillagd i inköpslistan!/ })).toBeInTheDocument()
  })
})
