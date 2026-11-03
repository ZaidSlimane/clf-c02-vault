import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignInPage() {
  const { user, login, register, logout } = useAuth()
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    // A successful submit navigates by itself, so the panel must not flash first.
    if (submitting) return null
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h1>☁️</h1>
            <h2>Already signed in</h2>
            <p style={{ overflowWrap: 'anywhere' }}>Signed in as {user.email}</p>
          </div>

          <button type="button" className="auth-btn" style={{ width: '100%' }} onClick={() => navigate('/', { replace: true })}>
            Continue to dashboard
          </button>

          <div className="auth-footer">
            <button type="button" className="auth-toggle" onClick={logout}>
              Sign out and use another account
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password)
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>☁️</h1>
          <h2>{isLogin ? 'Sign In' : 'Create Account'}</h2>
          <p>CLF-C02 Study Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <label className="auth-label">
            Email
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </label>

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <button className="auth-toggle" onClick={() => { setIsLogin(!isLogin); setError('') }}>
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
