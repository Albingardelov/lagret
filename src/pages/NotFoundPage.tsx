import { Center, Stack, Text, Button } from '@mantine/core'
import { useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Center h="100dvh">
      <Stack align="center">
        <Text size="xl" fw={700}>
          404
        </Text>
        <Text c="dimmed">Sidan hittades inte</Text>
        <Button onClick={() => navigate('/')}>Gå till startsidan</Button>
      </Stack>
    </Center>
  )
}
