import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { AddMealModal } from '../AddMealModal'

const mockAddItem = vi.fn()

vi.mock('../../store/mealPlanStore', () => ({
  useMealPlanStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ addItem: mockAddItem, items: [] }),
}))

vi.mock('../../store/inventoryStore', () => ({
  useInventoryStore: (selector: (s: Record<string, unknown>) => unknown) => selector({ items: [] }),
}))

vi.mock('../../lib/recipes', () => ({
  suggestRecipes: vi.fn().mockResolvedValue([]),
  searchRecipes: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../lib/recipeMatching', () => ({
  matchRecipe: vi.fn().mockReturnValue({ matched: [], missing: [], score: 0 }),
  getAllIngredients: vi.fn().mockReturnValue([]),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockAddItem.mockResolvedValue(undefined)
})

describe('AddMealModal', () => {
  it('visar formaterat datum i titeln', () => {
    render(<AddMealModal opened={true} onClose={vi.fn()} date="2026-04-01" />)
    // dayjs with sv locale: "onsdag 1 april"
    expect(screen.getByText('onsdag 1 april')).toBeInTheDocument()
  })

  it('visar sökfältet med rätt placeholder', () => {
    render(<AddMealModal opened={true} onClose={vi.fn()} date="2026-04-01" />)
    expect(screen.getByPlaceholderText('Sök recept eller skriv fritext...')).toBeInTheDocument()
  })

  it('visar flikarna Förslag, Favoriter och Senaste', () => {
    render(<AddMealModal opened={true} onClose={vi.fn()} date="2026-04-01" />)
    expect(screen.getByRole('tab', { name: 'Förslag' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Favoriter' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Senaste' })).toBeInTheDocument()
  })

  it('renderar ingenting synligt när opened=false', () => {
    render(<AddMealModal opened={false} onClose={vi.fn()} date="2026-04-01" />)
    expect(
      screen.queryByPlaceholderText('Sök recept eller skriv fritext...')
    ).not.toBeInTheDocument()
  })
})
