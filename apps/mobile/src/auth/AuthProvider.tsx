import { createContext, useContext, useEffect, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import { store } from '@lagret/core'

type AuthState = {
  loading: boolean
  user: { id: string; email?: string } | null
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const { user, loading, initialize, signInWithPassword, signOut } = store.useAuthStore()
  useEffect(() => {
    const unsub = initialize()
    return () => {
      unsub()
    }
  }, [initialize])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      signInWithPassword,
      signOut,
    }),
    [loading, user, signInWithPassword, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
