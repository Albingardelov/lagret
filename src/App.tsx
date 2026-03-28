import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ErrorBoundary } from './components/ErrorBoundary'
import { router } from './router'
import { useAuthStore } from './store/authStore'

import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'

const theme = createTheme({
  primaryColor: 'terra',
  fontFamily: '"Manrope", sans-serif',
  fontFamilyMonospace: 'ui-monospace, Consolas, monospace',
  headings: {
    fontFamily: '"Epilogue", sans-serif',
    fontWeight: '700',
  },
  colors: {
    terra: [
      '#FEF4EE',
      '#FBDFD2',
      '#F5B99F',
      '#ED8D6C',
      '#E36842',
      '#D4522E',
      '#B5432A',
      '#963520',
      '#772919',
      '#591D12',
    ] as [string, string, string, string, string, string, string, string, string, string],
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: { radius: 'xl' },
    },
    ActionIcon: {
      defaultProps: { radius: 'md' },
    },
    Badge: {
      defaultProps: { radius: 'sm' },
    },
    Chip: {
      defaultProps: { radius: 'xl' },
    },
  },
})

export function App() {
  const initialize = useAuthStore((s) => s.initialize)
  useEffect(() => initialize(), [initialize])
  return (
    <MantineProvider theme={theme}>
      <ErrorBoundary>
        <Notifications />
        <RouterProvider router={router} />
      </ErrorBoundary>
    </MantineProvider>
  )
}
