import { Center, Stack, Text, Button } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <Center h="100dvh">
      <Stack align="center">
        <Text size="xl" fw={700}>
          404
        </Text>
        <Text c="dimmed">{t('notFound.title')}</Text>
        <Button onClick={() => navigate('/')}>{t('notFound.goHome')}</Button>
      </Stack>
    </Center>
  )
}
