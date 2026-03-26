import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { NotificationBanner } from '../NotificationBanner'

beforeEach(() => {
  localStorage.clear()
  // Mock Notification API — default: permission 'default' so banner shows
  Object.defineProperty(window, 'Notification', {
    writable: true,
    configurable: true,
    value: { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') },
  })
})

describe('NotificationBanner', () => {
  it('visar bannern när tillstånd är "default"', () => {
    render(<NotificationBanner />)
    expect(screen.getByText(/Påminnelser om utgående varor/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Aktivera/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nej tack/i })).toBeInTheDocument()
  })

  it('döljs när "Nej tack" klickas', async () => {
    const { user } = render(<NotificationBanner />)
    await user.click(screen.getByRole('button', { name: /Nej tack/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(localStorage.getItem('lagret:notif-dismissed')).toBe('true')
  })

  it('visar inte bannern om den redan avvisats', () => {
    localStorage.setItem('lagret:notif-dismissed', 'true')
    render(<NotificationBanner />)
    expect(screen.queryByText(/Påminnelser/i)).not.toBeInTheDocument()
  })

  it('visar inte bannern om den redan avvisats via stängknappen', async () => {
    const { user } = render(<NotificationBanner />)
    // Stäng via Mantine Notification's X-knapp (closeButton)
    const closeButtons = screen.getAllByRole('button')
    // sista knappen är X-knappen
    await user.click(closeButtons[closeButtons.length - 1])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
