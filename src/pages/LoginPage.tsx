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
import { IconBrandGoogle, IconCheck, IconMail } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'

type Mode = 'login' | 'register' | 'magic'

export function LoginPage() {
  const { signInWithEmail, signInWithPassword, signUpWithPassword, signInWithGoogle } =
    useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()
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
        navigate('/', { replace: true })
      } else if (mode === 'register') {
        await signUpWithPassword(email.trim(), password)
        setSent(true)
      } else {
        await signInWithEmail(email.trim())
        setSent(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.errors.unknownError'))
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
            {mode === 'register' ? t('login.createAccount') : t('login.signIn')}
          </Text>

          {sent ? (
            <Alert
              icon={<IconCheck size={16} />}
              color="green"
              title={mode === 'register' ? t('login.accountCreated') : t('login.checkInbox')}
            >
              {mode === 'register'
                ? t('login.confirmEmail', { email })
                : t('login.magicLinkSent', { email })}
            </Alert>
          ) : (
            <>
              {error && (
                <Alert color="red" title={t('errors.label')}>
                  {error}
                </Alert>
              )}

              <TextInput
                label={t('common.fields.email')}
                placeholder="din@epost.se"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && !password && handleSubmit()}
              />

              {mode !== 'magic' && (
                <PasswordInput
                  label={t('common.fields.password')}
                  placeholder={t('login.passwordPlaceholder')}
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
                  ? t('login.signIn')
                  : mode === 'register'
                    ? t('login.createAccount')
                    : t('login.magicLink')}
              </Button>

              <Stack gap={4} align="center">
                {mode === 'login' && (
                  <>
                    <Anchor size="sm" onClick={() => resetState('register')}>
                      {t('login.noAccount')}
                    </Anchor>
                    <Anchor size="sm" c="dimmed" onClick={() => resetState('magic')}>
                      {t('login.useMagicLink')}
                    </Anchor>
                  </>
                )}
                {mode === 'register' && (
                  <Anchor size="sm" onClick={() => resetState('login')}>
                    {t('login.haveAccount')}
                  </Anchor>
                )}
                {mode === 'magic' && (
                  <Anchor size="sm" onClick={() => resetState('login')}>
                    {t('login.backToPassword')}
                  </Anchor>
                )}
              </Stack>

              <Divider label={t('common.or')} labelPosition="center" />

              <Button
                leftSection={<IconBrandGoogle size={16} />}
                variant="default"
                onClick={signInWithGoogle}
                fullWidth
              >
                {t('login.continueWithGoogle')}
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
                  {t('login.magicLink')}
                </Button>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </Center>
  )
}
