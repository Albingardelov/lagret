// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockChannel, mockRemoveChannel } = vi.hoisted(() => {
  const mockOn = vi.fn()
  const mockSubscribe = vi.fn()
  mockOn.mockReturnThis()
  mockSubscribe.mockReturnThis()
  const mockChannel = vi.fn(() => ({ on: mockOn, subscribe: mockSubscribe }))
  const mockFrom = vi.fn()
  const mockRemoveChannel = vi.fn()
  return { mockFrom, mockChannel, mockRemoveChannel }
})

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

vi.mock('../householdStore', () => ({
  useHouseholdStore: {
    getState: () => ({ household: { id: 'household-1' } }),
  },
}))

import { useMealPlanStore } from '../mealPlanStore'

describe('mealPlanStore', () => {
  beforeEach(() => {
    useMealPlanStore.setState({ items: [], loading: false })
    vi.clearAllMocks()
  })

  it('should have initial state', () => {
    const state = useMealPlanStore.getState()
    expect(state.items).toEqual([])
    expect(state.loading).toBe(false)
  })

  it('fetchItems should query by date range and household', async () => {
    const mockData = [
      {
        id: '1',
        household_id: 'household-1',
        date: '2026-03-30',
        recipe_id: null,
        title: 'Tacos',
        created_at: '2026-03-30T12:00:00Z',
      },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
            }),
          }),
        }),
      }),
    })

    await useMealPlanStore.getState().fetchItems('2026-03-30', '2026-04-05')

    expect(mockFrom).toHaveBeenCalledWith('meal_plans')
    const state = useMealPlanStore.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0].title).toBe('Tacos')
    expect(state.items[0].householdId).toBe('household-1')
  })

  it('addItem should upsert and add to state', async () => {
    const mockRow = {
      id: '2',
      household_id: 'household-1',
      date: '2026-04-01',
      recipe_id: 42,
      title: 'Pasta Carbonara',
      created_at: '2026-03-30T12:00:00Z',
    }
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
        }),
      }),
    })

    await useMealPlanStore.getState().addItem('2026-04-01', 'Pasta Carbonara', 42)

    const state = useMealPlanStore.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0].recipeId).toBe(42)
  })

  it('removeItem should delete and remove from state', async () => {
    useMealPlanStore.setState({
      items: [
        {
          id: '1',
          householdId: 'household-1',
          date: '2026-03-30',
          recipeId: null,
          title: 'Tacos',
          createdAt: '2026-03-30T12:00:00Z',
        },
      ],
    })

    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    await useMealPlanStore.getState().removeItem('1')

    expect(useMealPlanStore.getState().items).toHaveLength(0)
  })
})
