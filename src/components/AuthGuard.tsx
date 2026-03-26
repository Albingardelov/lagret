import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { PageLoader } from './PageLoader'

interface Props {
  children: React.ReactNode
}

export function AuthGuard({ children }: Props) {
  const { user, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [loading, user, navigate])

  if (loading) return <PageLoader />
  if (!user) return null
  return <>{children}</>
}
