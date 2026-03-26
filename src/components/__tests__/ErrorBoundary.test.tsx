import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen } from '../../test/utils'
import { ErrorBoundary } from '../ErrorBoundary'

function ThrowingComponent(): never {
  throw new Error('Test error')
}

function SafeComponent() {
  return <div>Allt OK</div>
}

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renderar children normalt när inget fel uppstår', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('Allt OK')).toBeInTheDocument()
  })

  it('visar felvyn när ett child kastar', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('Något gick fel')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ladda om/i })).toBeInTheDocument()
  })

  it('loggar felet till konsolen', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )
    expect(console.error).toHaveBeenCalled()
  })
})
