import { useState } from 'react'
import {
  Center,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Divider,
  Alert,
  Paper,
  Anchor,
} from '@mantine/core'
import { IconBrandGoogle, IconMail, IconCheck } from '@tabler/icons-react'
import { useAuthStore } from '../store/authStore'

type Mode = 'login' | 'register' | 'magic'

export function LoginPage() {
  const { signInWithEmail, signInWithPassword, signUpWithPassword, signInWithGoogle } =
    useAuthStore()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (mode === 'login') {
        await signInWithPassword(email.trim(), password)
      } else if (mode === 'register') {
        await signUpWithPassword(email.trim(), password)
        setSent(true)
      } else {
        await signInWithEmail(email.trim())
        setSent(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Något gick fel')
    } finally {
      setLoading(false)
    }
  }

  const resetState = (newMode: Mode) => {
    setMode(newMode)
    setError(null)
    setSent(false)
    setPassword('')
  }

  return (
    <Center h="100dvh" px="md">
      <Paper withBorder p="xl" radius="md" w="100%" maw={400}>
        <Stack gap="md">
          <Text size="xl" fw={700} ta="center">
            {mode === 'register' ? 'Skapa konto' : 'Logga in'}
          </Text>

          {sent ? (
            <Alert
              icon={<IconCheck size={16} />}
              color="green"
              title={mode === 'register' ? 'Konto skapat!' : 'Kolla din inbox!'}
            >
              {mode === 'register'
                ? `Kolla ${email} och bekräfta din e-postadress för att aktivera kontot.`
                : `Vi har skickat en magic link till ${email}.`}
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
                onKeyDown={(e) => e.key === 'Enter' && !password && handleSubmit()}
              />

              {mode !== 'magic' && (
                <PasswordInput
                  label="Lösenord"
                  placeholder="Minst 6 tecken"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              )}

              <Button
                onClick={handleSubmit}
                loading={loading}
                disabled={!email.trim() || (mode !== 'magic' && password.length < 6)}
                fullWidth
              >
                {mode === 'login'
                  ? 'Logga in'
                  : mode === 'register'
                    ? 'Skapa konto'
                    : 'Skicka magic link'}
              </Button>

              <Stack gap={4} align="center">
                {mode === 'login' && (
                  <>
                    <Anchor size="sm" onClick={() => resetState('register')}>
                      Inget konto? Skapa ett här
                    </Anchor>
                    <Anchor size="sm" c="dimmed" onClick={() => resetState('magic')}>
                      Logga in med magic link istället
                    </Anchor>
                  </>
                )}
                {mode === 'register' && (
                  <Anchor size="sm" onClick={() => resetState('login')}>
                    Har du redan ett konto? Logga in
                  </Anchor>
                )}
                {mode === 'magic' && (
                  <Anchor size="sm" onClick={() => resetState('login')}>
                    Tillbaka till lösenordsinloggning
                  </Anchor>
                )}
              </Stack>

              <Divider label="eller" labelPosition="center" />

              <Button
                leftSection={<IconBrandGoogle size={16} />}
                variant="default"
                onClick={signInWithGoogle}
                fullWidth
              >
                Fortsätt med Google
              </Button>

              {mode === 'magic' && (
                <Button
                  leftSection={<IconMail size={16} />}
                  variant="subtle"
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={!email.trim()}
                  fullWidth
                >
                  Skicka magic link
                </Button>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </Center>
  )
}
