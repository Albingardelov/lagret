// src/store/__tests__/householdStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// Mock dependent stores — fetchLocations, fetchItems are called on household switch
vi.mock('../locationsStore', () => ({
  useLocationsStore: {
    getState: vi.fn(() => ({ fetchLocations: vi.fn() })),
  },
}))
vi.mock('../inventoryStore', () => ({
  useInventoryStore: {
    getState: vi.fn(() => ({ fetchItems: vi.fn() })),
  },
}))
vi.mock('../shoppingStore', () => ({
  useShoppingStore: {
    getState: vi.fn(() => ({ fetchItems: vi.fn() })),
  },
}))

import { supabase } from '../../lib/supabase'
import { useHouseholdStore } from '../householdStore'

const mockHouseholds = [
  { id: 'hh-1', name: 'Hemma', invite_code: 'abc12345', created_at: '2026-01-01' },
  { id: 'hh-2', name: 'Stugan', invite_code: 'xyz67890', created_at: '2026-02-01' },
]

function makeChain(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.limit.mockReturnValue(chain)
  chain.maybeSingle.mockResolvedValue({ data, error })
  chain.insert.mockReturnValue(chain)
  chain.single.mockResolvedValue({ data, error })
  return chain
}

beforeEach(() => {
  // Reset store state between tests
  useHouseholdStore.setState({
    households: [],
    household: null,
    activeHouseholdId: null,
    members: [],
    loading: false,
    error: null,
  })
  localStorage.clear()
  vi.clearAllMocks()
})

describe('fetchHouseholds', () => {
  it('sätter households från Supabase', async () => {
    vi.mocked(supabase.from).mockReturnValue(makeChain(null) as ReturnType<typeof supabase.from>)
    // Override maybeSingle with array response
    const chain = makeChain(null)
    chain.select.mockReturnValue({ data: mockHouseholds, error: null } as unknown as ReturnType<
      typeof chain.select
    >)
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>)

    await useHouseholdStore.getState().fetchHouseholds()

    const { households } = useHouseholdStore.getState()
    expect(households).toHaveLength(2)
    expect(households[0].id).toBe('hh-1')
    expect(households[0].name).toBe('Hemma')
    expect(households[0].inviteCode).toBe('abc12345')
  })

  it('sätter household till första om inget sparats i localStorage', async () => {
    const chain = { select: vi.fn().mockResolvedValue({ data: mockHouseholds, error: null }) }
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>)

    // Mock rpc för fetchMembers
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as Awaited<
      ReturnType<typeof supabase.rpc>
    >)

    await useHouseholdStore.getState().fetchHouseholds()

    expect(useHouseholdStore.getState().household?.id).toBe('hh-1')
  })

  it('återställer sparat aktivt hushåll från localStorage', async () => {
    localStorage.setItem('lagret:activeHousehold', 'hh-2')
    const chain = { select: vi.fn().mockResolvedValue({ data: mockHouseholds, error: null }) }
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>)
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as Awaited<
      ReturnType<typeof supabase.rpc>
    >)

    await useHouseholdStore.getState().fetchHouseholds()

    expect(useHouseholdStore.getState().household?.id).toBe('hh-2')
    expect(useHouseholdStore.getState().activeHouseholdId).toBe('hh-2')
  })
})

describe('setActiveHousehold', () => {
  it('uppdaterar household och sparar i localStorage', async () => {
    useHouseholdStore.setState({
      households: [
        { id: 'hh-1', name: 'Hemma', inviteCode: 'abc12345', createdAt: '2026-01-01' },
        { id: 'hh-2', name: 'Stugan', inviteCode: 'xyz67890', createdAt: '2026-02-01' },
      ],
    })
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as Awaited<
      ReturnType<typeof supabase.rpc>
    >)

    await useHouseholdStore.getState().setActiveHousehold('hh-2')

    expect(useHouseholdStore.getState().household?.id).toBe('hh-2')
    expect(useHouseholdStore.getState().activeHouseholdId).toBe('hh-2')
    expect(localStorage.getItem('lagret:activeHousehold')).toBe('hh-2')
  })
})

describe('fetchMembers', () => {
  it('sätter members från RPC', async () => {
    const mockMembers = [
      { user_id: 'u-1', email: 'anna@example.com' },
      { user_id: 'u-2', email: 'bjorn@example.com' },
    ]
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockMembers, error: null } as Awaited<
      ReturnType<typeof supabase.rpc>
    >)

    await useHouseholdStore.getState().fetchMembers('hh-1')

    const { members } = useHouseholdStore.getState()
    expect(members).toHaveLength(2)
    expect(members[0].email).toBe('anna@example.com')
    expect(members[0].userId).toBe('u-1')
  })

  it('sätter members till [] om RPC misslyckas', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'fel' } } as Awaited<
      ReturnType<typeof supabase.rpc>
    >)

    await useHouseholdStore.getState().fetchMembers('hh-1')

    expect(useHouseholdStore.getState().members).toEqual([])
  })
})
