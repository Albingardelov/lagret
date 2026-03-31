import { Pressable, Text, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../theme/ThemeProvider'

export function HouseholdScreen() {
  const { colors } = useTheme()
  const { signOut } = useAuth()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Hushåll</Text>

      <Pressable
        onPress={signOut}
        style={{
          alignSelf: 'flex-start',
          backgroundColor: colors.terraSoft,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: colors.terra, fontWeight: '700' }}>Logga ut (dev)</Text>
      </Pressable>
    </View>
  )
}
