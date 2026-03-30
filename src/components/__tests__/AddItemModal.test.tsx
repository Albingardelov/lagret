import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import { AddItemModal } from '../AddItemModal'

const mockAddItem = vi.fn()
const mockAddItems = vi.fn()

vi.mock('../../store/inventoryStore', () => ({
  useInventoryStore: (
    selector: (s: { addItem: typeof mockAddItem; addItems: typeof mockAddItems }) => unknown
  ) => selector({ addItem: mockAddItem, addItems: mockAddItems }),
}))

vi.mock('../../store/locationsStore', () => ({
  useLocationsStore: (
    selector: (s: { locations: Array<{ id: string; name: string; icon: string }> }) => unknown
  ) => selector({ locations: [{ id: 'loc-1', name: 'Skafferi', icon: 'pantry' }] }),
}))

vi.mock('../../lib/categories', () => ({
  ITEM_CATEGORIES: [{ value: 'dairy', label: 'Mejeri' }],
  CATEGORY_DEFAULT_UNIT: {} as Record<string, string>,
  CATEGORY_DEFAULT_QTY: {} as Record<string, number>,
}))

vi.mock('../../lib/storageDurations', () => ({
  suggestExpiryDate: () => null,
}))

vi.mock('../../lib/units', () => ({
  UNITS: [
    { group: 'Vikt', items: ['g', 'kg'] },
    { group: 'Volym', items: ['l'] },
    { group: 'Styck', items: ['st'] },
  ],
  UNITS_FLAT: [
    { value: 'st', label: 'st' },
    { value: 'l', label: 'l' },
  ],
}))

// Scanner använder ZXing som inte fungerar i jsdom – mocka hela komponenten
vi.mock('../Scanner', () => ({
  Scanner: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="scanner">
      <button onClick={onClose}>Stäng scanner</button>
    </div>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockAddItem.mockResolvedValue(undefined)
})

describe('AddItemModal', () => {
  it('renderar formuläret när opened=true', () => {
    render(<AddItemModal opened={true} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Namn/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Streckkod/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lägg till/i })).toBeInTheDocument()
  })

  it('renderar ingenting synligt när opened=false', () => {
    render(<AddItemModal opened={false} onClose={vi.fn()} />)
    expect(screen.queryByLabelText(/Namn/i)).not.toBeInTheDocument()
  })

  it('anropar addItem med korrekt data vid submit', async () => {
    const onClose = vi.fn()
    const { user } = render(<AddItemModal opened={true} onClose={onClose} />)

    await user.type(screen.getByLabelText(/Namn/i), 'Ägg')
    await user.click(screen.getByRole('button', { name: /Lägg till/i }))

    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Ägg', location: 'loc-1' })
      )
    })
  })

  it('anropar onClose efter lyckad submit', async () => {
    const onClose = vi.fn()
    const { user } = render(<AddItemModal opened={true} onClose={onClose} />)

    await user.type(screen.getByLabelText(/Namn/i), 'Ägg')
    await user.click(screen.getByRole('button', { name: /Lägg till/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('växlar till Scanner-vy vid klick på Skanna', async () => {
    const { user } = render(<AddItemModal opened={true} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Skanna/i }))
    expect(screen.getByTestId('scanner')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Namn/i)).not.toBeInTheDocument()
  })

  it('återgår till formulär när scanner stängs', async () => {
    const { user } = render(<AddItemModal opened={true} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Skanna/i }))
    await user.click(screen.getByRole('button', { name: /Stäng scanner/i }))
    expect(screen.getByLabelText(/Namn/i)).toBeInTheDocument()
  })

  it('fyller i streckkod om defaultBarcode skickas in', () => {
    render(<AddItemModal opened={true} onClose={vi.fn()} defaultBarcode="7310865071001" />)
    const barcodeInput = screen.getByLabelText(/Streckkod/i) as HTMLInputElement
    expect(barcodeInput.value).toBe('7310865071001')
  })
})
