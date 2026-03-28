import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from '../AuthGuard'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockInitialize = vi.fn(() => vi.fn())

function makeAuthStore(overrides: { user?: { id: string } | null; loading?: boolean }) {
  return {
    user: overrides.user ?? null,
    loading: overrides.loading ?? false,
    initialize: mockInitialize,
  }
}

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

async function setupAndRender(storeState: Parameters<typeof makeAuthStore>[0]) {
  const { useAuthStore } = await import('../../store/authStore')
  vi.mocked(useAuthStore).mockReturnValue(makeAuthStore(storeState) as never)
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AuthGuard>
              <div>Skyddat innehåll</div>
            </AuthGuard>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('AuthGuard', () => {
  it('visar PageLoader när loading är true', async () => {
    await setupAndRender({ loading: true })
    // Loader visas, inte innehållet
    expect(screen.queryByText('Skyddat innehåll')).not.toBeInTheDocument()
  })

  it('redirectar till /login när ej inloggad', async () => {
    await setupAndRender({ user: null, loading: false })
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('renderar children när inloggad', async () => {
    await setupAndRender({ user: { id: 'user-1' }, loading: false })
    expect(screen.getByText('Skyddat innehåll')).toBeInTheDocument()
  })

  it('anropar inte initialize (det görs i App.tsx)', async () => {
    await setupAndRender({ user: { id: 'user-1' }, loading: false })
    expect(mockInitialize).not.toHaveBeenCalled()
  })
})
