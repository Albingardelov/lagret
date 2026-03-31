import { useEffect } from 'react'
import { Alert, FlatList, Pressable, Text, View } from 'react-native'
import { store } from '@lagret/core'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../theme/ThemeProvider'

export function HouseholdScreen() {
  const { colors } = useTheme()
  const { signOut } = useAuth()
  const { households, household, members, fetchHouseholds, setActiveHousehold } =
    store.useHouseholdStore()

  useEffect(() => {
    fetchHouseholds().catch(() => {})
  }, [fetchHouseholds])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Hushåll</Text>

      <Text style={{ color: colors.mutedText, fontSize: 13 }}>
        Aktivt hushåll: {household?.name ?? '—'}
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
        <Text style={{ color: colors.terra, fontWeight: '700' }}>Uppdatera hushåll</Text>
      </Pressable>

      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>Välj hushåll</Text>
        <FlatList
          data={households}
          keyExtractor={(h) => h.id}
          horizontal
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => {
            const active = item.id === household?.id
            return (
              <Pressable
                onPress={() =>
                  setActiveHousehold(item.id).catch((e: unknown) => {
                    const msg = e instanceof Error ? e.message : 'Okänt fel'
                    Alert.alert('Kunde inte byta hushåll', msg)
                  })
                }
                style={{
                  backgroundColor: active ? colors.terraSoft : colors.surface,
                  borderColor: active ? 'rgba(181,67,42,0.3)' : colors.border,
                  borderWidth: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: active ? colors.terra : colors.text, fontWeight: '800' }}>
                  {item.name}
                </Text>
              </Pressable>
            )
          }}
        />
      </View>

      <View style={{ gap: 8, flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>Medlemmar</Text>
        <FlatList
          data={members}
          keyExtractor={(m) => m.userId}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
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
              <Text style={{ color: colors.text, fontWeight: '800' }}>{item.email}</Text>
            </View>
          )}
        />
      </View>

      <Pressable
        onPress={() =>
          signOut().catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : 'Okänt fel'
            Alert.alert('Kunde inte logga ut', msg)
          })
        }
        style={{
          alignSelf: 'flex-start',
          backgroundColor: colors.terraSoft,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: colors.terra, fontWeight: '700' }}>Logga ut</Text>
      </Pressable>
    </View>
  )
}
