import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ErrorBoundary } from './components/ErrorBoundary'
import { router } from './router'
import { useAuthStore } from './store/authStore'

import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'

export function App() {
  const initialize = useAuthStore((s) => s.initialize)
  useEffect(() => initialize(), [initialize])
  return (
    <MantineProvider>
      <ErrorBoundary>
        <Notifications />
        <RouterProvider router={router} />
      </ErrorBoundary>
    </MantineProvider>
  )
}
