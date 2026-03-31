import { useEffect, useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { store } from '@lagret/core'
import { useTheme } from '../theme/ThemeProvider'

export function ShoppingScreen() {
  const { colors } = useTheme()
  const household = store.useHouseholdStore((s) => s.household)
  const { items, fetchItems, addItem, toggleBought, clearBought } = store.useShoppingStore()
  const [name, setName] = useState('')

  useEffect(() => {
    if (!household) return
    fetchItems().catch(() => {})
  }, [household, fetchItems])

  const canAdd = useMemo(() => name.trim().length > 0, [name])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, gap: 10 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Inköp</Text>

      <Text style={{ color: colors.mutedText, fontSize: 13 }}>
        Aktivt hushåll: {household?.name ?? '—'}
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Lägg till vara"
          placeholderTextColor={colors.mutedText}
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: colors.text,
          }}
        />
        <Pressable
          disabled={!household || !canAdd}
          onPress={() => {
            if (!household) return
            const trimmed = name.trim()
            if (!trimmed) return
            addItem(trimmed)
              .then(() => setName(''))
              .catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : 'Okänt fel'
                Alert.alert('Kunde inte lägga till', msg)
              })
          }}
          style={{
            backgroundColor: household && canAdd ? colors.terra : 'rgba(181,67,42,0.45)',
            paddingHorizontal: 14,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '800' }}>+</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          disabled={!household}
          onPress={() => {
            if (!household) return
            fetchItems().catch(() => {})
          }}
          style={{
            backgroundColor: household ? colors.terraSoft : 'rgba(181,67,42,0.05)',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: household ? colors.terra : colors.mutedText, fontWeight: '700' }}>
            Uppdatera
          </Text>
        </Pressable>

        <Pressable
          disabled={!household}
          onPress={() => {
            if (!household) return
            clearBought().catch((e: unknown) => {
              const msg = e instanceof Error ? e.message : 'Okänt fel'
              Alert.alert('Kunde inte rensa', msg)
            })
          }}
          style={{
            backgroundColor: household ? colors.terraSoft : 'rgba(181,67,42,0.05)',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: household ? colors.terra : colors.mutedText, fontWeight: '700' }}>
            Rensa köpta
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 20, gap: 10 }}
        renderItem={({ item }) => {
          const muted = item.isBought
          return (
            <Pressable
              onPress={() => toggleBought(item.id).catch(() => {})}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 12,
                opacity: muted ? 0.6 : 1,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>{item.name}</Text>
              <Text style={{ color: colors.mutedText, marginTop: 2, fontSize: 12 }}>
                {item.quantity} {item.unit}
              </Text>
            </Pressable>
          )
        }}
      />
    </View>
  )
}
