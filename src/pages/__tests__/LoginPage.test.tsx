import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { LoginPage } from '../LoginPage'

const mockSignInWithEmail = vi.fn()
const mockSignInWithGoogle = vi.fn()

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    signInWithEmail: mockSignInWithEmail,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('renderar e-postfält och knappar', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/E-postadress/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Skicka magic link/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fortsätt med Google/i })).toBeInTheDocument()
  })

  it('skicka-knappen är inaktiverad när e-post är tom', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /Skicka magic link/i })).toBeDisabled()
  })

  it('anropar signInWithEmail när formuläret submittas', async () => {
    mockSignInWithEmail.mockResolvedValueOnce(undefined)
    const { user } = render(<LoginPage />)
    await user.type(screen.getByLabelText(/E-postadress/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /Skicka magic link/i }))
    expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('visar bekräftelse efter lyckad magic link', async () => {
    mockSignInWithEmail.mockResolvedValueOnce(undefined)
    const { user } = render(<LoginPage />)
    await user.type(screen.getByLabelText(/E-postadress/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /Skicka magic link/i }))
    expect(await screen.findByText(/Kolla din inbox/i)).toBeInTheDocument()
  })

  it('anropar signInWithGoogle vid klick', async () => {
    const { user } = render(<LoginPage />)
    await user.click(screen.getByRole('button', { name: /Fortsätt med Google/i }))
    expect(mockSignInWithGoogle).toHaveBeenCalled()
  })
})
