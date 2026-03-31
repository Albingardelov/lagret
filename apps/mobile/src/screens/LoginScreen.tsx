import { Pressable, Text, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../theme/ThemeProvider'

export function LoginScreen() {
  const { colors } = useTheme()
  const { signIn } = useAuth()

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

      <Pressable
        onPress={signIn}
        style={{
          backgroundColor: colors.terra,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 999,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>Logga in (dev)</Text>
      </Pressable>
    </View>
  )
}
