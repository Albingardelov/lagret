import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils'

// These will be exported from CookingMode.tsx in Task 3
import { getSmallStep, getLargeStep, formatQty } from '../CookingMode'
import { CookingMode } from '../CookingMode'

// Mock stores
vi.mock('../../store/inventoryStore', () => ({
  useInventoryStore: vi.fn((sel: (s: unknown) => unknown) =>
    sel({
      items: [
        {
          id: 'item-1',
          name: 'Vispgrädde',
          quantity: 0.8,
          unit: 'l',
          location: 'loc-kyl',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'item-2',
          name: 'Olivolja',
          quantity: 420,
          unit: 'ml',
          location: 'loc-skafferi',
          createdAt: '',
          updatedAt: '',
        },
      ],
      updateItem: vi.fn(),
    })
  ),
}))

vi.mock('../../store/locationsStore', () => ({
  useLocationsStore: vi.fn((sel: (s: unknown) => unknown) =>
    sel({
      locations: [
        {
          id: 'loc-kyl',
          name: 'Kyl',
          icon: 'fridge',
          sortOrder: 0,
          householdId: 'h1',
          createdAt: '',
        },
        {
          id: 'loc-skafferi',
          name: 'Skafferi',
          icon: 'pantry',
          sortOrder: 1,
          householdId: 'h1',
          createdAt: '',
        },
      ],
    })
  ),
}))

vi.mock('../AddItemModal', () => ({
  AddItemModal: ({ opened }: { opened: boolean }) =>
    opened ? <div data-testid="add-item-modal" /> : null,
}))

describe('getSmallStep', () => {
  it('dl → 0.5', () => expect(getSmallStep('dl')).toBe(0.5))
  it('l → 0.5', () => expect(getSmallStep('l')).toBe(0.5))
  it('ml → 10', () => expect(getSmallStep('ml')).toBe(10))
  it('g → 50', () => expect(getSmallStep('g')).toBe(50))
  it('kg → 0.1', () => expect(getSmallStep('kg')).toBe(0.1))
  it('hg → 0.5', () => expect(getSmallStep('hg')).toBe(0.5))
  it('msk → 1', () => expect(getSmallStep('msk')).toBe(1))
  it('tsk → 1', () => expect(getSmallStep('tsk')).toBe(1))
  it('krm → 1', () => expect(getSmallStep('krm')).toBe(1))
  it('st → 1', () => expect(getSmallStep('st')).toBe(1))
  it('unknown → 1', () => expect(getSmallStep('xyz')).toBe(1))
})

describe('getLargeStep', () => {
  it('dl → 1', () => expect(getLargeStep('dl')).toBe(1))
  it('l → 1', () => expect(getLargeStep('l')).toBe(1))
  it('ml → 50', () => expect(getLargeStep('ml')).toBe(50))
  it('g → 100', () => expect(getLargeStep('g')).toBe(100))
  it('kg → 0.25', () => expect(getLargeStep('kg')).toBe(0.25))
  it('hg → 1', () => expect(getLargeStep('hg')).toBe(1))
  it('msk → 2', () => expect(getLargeStep('msk')).toBe(2))
  it('tsk → 2', () => expect(getLargeStep('tsk')).toBe(2))
  it('krm → 2', () => expect(getLargeStep('krm')).toBe(2))
  it('st → 2', () => expect(getLargeStep('st')).toBe(2))
  it('unknown → 2', () => expect(getLargeStep('xyz')).toBe(2))
})

describe('formatQty', () => {
  it('heltal → "2"', () => expect(formatQty(2)).toBe('2'))
  it('en decimal → "0.5"', () => expect(formatQty(0.5)).toBe('0.5'))
  it('två decimaler → "0.25"', () => expect(formatQty(0.25)).toBe('0.25'))
  it('avrundar .0 → "1"', () => expect(formatQty(1.0)).toBe('1'))
})

describe('CookingMode', () => {
  it('renderar rubrik', () => {
    render(<CookingMode opened onClose={vi.fn()} />)
    expect(screen.getByText('Improvisera i köket')).toBeInTheDocument()
  })

  it('renderar varunamn', () => {
    render(<CookingMode opened onClose={vi.fn()} />)
    expect(screen.getByText('Vispgrädde')).toBeInTheDocument()
    expect(screen.getByText('Olivolja')).toBeInTheDocument()
  })

  it('visar platsnamn i versaler på kortet', () => {
    render(<CookingMode opened onClose={vi.fn()} />)
    expect(screen.getByText('KYL')).toBeInTheDocument()
    expect(screen.getByText('SKAFFERI')).toBeInTheDocument()
  })

  it('renderar filterknappar för platser', () => {
    render(<CookingMode opened onClose={vi.fn()} />)
    expect(screen.getByText('Alla')).toBeInTheDocument()
    expect(screen.getByText('Kyl')).toBeInTheDocument()
    expect(screen.getByText('Skafferi')).toBeInTheDocument()
  })

  it('filtrerar till en plats vid chip-klick', async () => {
    const { user } = render(<CookingMode opened onClose={vi.fn()} />)
    await user.click(screen.getByText('Kyl'))
    expect(screen.getByText('Vispgrädde')).toBeInTheDocument()
    expect(screen.queryByText('Olivolja')).not.toBeInTheDocument()
  })

  it('öppnar AddItemModal vid klick på lägg-till-knappen', async () => {
    const { user } = render(<CookingMode opened onClose={vi.fn()} />)
    await user.click(screen.getByText('LÄGG TILL INGREDIENS'))
    expect(screen.getByTestId('add-item-modal')).toBeInTheDocument()
  })

  it('visar unit-chip för varje vara', () => {
    render(<CookingMode opened onClose={vi.fn()} />)
    const unitChips = screen.getAllByRole('button', { name: /byt enhet/i })
    expect(unitChips).toHaveLength(2) // one per item
  })

  it('step-knappar visar kokenhet, inte lagringsenhet', () => {
    render(<CookingMode opened onClose={vi.fn()} />)
    // Vispgrädde has unit 'l' → cooking unit 'l' → buttons show 'L'
    // Olivolja has unit 'ml' → cooking unit 'ml' → buttons show 'ML'
    expect(screen.getAllByText('L').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ML').length).toBeGreaterThan(0)
  })
})
