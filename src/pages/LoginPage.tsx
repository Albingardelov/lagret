import { useState } from 'react'
import { Center, Stack, TextInput, Button, Text, Divider, Alert, Paper } from '@mantine/core'
import { IconBrandGoogle, IconMail, IconCheck } from '@tabler/icons-react'
import { useAuthStore } from '../store/authStore'

export function LoginPage() {
  const { signInWithEmail, signInWithGoogle } = useAuthStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmail = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center h="100dvh" px="md">
      <Paper withBorder p="xl" radius="md" w="100%" maw={400}>
        <Stack gap="md">
          <Text size="xl" fw={700} ta="center">
            Logga in
          </Text>

          {sent ? (
            <Alert icon={<IconCheck size={16} />} color="green" title="Kolla din inbox!">
              Vi har skickat en magic link till {email}. Klicka på länken för att logga in.
            </Alert>
          ) : (
            <>
              {error && (
                <Alert color="red" title="Fel">
                  {error}
                </Alert>
              )}

              <TextInput
                label="E-postadress"
                placeholder="din@epost.se"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
              />
              <Button
                leftSection={<IconMail size={16} />}
                onClick={handleEmail}
                loading={loading}
                disabled={!email.trim()}
              >
                Skicka magic link
              </Button>

              <Divider label="eller" labelPosition="center" />

              <Button
                leftSection={<IconBrandGoogle size={16} />}
                variant="default"
                onClick={signInWithGoogle}
              >
                Fortsätt med Google
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Center>
  )
}
