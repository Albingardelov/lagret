import { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>
}

export function renderWithMantine(ui: ReactElement, options?: RenderOptions) {
  const user = userEvent.setup()
  const result = render(ui, { wrapper: Wrapper, ...options })
  return { ...result, user }
}

export * from '@testing-library/react'
export { renderWithMantine as render }
