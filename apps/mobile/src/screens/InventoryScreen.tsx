import { Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'

export function InventoryScreen() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Lagret</Text>
    </View>
  )
}
