import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils'
import { ItemCard } from '../ItemCard'
import type { InventoryItem } from '../../types'
import dayjs from 'dayjs'

const BASE_ITEM: InventoryItem = {
  id: 'item-1',
  name: 'Mjölk',
  quantity: 2,
  unit: 'l',
  location: 'fridge',
  createdAt: '2026-03-26T00:00:00Z',
  updatedAt: '2026-03-26T00:00:00Z',
}

describe('ItemCard', () => {
  it('renderar namn, kvantitet och enhet', () => {
    render(<ItemCard item={BASE_ITEM} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Mjölk')).toBeInTheDocument()
    expect(screen.getByText('2 l')).toBeInTheDocument()
  })

  it('renderar utan krasch om expiryDate saknas', () => {
    render(<ItemCard item={BASE_ITEM} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText(/Bäst före/)).not.toBeInTheDocument()
  })

  it('visar utgångsbadge när datumet är nära', () => {
    const expiryDate = dayjs().add(2, 'day').format('YYYY-MM-DD')
    const item = { ...BASE_ITEM, expiryDate }
    render(<ItemCard item={item} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/kvar/)).toBeInTheDocument()
  })

  it('visar ingen utgångsbadge för datum långt bort', () => {
    const expiryDate = dayjs().add(10, 'day').format('YYYY-MM-DD')
    const item = { ...BASE_ITEM, expiryDate }
    render(<ItemCard item={item} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText(/kvar/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Utgå/)).not.toBeInTheDocument()
  })

  it.each([
    { daysFromNow: -1, expectedText: /utgången/i, desc: 'röd för utgånget' },
    { daysFromNow: 2, expectedText: /kvar/i, desc: 'orange för ≤3 dagar' },
  ])('badge är $desc', ({ daysFromNow, expectedText }) => {
    const expiryDate = dayjs().add(daysFromNow, 'day').format('YYYY-MM-DD')
    const item = { ...BASE_ITEM, expiryDate }
    render(<ItemCard item={item} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(expectedText)).toBeInTheDocument()
  })

  it('anropar onEdit med rätt item vid klick på redigera (första knappen)', async () => {
    const onEdit = vi.fn()
    const { user } = render(<ItemCard item={BASE_ITEM} onEdit={onEdit} onDelete={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0]) // Edit-knapp
    expect(onEdit).toHaveBeenCalledWith(BASE_ITEM)
  })

  it('anropar onDelete med rätt id vid klick på ta bort (andra knappen)', async () => {
    const onDelete = vi.fn()
    const { user } = render(<ItemCard item={BASE_ITEM} onEdit={vi.fn()} onDelete={onDelete} />)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1]) // Delete-knapp
    expect(onDelete).toHaveBeenCalledWith('item-1')
  })
})
