import { Component } from 'react'
import { Button, Center, Stack, Text } from '@mantine/core'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Center h="100dvh">
          <Stack align="center" gap="sm">
            <Text size="xl" fw={700}>
              Något gick fel
            </Text>
            <Text c="dimmed" size="sm">
              {this.state.error?.message}
            </Text>
            <Button onClick={() => window.location.reload()}>Ladda om</Button>
          </Stack>
        </Center>
      )
    }
    return this.props.children
  }
}
