import { useMemo, useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../theme/ThemeProvider'

export function LoginScreen() {
  const { colors } = useTheme()
  const { signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20, justifyContent: 'center' }}>
      <Text
        style={{
          color: colors.terra,
          fontSize: 28,
          fontWeight: '800',
          letterSpacing: -0.4,
          marginBottom: 8,
        }}
      >
        Lagret
      </Text>
      <Text style={{ color: colors.mutedText, fontSize: 14, marginBottom: 16 }}>
        Logga in för att fortsätta
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={colors.mutedText}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 10,
          color: colors.text,
        }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Lösenord"
        placeholderTextColor={colors.mutedText}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 14,
          color: colors.text,
        }}
      />

      <Pressable
        disabled={!canSubmit}
        onPress={() => {
          signInWithPassword(email.trim(), password).catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : 'Okänt fel'
            Alert.alert('Inloggning misslyckades', msg)
          })
        }}
        style={{
          backgroundColor: canSubmit ? colors.terra : 'rgba(181,67,42,0.45)',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 999,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>Logga in</Text>
      </Pressable>
    </View>
  )
}
