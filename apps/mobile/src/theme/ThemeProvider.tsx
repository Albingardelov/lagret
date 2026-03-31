import { createContext, useContext, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import { colors } from './colors'

type Theme = {
  colors: typeof colors
}

const ThemeContext = createContext<Theme | null>(null)

export function ThemeProvider({ children }: PropsWithChildren) {
  const value = useMemo<Theme>(() => ({ colors }), [])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
