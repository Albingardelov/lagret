// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useShoppingStore } from '../shoppingStore'
import type { ShoppingItem } from '../../types'

const { mockOrder, mockEq, mockSingle, mockFrom, mockChannel } = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockEq = vi.fn()
  const mockSingle = vi.fn()
  const mockOn = vi.fn()
  const mockSubscribe = vi.fn()
  mockOn.mockReturnThis()
  mockSubscribe.mockReturnThis()
  const mockChannel = vi.fn(() => ({ on: mockOn, subscribe: mockSubscribe }))
  const mockFrom = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: mockOrder,
    eq: mockEq.mockReturnThis(),
    single: mockSingle,
  }))
  return { mockOrder, mockEq, mockSingle, mockFrom, mockChannel }
})

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: vi.fn(),
  },
}))

vi.mock('../householdStore', () => ({
  useHouseholdStore: {
    getState: () => ({ household: { id: 'hh-1' } }),
  },
}))

// Snake_case rows as returned by Supabase (the store maps them to camelCase)
const MOCK_ROW_1 = {
  id: 'shop-1',
  household_id: 'hh-1',
  name: 'Mjölk',
  quantity: 1,
  unit: 'st',
  note: null,
  category: null,
  is_bought: false,
  created_at: '2026-03-26T00:00:00Z',
}

const MOCK_ROW_2 = {
  ...MOCK_ROW_1,
  id: 'shop-2',
  name: 'Bröd',
  note: 'Surdeg',
  is_bought: true,
}

// Mapped camelCase items for use in setState and assertions
const MOCK_ITEM: ShoppingItem = {
  id: 'shop-1',
  householdId: 'hh-1',
  name: 'Mjölk',
  quantity: 1,
  unit: 'st',
  note: undefined,
  isBought: false,
  createdAt: '2026-03-26T00:00:00Z',
}

const MOCK_ITEM_2: ShoppingItem = {
  ...MOCK_ITEM,
  id: 'shop-2',
  name: 'Bröd',
  note: 'Surdeg',
  isBought: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  useShoppingStore.setState({ items: [], loading: false, error: null })
})

describe('fetchItems', () => {
  it('populerar items med data från Supabase', async () => {
    mockOrder.mockResolvedValueOnce({ data: [MOCK_ROW_1, MOCK_ROW_2], error: null })
    await useShoppingStore.getState().fetchItems()
    expect(useShoppingStore.getState().items).toHaveLength(2)
    expect(useShoppingStore.getState().items[0].name).toBe('Mjölk')
    expect(useShoppingStore.getState().items[0].householdId).toBe('hh-1')
    expect(useShoppingStore.getState().loading).toBe(false)
  })

  it('sätter error vid Supabase-fel', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'DB-fel' } })
    await useShoppingStore.getState().fetchItems()
    expect(useShoppingStore.getState().error).toBe('DB-fel')
  })
})

describe('addItem', () => {
  it('lägger till nytt item i listan', async () => {
    mockSingle.mockResolvedValueOnce({ data: MOCK_ROW_1, error: null })
    await useShoppingStore.getState().addItem('Mjölk')
    expect(useShoppingStore.getState().items).toHaveLength(1)
    expect(useShoppingStore.getState().items[0].name).toBe('Mjölk')
    expect(useShoppingStore.getState().items[0].householdId).toBe('hh-1')
  })

  it('kastar error vid Supabase-fel', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'fel' } })
    await expect(useShoppingStore.getState().addItem('Mjölk')).rejects.toThrow('fel')
    expect(useShoppingStore.getState().items).toHaveLength(0)
  })
})

describe('removeItem', () => {
  it('tar bort ett item från listan', async () => {
    useShoppingStore.setState({ items: [MOCK_ITEM, MOCK_ITEM_2] })
    mockEq.mockResolvedValueOnce({ error: null })
    await useShoppingStore.getState().removeItem('shop-1')
    expect(useShoppingStore.getState().items).toHaveLength(1)
    expect(useShoppingStore.getState().items[0].id).toBe('shop-2')
  })

  it('kastar error vid Supabase-fel', async () => {
    useShoppingStore.setState({ items: [MOCK_ITEM] })
    mockEq.mockResolvedValueOnce({ error: { message: 'delete-fel' } })
    await expect(useShoppingStore.getState().removeItem('shop-1')).rejects.toThrow('delete-fel')
    expect(useShoppingStore.getState().items).toHaveLength(1)
  })
})

describe('toggleBought', () => {
  it('togglar isBought för ett item', async () => {
    useShoppingStore.setState({ items: [MOCK_ITEM] })
    const toggledRow = { ...MOCK_ROW_1, is_bought: true }
    mockSingle.mockResolvedValueOnce({ data: toggledRow, error: null })
    await useShoppingStore.getState().toggleBought('shop-1')
    expect(useShoppingStore.getState().items[0].isBought).toBe(true)
  })

  it('gör ingenting för okänt id', async () => {
    useShoppingStore.setState({ items: [MOCK_ITEM] })
    await useShoppingStore.getState().toggleBought('okänt-id')
    expect(mockSingle).not.toHaveBeenCalled()
  })
})

describe('clearBought', () => {
  it('tar bort alla köpta varor', async () => {
    useShoppingStore.setState({ items: [MOCK_ITEM, MOCK_ITEM_2] })
    mockEq.mockResolvedValueOnce({ error: null })
    await useShoppingStore.getState().clearBought()
    expect(useShoppingStore.getState().items).toHaveLength(1)
    expect(useShoppingStore.getState().items[0].id).toBe('shop-1')
  })

  it('behåller listan vid Supabase-fel', async () => {
    useShoppingStore.setState({ items: [MOCK_ITEM, MOCK_ITEM_2] })
    mockEq.mockResolvedValueOnce({ error: { message: 'fel' } })
    await useShoppingStore.getState().clearBought()
    expect(useShoppingStore.getState().items).toHaveLength(2)
  })
})
