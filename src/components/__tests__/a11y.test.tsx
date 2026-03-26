import { describe, it, expect, vi } from 'vitest'
import { axe } from 'jest-axe'
import { render } from '../../test/utils'
import { ItemCard } from '../ItemCard'
import { ErrorBoundary } from '../ErrorBoundary'
import { LoginPage } from '../../pages/LoginPage'
import type { InventoryItem } from '../../types'

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    signInWithEmail: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}))

const ITEM: InventoryItem = {
  id: 'item-1',
  name: 'Mjölk',
  quantity: 2,
  unit: 'l',
  location: 'fridge',
  createdAt: '2026-03-26T00:00:00Z',
  updatedAt: '2026-03-26T00:00:00Z',
}

describe('Accessibility (axe)', () => {
  it('ItemCard har inga axe-violations', async () => {
    const { container } = render(<ItemCard item={ITEM} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('ErrorBoundary (normal) har inga axe-violations', async () => {
    const { container } = render(
      <ErrorBoundary>
        <div>Innehåll</div>
      </ErrorBoundary>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('LoginPage har inga axe-violations', async () => {
    const { container } = render(<LoginPage />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
