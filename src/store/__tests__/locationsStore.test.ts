import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLocationsStore } from '../locationsStore'

const mockFrom = vi.hoisted(() => vi.fn())
const mockSelect = vi.hoisted(() => vi.fn())
const mockInsert = vi.hoisted(() => vi.fn())
const mockUpdate = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())
const mockEq = vi.hoisted(() => vi.fn())
const mockOrder = vi.hoisted(() => vi.fn())
const mockSingle = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('../householdStore', () => ({
  useHouseholdStore: {
    getState: () => ({ household: { id: 'hh-1' } }),
  },
}))

const defaultFromImpl = () => ({
  select: mockSelect.mockReturnThis(),
  insert: mockInsert.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  delete: mockDelete.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  order: mockOrder,
  single: mockSingle,
})

const mockRow = {
  id: 'loc-1',
  household_id: 'hh-1',
  name: 'Kylskåp',
  icon: 'fridge',
  sort_order: 1,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.resetAllMocks()
  mockFrom.mockImplementation(defaultFromImpl)
  useLocationsStore.setState({ locations: [], loading: false, error: null })
})

describe('fetchLocations', () => {
  it('loads and maps locations from supabase', async () => {
    mockOrder.mockResolvedValue({ data: [mockRow], error: null })
    await useLocationsStore.getState().fetchLocations()
    const { locations } = useLocationsStore.getState()
    expect(locations).toHaveLength(1)
    expect(locations[0]).toEqual({
      id: 'loc-1',
      householdId: 'hh-1',
      name: 'Kylskåp',
      icon: 'fridge',
      sortOrder: 1,
      createdAt: '2026-01-01T00:00:00Z',
    })
  })

  it('sets error on failure', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await useLocationsStore.getState().fetchLocations()
    expect(useLocationsStore.getState().error).toBe('DB error')
  })
})

describe('addLocation', () => {
  it('inserts and appends new location', async () => {
    mockSingle.mockResolvedValue({
      data: { ...mockRow, id: 'loc-2', name: 'Utefrys', icon: 'freezer', sort_order: 2 },
      error: null,
    })
    await useLocationsStore.getState().addLocation('Utefrys', 'freezer')
    expect(useLocationsStore.getState().locations).toHaveLength(1)
    expect(useLocationsStore.getState().locations[0].name).toBe('Utefrys')
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
    await expect(useLocationsStore.getState().addLocation('X', 'pantry')).rejects.toThrow(
      'Insert failed'
    )
  })
})

describe('updateLocation', () => {
  it('updates name and icon in state', async () => {
    useLocationsStore.setState({
      locations: [
        {
          id: 'loc-1',
          householdId: 'hh-1',
          name: 'Kylskåp',
          icon: 'fridge' as const,
          sortOrder: 1,
          createdAt: '',
        },
      ],
    })
    mockSingle.mockResolvedValue({ data: { ...mockRow, name: 'Hallkylskåp' }, error: null })
    await useLocationsStore.getState().updateLocation('loc-1', 'Hallkylskåp', 'fridge')
    expect(useLocationsStore.getState().locations[0].name).toBe('Hallkylskåp')
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } })
    await expect(
      useLocationsStore.getState().updateLocation('loc-1', 'X', 'pantry')
    ).rejects.toThrow('Update failed')
  })
})

describe('deleteLocation', () => {
  it('removes location from state on success', async () => {
    useLocationsStore.setState({
      locations: [
        {
          id: 'loc-1',
          householdId: 'hh-1',
          name: 'Frys',
          icon: 'freezer' as const,
          sortOrder: 2,
          createdAt: '',
        },
      ],
    })
    // First call: count check returns 0 items
    mockEq.mockResolvedValueOnce({ count: 0, error: null })
    // Second call: delete
    mockEq.mockResolvedValueOnce({ error: null })
    await useLocationsStore.getState().deleteLocation('loc-1')
    expect(useLocationsStore.getState().locations).toHaveLength(0)
  })

  it('throws if location has items', async () => {
    mockEq.mockResolvedValueOnce({ count: 3, error: null })
    await expect(useLocationsStore.getState().deleteLocation('loc-1')).rejects.toThrow(
      'Platsen har varor – töm den först'
    )
  })
})
