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

const MOCK_ITEM: ShoppingItem = {
  id: 'shop-1',
  householdId: 'hh-1',
  name: 'Mjölk',
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
    mockOrder.mockResolvedValueOnce({ data: [MOCK_ITEM, MOCK_ITEM_2], error: null })
    await useShoppingStore.getState().fetchItems()
    expect(useShoppingStore.getState().items).toHaveLength(2)
    expect(useShoppingStore.getState().items[0].name).toBe('Mjölk')
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
    mockSingle.mockResolvedValueOnce({ data: MOCK_ITEM, error: null })
    await useShoppingStore.getState().addItem('Mjölk')
    expect(useShoppingStore.getState().items).toHaveLength(1)
    expect(useShoppingStore.getState().items[0].name).toBe('Mjölk')
  })

  it('gör ingenting vid Supabase-fel', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'fel' } })
    await useShoppingStore.getState().addItem('Mjölk')
    expect(useShoppingStore.getState().items).toHaveLength(0)
  })
})

describe('toggleBought', () => {
  it('togglar isBought för ett item', async () => {
    useShoppingStore.setState({ items: [MOCK_ITEM] })
    const toggled = { ...MOCK_ITEM, isBought: true }
    mockSingle.mockResolvedValueOnce({ data: toggled, error: null })
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
