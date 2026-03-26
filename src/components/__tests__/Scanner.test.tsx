import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { Scanner } from '../Scanner'

const mockStartScanning = vi.fn()
const mockStopScanning = vi.fn()
let mockError: string | null = null
let mockScanning = false

vi.mock('../../hooks/useScanner', () => ({
  useScanner: () => ({
    scanning: mockScanning,
    error: mockError,
    startScanning: mockStartScanning,
    stopScanning: mockStopScanning,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockError = null
  mockScanning = false
  mockStartScanning.mockResolvedValue(undefined)
})

describe('Scanner', () => {
  it('anropar startScanning med video-elementet vid mount', () => {
    render(<Scanner onBarcode={vi.fn()} onClose={vi.fn()} />)
    expect(mockStartScanning).toHaveBeenCalledWith(expect.any(HTMLVideoElement))
  })

  it('anropar stopScanning vid unmount', () => {
    const { unmount } = render(<Scanner onBarcode={vi.fn()} onClose={vi.fn()} />)
    unmount()
    expect(mockStopScanning).toHaveBeenCalled()
  })

  it('anropar stopScanning och onClose vid klick på Avbryt', async () => {
    const onClose = vi.fn()
    const { user } = render(<Scanner onBarcode={vi.fn()} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /Avbryt/i }))
    expect(mockStopScanning).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('visar "Startar kameran" när scanning=false', () => {
    mockScanning = false
    render(<Scanner onBarcode={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/Startar kameran/i)).toBeInTheDocument()
  })

  it('visar "Rikta kameran" när scanning=true', () => {
    mockScanning = true
    render(<Scanner onBarcode={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/Rikta kameran/i)).toBeInTheDocument()
  })

  it('visar felmeddelande vid kamerafel', () => {
    mockError = 'Kameran kunde inte startas'
    render(<Scanner onBarcode={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Kameran kunde inte startas')).toBeInTheDocument()
    expect(screen.getByText('Kamerafel')).toBeInTheDocument()
  })

  it('visar inget felmeddelande när error=null', () => {
    render(<Scanner onBarcode={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByText('Kamerafel')).not.toBeInTheDocument()
  })

  it('renderar video-elementet', () => {
    const { container } = render(<Scanner onBarcode={vi.fn()} onClose={vi.fn()} />)
    expect(container.querySelector('video')).toBeInTheDocument()
  })
})
