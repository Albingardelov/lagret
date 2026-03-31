import { useEffect } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { store } from '@lagret/core'

export function InventoryScreen() {
  const { colors } = useTheme()
  const { household, households, fetchHouseholds } = store.useHouseholdStore()
  const { items, fetchItems } = store.useInventoryStore()

  useEffect(() => {
    if (!household) return
    fetchItems().catch(() => {})
  }, [household, fetchItems])
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

      <Pressable
        disabled={!household}
        onPress={() => {
          if (!household) return
          fetchItems().catch(() => {})
        }}
        style={{
          alignSelf: 'flex-start',
          backgroundColor: household ? colors.terraSoft : 'rgba(181,67,42,0.05)',
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
        }}
      >
        <Text
          style={{
            color: household ? colors.terra : colors.mutedText,
            fontWeight: '700',
          }}
        >
          Ladda varor
        </Text>
      </Pressable>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 20, gap: 10 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 12,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '800' }}>{item.name}</Text>
            <Text style={{ color: colors.mutedText, marginTop: 2, fontSize: 12 }}>
              {item.quantity} {item.unit}
            </Text>
          </View>
        )}
      />
    </View>
  )
}
