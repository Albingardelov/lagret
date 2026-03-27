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
  primaryColor: 'sage',
  fontFamily: '"Manrope", sans-serif',
  fontFamilyMonospace: 'ui-monospace, Consolas, monospace',
  headings: {
    fontFamily: '"Epilogue", sans-serif',
    fontWeight: '700',
  },
  colors: {
    sage: [
      '#f8fbee',
      '#ecefe3',
      '#d5dbc0',
      '#bcc89c',
      '#a4b479',
      '#889a5e',
      '#53642e',
      '#47551f',
      '#394415',
      '#2c340d',
    ] as [string, string, string, string, string, string, string, string, string, string],
  },
  defaultRadius: 'xl',
  components: {
    Button: {
      defaultProps: { radius: 'xl' },
    },
    ActionIcon: {
      defaultProps: { radius: 'xl' },
    },
    Badge: {
      defaultProps: { radius: 'xl' },
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
