import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { ShoppingListPage } from '../ShoppingListPage'
import type { ShoppingItem } from '../../types'

const ITEM_1: ShoppingItem = {
  id: 'shop-1',
  householdId: 'hh-1',
  name: 'Mjölk',
  quantity: 1,
  unit: 'st',
  note: undefined,
  isBought: false,
  createdAt: '2026-03-26T00:00:00Z',
}
const ITEM_2: ShoppingItem = {
  id: 'shop-2',
  householdId: 'hh-1',
  name: 'Bröd',
  quantity: 1,
  unit: 'st',
  note: 'Surdeg',
  isBought: true,
  createdAt: '2026-03-26T00:00:00Z',
}

const mockFetchItems = vi.fn()
const mockAddItem = vi.fn()
const mockToggleBought = vi.fn()
const mockRemoveItem = vi.fn()
const mockClearBought = vi.fn()
const mockSubscribeRealtime = vi.fn(() => vi.fn())

vi.mock('../../store/shoppingStore', () => ({
  useShoppingStore: () => ({
    items: [ITEM_1, ITEM_2],
    loading: false,
    error: null,
    fetchItems: mockFetchItems,
    addItem: mockAddItem,
    toggleBought: mockToggleBought,
    removeItem: mockRemoveItem,
    clearBought: mockClearBought,
    subscribeRealtime: mockSubscribeRealtime,
  }),
}))

vi.mock('../../lib/categories', () => ({
  ITEM_CATEGORIES: ['Mejeri'],
  categoryKey: (cat: string) => `categories.${cat}`,
}))

vi.mock('../../lib/units', () => ({
  UNITS_FLAT: [{ group: 'Styck', items: [{ value: 'st', label: 'st' }] }],
  unitGroupKey: (group: string) => `unitGroups.${group}`,
}))

vi.mock('../../lib/parseShoppingInput', () => ({
  parseShoppingInput: (input: string) => ({ quantity: 1, unit: 'st', name: input }),
}))

// Mock AddItemModal used for inventory add
vi.mock('../../components/AddItemModal', () => ({
  AddItemModal: () => null,
}))

// Mock BottomSheet to render children directly when opened
vi.mock('../../components/BottomSheet', () => ({
  BottomSheet: ({ opened, children }: { opened: boolean; children: React.ReactNode }) =>
    opened ? <div>{children}</div> : null,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ShoppingListPage', () => {
  it('renderar väntande och köpta varor', () => {
    render(<ShoppingListPage />)
    expect(screen.getByText('Mjölk')).toBeInTheDocument()
    expect(screen.getByText('Bröd')).toBeInTheDocument()
  })

  it('visar notering för köpt vara med note', () => {
    render(<ShoppingListPage />)
    expect(screen.getByText('Surdeg')).toBeInTheDocument()
  })

  it('visar sektionen Köpta varor när det finns köpta', () => {
    render(<ShoppingListPage />)
    expect(screen.getByText('Köpta varor')).toBeInTheDocument()
  })

  it('anropar addItem via FAB och BottomSheet', async () => {
    const { user } = render(<ShoppingListPage />)
    // Click FAB to open the BottomSheet
    const fab = screen.getByRole('button', { name: /Lägg till vara/i })
    await user.click(fab)
    // Fill in the name field in the BottomSheet
    const input = screen.getByLabelText(/Namn/i)
    await user.type(input, 'Ägg')
    // Click submit button
    const submitBtn = screen.getByRole('button', { name: /Lägg till$/i })
    await user.click(submitBtn)
    expect(mockAddItem).toHaveBeenCalledWith('Ägg', 1, 'st', undefined, undefined)
  })

  it('anropar toggleBought vid klick på checkbox', async () => {
    const { user } = render(<ShoppingListPage />)
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    expect(mockToggleBought).toHaveBeenCalledWith('shop-1')
  })

  it('anropar clearBought vid klick på rensa-knappen', async () => {
    const { user } = render(<ShoppingListPage />)
    const clearBtn = screen.getByRole('button', { name: /Rensa köpta varor/i })
    await user.click(clearBtn)
    expect(mockClearBought).toHaveBeenCalled()
  })

  it('anropar fetchItems och subscribeRealtime vid mount', () => {
    render(<ShoppingListPage />)
    expect(mockFetchItems).toHaveBeenCalled()
    expect(mockSubscribeRealtime).toHaveBeenCalled()
  })
})
