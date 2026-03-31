import { useAuth } from './AuthProvider'
import { Tabs } from '../navigation/Tabs'
import { PageLoader } from '../components/PageLoader'
import { LoginScreen } from '../screens/LoginScreen'

export function AuthGate() {
  const { loading, user } = useAuth()

  if (loading) return <PageLoader />
  if (!user) return <LoginScreen />
  return <Tabs />
}
