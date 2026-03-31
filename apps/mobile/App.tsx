import 'react-native-gesture-handler'

import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StyleSheet } from 'react-native'

import { AuthProvider } from './src/auth/AuthProvider'
import { AuthGate } from './src/auth/AuthGate'
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider'

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}

function AppShell() {
  const { colors } = useTheme()

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: colors.terra,
          background: colors.bg,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.terra,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      <StatusBar style="dark" />
      <AuthGate />
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
