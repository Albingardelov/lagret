import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useHouseholdStore } from '../householdStore'
import type { Household } from '../../types'

const { mockMaybeSingle, mockSingle, mockEq, mockInsert, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn()
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockInsert = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()
  return { mockMaybeSingle, mockSingle, mockEq, mockInsert, mockSelect, mockFrom }
})

vi.mock('../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

function defaultFromImpl() {
  return {
    select: mockSelect.mockReturnThis(),
    insert: mockInsert.mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
  }
}

const MOCK_HH_ROW = {
  id: 'hh-1',
  name: 'Testfamiljen',
  invite_code: 'abc12345',
  created_at: '2026-03-26T00:00:00Z',
}

const MOCK_HH: Household = {
  id: 'hh-1',
  name: 'Testfamiljen',
  inviteCode: 'abc12345',
  createdAt: '2026-03-26T00:00:00Z',
}

beforeEach(() => {
  vi.resetAllMocks()
  mockFrom.mockImplementation(defaultFromImpl)
  useHouseholdStore.setState({ household: null, loading: false, error: null })
})

describe('fetchHousehold', () => {
  it('hämtar och mappar hushållet', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: MOCK_HH_ROW, error: null })
    await useHouseholdStore.getState().fetchHousehold()
    expect(useHouseholdStore.getState().household).toEqual(MOCK_HH)
    expect(useHouseholdStore.getState().loading).toBe(false)
  })

  it('sätter null om inget hushåll finns', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    await useHouseholdStore.getState().fetchHousehold()
    expect(useHouseholdStore.getState().household).toBeNull()
  })

  it('sätter error vid Supabase-fel', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB-fel' } })
    await useHouseholdStore.getState().fetchHousehold()
    expect(useHouseholdStore.getState().error).toBe('DB-fel')
  })
})

describe('createHousehold', () => {
  it('skapar hushåll och sätter household i state', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // households INSERT
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValueOnce({ data: MOCK_HH_ROW, error: null }),
        }
      }
      // household_members INSERT
      return { insert: vi.fn().mockResolvedValueOnce({ error: null }) }
    })
    await useHouseholdStore.getState().createHousehold('Testfamiljen')
    expect(useHouseholdStore.getState().household?.name).toBe('Testfamiljen')
    expect(useHouseholdStore.getState().household?.inviteCode).toBe('abc12345')
  })
})

describe('joinHousehold', () => {
  it('hittar inte hushåll med felaktig kod', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    await useHouseholdStore.getState().joinHousehold('felkoden')
    expect(useHouseholdStore.getState().error).toBe('Hittade inget hushåll med den koden')
    expect(useHouseholdStore.getState().household).toBeNull()
  })

  it('sätter household vid lyckad join', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // households SELECT
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValueOnce({ data: MOCK_HH_ROW, error: null }),
        }
      }
      // household_members INSERT
      return { insert: vi.fn().mockResolvedValueOnce({ error: null }) }
    })
    await useHouseholdStore.getState().joinHousehold('abc12345')
    expect(useHouseholdStore.getState().household?.inviteCode).toBe('abc12345')
  })
})
