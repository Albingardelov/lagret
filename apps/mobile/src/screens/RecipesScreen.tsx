import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  getRecentRecipes,
  recipeMatching,
  searchRecipes,
  store,
  suggestRecipes,
} from '@lagret/core'
import { useTheme } from '../theme/ThemeProvider'

export function RecipesScreen() {
  const { colors } = useTheme()
  const inventoryNames = store.useInventoryStore((s) => s.items.map((i) => i.name))
  const addShoppingItem = store.useShoppingStore((s) => s.addItem)

  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<recipeMatching.RecipeMatch[]>([])
  const [selected, setSelected] = useState<recipeMatching.RecipeMatch | null>(null)

  useEffect(() => {
    setLoading(true)
    getRecentRecipes()
      .then((recipes) => setMatches(recipeMatching.matchRecipes(recipes, inventoryNames)))
      .catch(() => {})
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => matches, [matches])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, gap: 10 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Recept</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Sök recept, ingredienser..."
        placeholderTextColor={colors.mutedText}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.text,
        }}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={() => {
            if (!query.trim()) return
            setLoading(true)
            searchRecipes(query.trim())
              .then((recipes) => setMatches(recipeMatching.matchRecipes(recipes, inventoryNames)))
              .catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : 'Okänt fel'
                Alert.alert('Sökning misslyckades', msg)
              })
              .finally(() => setLoading(false))
          }}
          style={{
            backgroundColor: colors.terra,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '800' }}>Sök</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setLoading(true)
            suggestRecipes(inventoryNames)
              .then((recipes) => setMatches(recipeMatching.matchRecipes(recipes, inventoryNames)))
              .catch((e: unknown) => {
                const msg = e instanceof Error ? e.message : 'Okänt fel'
                Alert.alert('Kunde inte föreslå', msg)
              })
              .finally(() => setLoading(false))
          }}
          style={{
            backgroundColor: colors.terraSoft,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: colors.terra, fontWeight: '800' }}>Föreslå från lager</Text>
        </Pressable>
      </View>

      {loading && (
        <View style={{ paddingVertical: 20 }}>
          <ActivityIndicator color={colors.terra} />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(m) => String(m.recipe.id)}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 20, gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelected(item)}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 12,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '900' }}>
              {item.recipe.name ?? 'Recept'}
            </Text>
            <Text style={{ color: colors.mutedText, marginTop: 2, fontSize: 12 }}>
              Saknar {item.missing.length} • Har {item.matched.length}
            </Text>
          </Pressable>
        )}
      />

      <RecipeModal
        open={!!selected}
        match={selected}
        onClose={() => setSelected(null)}
        onAddMissing={() => {
          if (!selected || selected.missing.length === 0) return
          Promise.all(
            selected.missing.map((ingredient) =>
              addShoppingItem(ingredient).catch(() => {
                // ignore per-item
              })
            )
          )
            .then(() => Alert.alert('Klart', 'Saknade ingredienser lades till i inköpslistan'))
            .catch(() => {})
        }}
      />
    </View>
  )
}

function RecipeModal({
  open,
  match,
  onClose,
  onAddMissing,
}: {
  open: boolean
  match: recipeMatching.RecipeMatch | null
  onClose: () => void
  onAddMissing: () => void
}) {
  const { colors } = useTheme()
  const recipe = match?.recipe ?? null

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ padding: 16, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>
            {recipe?.name ?? 'Recept'}
          </Text>
          <Pressable onPress={onClose} style={{ position: 'absolute', right: 16, top: 16 }}>
            <Text style={{ color: colors.terra, fontWeight: '800' }}>Stäng</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          {match && (
            <>
              <Text style={{ color: colors.text, fontWeight: '800' }}>Ingredienser</Text>
              {recipeMatching.getAllIngredients(match.recipe).map((ing, idx) => {
                const have = match.matched.some((m) => recipeMatching.ingredientsMatch(m, ing))
                return (
                  <Text key={idx} style={{ color: have ? colors.text : colors.mutedText }}>
                    {have ? '✓ ' : '• '}
                    {ing}
                  </Text>
                )
              })}

              {match.missing.length > 0 && (
                <Pressable
                  onPress={onAddMissing}
                  style={{
                    backgroundColor: colors.terra,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '900' }}>
                    Lägg saknade i inköpslista
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}
