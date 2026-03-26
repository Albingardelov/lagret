import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInventoryStore } from '../inventoryStore'
import type { InventoryItem } from '../../types'

// vi.hoisted säkerställer att mockarna är initialiserade innan vi.mock hoistas
const { mockOrder, mockEq, mockSingle, mockFrom } = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockEq = vi.fn()
  const mockSingle = vi.fn()
  const mockFrom = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: mockOrder,
    eq: mockEq.mockReturnThis(),
    single: mockSingle,
  }))
  return { mockOrder, mockEq, mockSingle, mockFrom }
})

vi.mock('../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('../../store/householdStore', () => ({
  useHouseholdStore: {
    getState: () => ({ household: { id: 'hh-1' } }),
  },
}))

const MOCK_ITEM: InventoryItem = {
  id: 'item-1',
  name: 'Mjölk',
  barcode: undefined,
  quantity: 1,
  unit: 'l',
  location: 'fridge',
  expiryDate: '2026-04-01',
  category: 'Mejeri',
  createdAt: '2026-03-26T00:00:00Z',
  updatedAt: '2026-03-26T00:00:00Z',
}

const MOCK_ITEM_2: InventoryItem = {
  ...MOCK_ITEM,
  id: 'item-2',
  name: 'Pasta',
  location: 'pantry',
  expiryDate: undefined,
}

beforeEach(() => {
  vi.clearAllMocks()
  // Återställ store-state mellan tester
  useInventoryStore.setState({ items: [], loading: false, error: null })
})

describe('fetchItems', () => {
  it('populerar items med data från Supabase', async () => {
    mockOrder.mockResolvedValueOnce({ data: [MOCK_ITEM, MOCK_ITEM_2], error: null })
    await useInventoryStore.getState().fetchItems()
    expect(useInventoryStore.getState().items).toHaveLength(2)
    expect(useInventoryStore.getState().items[0].name).toBe('Mjölk')
    expect(useInventoryStore.getState().loading).toBe(false)
  })

  it('sätter error vid Supabase-fel', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'DB-fel' } })
    await useInventoryStore.getState().fetchItems()
    expect(useInventoryStore.getState().error).toBe('DB-fel')
    expect(useInventoryStore.getState().items).toHaveLength(0)
  })

  it('sätter loading true under hämtning', async () => {
    let loadingDuringFetch = false
    mockOrder.mockImplementationOnce(async () => {
      loadingDuringFetch = useInventoryStore.getState().loading
      return { data: [], error: null }
    })
    await useInventoryStore.getState().fetchItems()
    expect(loadingDuringFetch).toBe(true)
    expect(useInventoryStore.getState().loading).toBe(false)
  })
})

describe('addItem', () => {
  it('lägger till nytt item i listan', async () => {
    // insert returns no error; fetchItems (via mockOrder) returns the item
    mockFrom.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValueOnce({ error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: mockOrder,
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
    }))
    mockOrder.mockResolvedValueOnce({ data: [MOCK_ITEM], error: null })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, ...newItemData } = MOCK_ITEM
    await useInventoryStore.getState().addItem(newItemData)
    expect(useInventoryStore.getState().items).toHaveLength(1)
    expect(useInventoryStore.getState().items[0].name).toBe('Mjölk')
  })

  it('gör ingenting vid Supabase-fel', async () => {
    mockFrom.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValueOnce({ error: { message: 'fel' } }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: mockOrder,
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
    }))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, ...newItemData } = MOCK_ITEM
    await useInventoryStore.getState().addItem(newItemData)
    expect(useInventoryStore.getState().items).toHaveLength(0)
  })
})

describe('updateItem', () => {
  it('uppdaterar korrekt item i listan', async () => {
    useInventoryStore.setState({ items: [MOCK_ITEM, MOCK_ITEM_2] })
    const updated = { ...MOCK_ITEM, quantity: 3 }
    mockSingle.mockResolvedValueOnce({ data: updated, error: null })
    await useInventoryStore.getState().updateItem('item-1', { quantity: 3 })
    const item = useInventoryStore.getState().items.find((i) => i.id === 'item-1')
    expect(item!.quantity).toBe(3)
    // Andra item ska vara opåverkat
    expect(useInventoryStore.getState().items.find((i) => i.id === 'item-2')).toEqual(MOCK_ITEM_2)
  })
})

describe('deleteItem', () => {
  it('tar bort item från listan', async () => {
    useInventoryStore.setState({ items: [MOCK_ITEM, MOCK_ITEM_2] })
    mockEq.mockResolvedValueOnce({ error: null })
    await useInventoryStore.getState().deleteItem('item-1')
    expect(useInventoryStore.getState().items).toHaveLength(1)
    expect(useInventoryStore.getState().items[0].id).toBe('item-2')
  })

  it('behåller listan vid Supabase-fel', async () => {
    useInventoryStore.setState({ items: [MOCK_ITEM] })
    mockEq.mockResolvedValueOnce({ error: { message: 'fel' } })
    await useInventoryStore.getState().deleteItem('item-1')
    expect(useInventoryStore.getState().items).toHaveLength(1)
  })
})

describe('getByLocation', () => {
  beforeEach(() => {
    useInventoryStore.setState({ items: [MOCK_ITEM, MOCK_ITEM_2] })
  })

  it('filtrerar korrekt för fridge', () => {
    const result = useInventoryStore.getState().getByLocation('fridge')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('item-1')
  })

  it('filtrerar korrekt för pantry', () => {
    const result = useInventoryStore.getState().getByLocation('pantry')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('item-2')
  })

  it('returnerar [] för freezer när inga varor finns', () => {
    const result = useInventoryStore.getState().getByLocation('freezer')
    expect(result).toHaveLength(0)
  })
})

describe('getExpiringSoon', () => {
  it('returnerar varor som går ut inom 3 dagar', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 2)
    const item = { ...MOCK_ITEM, expiryDate: soon.toISOString().split('T')[0] }
    useInventoryStore.setState({ items: [item] })
    expect(useInventoryStore.getState().getExpiringSoon(3)).toHaveLength(1)
  })

  it('exkluderar varor utan datum', () => {
    useInventoryStore.setState({ items: [MOCK_ITEM_2] }) // expiryDate undefined
    expect(useInventoryStore.getState().getExpiringSoon(3)).toHaveLength(0)
  })

  it('exkluderar varor som redan gått ut', () => {
    const expired = { ...MOCK_ITEM, expiryDate: '2020-01-01' }
    useInventoryStore.setState({ items: [expired] })
    expect(useInventoryStore.getState().getExpiringSoon(3)).toHaveLength(0)
  })

  it('inkluderar inte varor som går ut om 7 dagar när threshold är 3', () => {
    const farAway = new Date()
    farAway.setDate(farAway.getDate() + 7)
    const item = { ...MOCK_ITEM, expiryDate: farAway.toISOString().split('T')[0] }
    useInventoryStore.setState({ items: [item] })
    expect(useInventoryStore.getState().getExpiringSoon(3)).toHaveLength(0)
  })
})
