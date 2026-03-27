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
  primaryColor: 'coral',
  colors: {
    coral: [
      '#fff3f0',
      '#ffe3dd',
      '#ffc4b5',
      '#ffa08a',
      '#ff7d62',
      '#ff6348',
      '#e84a2f',
      '#c93820',
      '#a02714',
      '#73180a',
    ],
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: { radius: 'md' },
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
