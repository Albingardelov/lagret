import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { TodayMealWidget } from '../TodayMealWidget'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockFetchItems = vi.fn().mockResolvedValue(undefined)

vi.mock('../../store/mealPlanStore', () => ({
  useMealPlanStore: vi.fn(),
}))

vi.mock('../../store/inventoryStore', () => ({
  useInventoryStore: vi.fn(() => ({ items: [] })),
}))

vi.mock('../../lib/recipes', () => ({
  getRecipeById: vi.fn().mockResolvedValue(null),
}))

import { useMealPlanStore } from '../../store/mealPlanStore'
import dayjs from 'dayjs'

const mockedUseMealPlanStore = vi.mocked(useMealPlanStore)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TodayMealWidget', () => {
  it('visar "Dagens middag" etikett', () => {
    mockedUseMealPlanStore.mockReturnValue({
      items: [],
      loading: false,
      fetchItems: mockFetchItems,
    } as unknown as ReturnType<typeof useMealPlanStore>)

    render(<TodayMealWidget />)
    expect(screen.getByText('Dagens middag')).toBeInTheDocument()
  })

  it('visar dagens måltidstitel när det finns en planerad måltid', () => {
    const today = dayjs().format('YYYY-MM-DD')
    mockedUseMealPlanStore.mockReturnValue({
      items: [
        {
          id: '1',
          householdId: 'h1',
          date: today,
          recipeId: null,
          title: 'Köttbullar med potatismos',
          createdAt: '2026-03-30T00:00:00Z',
        },
      ],
      loading: false,
      fetchItems: mockFetchItems,
    } as unknown as ReturnType<typeof useMealPlanStore>)

    render(<TodayMealWidget />)
    expect(screen.getByText('Köttbullar med potatismos')).toBeInTheDocument()
  })

  it('visar "Ingen måltid planerad" när ingen måltid finns', () => {
    mockedUseMealPlanStore.mockReturnValue({
      items: [],
      loading: false,
      fetchItems: mockFetchItems,
    } as unknown as ReturnType<typeof useMealPlanStore>)

    render(<TodayMealWidget />)
    expect(screen.getByText('Ingen måltid planerad')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Planera/i })).toBeInTheDocument()
  })
})
