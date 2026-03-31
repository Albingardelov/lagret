import { ActivityIndicator, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'

export function PageLoader() {
  const { colors } = useTheme()
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
      }}
    >
      <ActivityIndicator color={colors.terra} />
    </View>
  )
}
