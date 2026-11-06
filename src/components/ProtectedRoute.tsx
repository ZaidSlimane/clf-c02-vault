import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  if (loading) return null
  if (!user) return <Navigate to={pathname === '/' ? '/welcome' : '/signin'} replace />
  return <>{children}</>
}
