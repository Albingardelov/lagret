import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { ShoppingListPage } from '../ShoppingListPage'
import type { ShoppingItem } from '../../types'

const ITEM_1: ShoppingItem = {
  id: 'shop-1',
  householdId: 'hh-1',
  name: 'Mjölk',
  note: undefined,
  isBought: false,
  createdAt: '2026-03-26T00:00:00Z',
}
const ITEM_2: ShoppingItem = {
  id: 'shop-2',
  householdId: 'hh-1',
  name: 'Bröd',
  note: 'Surdeg',
  isBought: true,
  createdAt: '2026-03-26T00:00:00Z',
}

const mockFetchItems = vi.fn()
const mockAddItem = vi.fn()
const mockToggleBought = vi.fn()
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
    clearBought: mockClearBought,
    subscribeRealtime: mockSubscribeRealtime,
  }),
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

  it('visar notering för vara med note', () => {
    render(<ShoppingListPage />)
    expect(screen.getByText('Surdeg')).toBeInTheDocument()
  })

  it('visar sektionen Köpta varor när det finns köpta', () => {
    render(<ShoppingListPage />)
    expect(screen.getByText('Köpta varor')).toBeInTheDocument()
  })

  it('anropar addItem vid klick på Lägg till', async () => {
    const { user } = render(<ShoppingListPage />)
    const input = screen.getByPlaceholderText('Lägg till vara...')
    await user.type(input, 'Ägg')
    const button = screen.getByRole('button', { name: /Lägg till/i })
    await user.click(button)
    expect(mockAddItem).toHaveBeenCalledWith('Ägg', undefined)
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
