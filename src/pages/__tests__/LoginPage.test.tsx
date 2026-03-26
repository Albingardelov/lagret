import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../LoginPage'

const mockSignInWithEmail = vi.fn()
const mockSignInWithGoogle = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignUpWithPassword = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    signInWithEmail: mockSignInWithEmail,
    signInWithGoogle: mockSignInWithGoogle,
    signInWithPassword: mockSignInWithPassword,
    signUpWithPassword: mockSignUpWithPassword,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  it('renderar e-postfält och knappar', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/E-postadress/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Logga in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fortsätt med Google/i })).toBeInTheDocument()
  })

  it('visar Skicka magic link i magic-läge', async () => {
    const { user } = renderLoginPage()
    await user.click(screen.getByText(/Logga in med magic link istället/i))
    expect(screen.getAllByRole('button', { name: /Skicka magic link/i }).length).toBeGreaterThan(0)
  })

  it('skicka-knappen är inaktiverad när e-post är tom i magic-läge', async () => {
    const { user } = renderLoginPage()
    await user.click(screen.getByText(/Logga in med magic link istället/i))
    const buttons = screen.getAllByRole('button', { name: /Skicka magic link/i })
    expect(buttons[0]).toBeDisabled()
  })

  it('anropar signInWithEmail när formuläret submittas i magic-läge', async () => {
    mockSignInWithEmail.mockResolvedValueOnce(undefined)
    const { user } = renderLoginPage()
    await user.click(screen.getByText(/Logga in med magic link istället/i))
    await user.type(screen.getByLabelText(/E-postadress/i), 'test@example.com')
    const buttons = screen.getAllByRole('button', { name: /Skicka magic link/i })
    await user.click(buttons[0])
    expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('visar bekräftelse efter lyckad magic link', async () => {
    mockSignInWithEmail.mockResolvedValueOnce(undefined)
    const { user } = renderLoginPage()
    await user.click(screen.getByText(/Logga in med magic link istället/i))
    await user.type(screen.getByLabelText(/E-postadress/i), 'test@example.com')
    const buttons = screen.getAllByRole('button', { name: /Skicka magic link/i })
    await user.click(buttons[0])
    expect(await screen.findByText(/Kolla din inbox/i)).toBeInTheDocument()
  })

  it('anropar signInWithGoogle vid klick', async () => {
    const { user } = renderLoginPage()
    await user.click(screen.getByRole('button', { name: /Fortsätt med Google/i }))
    expect(mockSignInWithGoogle).toHaveBeenCalled()
  })
})
