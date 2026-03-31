import { Pressable, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { store } from '@lagret/core'

export function InventoryScreen() {
  const { colors } = useTheme()
  const { household, households, fetchHouseholds } = store.useHouseholdStore()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, gap: 10 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Lagret</Text>

      <Text style={{ color: colors.mutedText, fontSize: 13 }}>
        Aktivt hushåll: {household?.name ?? '—'} ({households.length})
      </Text>

      <Pressable
        onPress={() => fetchHouseholds().catch(() => {})}
        style={{
          alignSelf: 'flex-start',
          backgroundColor: colors.terraSoft,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: colors.terra, fontWeight: '700' }}>Ladda hushåll</Text>
      </Pressable>
    </View>
  )
}
