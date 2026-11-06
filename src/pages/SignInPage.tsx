import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignInPage() {
  const { user, login, register, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const emailInput = useRef<HTMLInputElement>(null)
  const focusEmailOnForm = useRef(false)

  useEffect(() => {
    if (user || !focusEmailOnForm.current) return
    focusEmailOnForm.current = false
    emailInput.current?.focus()
  }, [user])

  if (user) {
    // A successful submit navigates by itself, so the panel must not flash first.
    if (submitting) return null
    return (
      <div className="auth-page">
        <div className="auth-card">
          <span className="wordmark">CLF Vault</span>
          <div className="auth-header">
            <h1>Already signed in</h1>
            <p style={{ overflowWrap: 'anywhere' }}>Signed in as {user.email}</p>
          </div>

          <button type="button" className="auth-btn" style={{ width: '100%' }} onClick={() => navigate('/', { replace: true })}>
            Continue to dashboard
          </button>

          <div className="auth-footer">
            <button type="button" className="auth-toggle" onClick={() => { focusEmailOnForm.current = true; logout() }}>
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
    if (!isLogin && password !== repeatPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register({ firstName, lastName, username, email, password })
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
        <Link to="/welcome" className="wordmark">CLF Vault</Link>
        <div className="auth-header">
          <h1>{isLogin ? 'Sign in' : 'Create your account'}</h1>
          <p className="exam-meta">AWS Cloud Practitioner · CLF-C02</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          {!isLogin && (
            <>
              <div className="auth-row">
              <label className="auth-label">
                First name
                <input
                  className="auth-input"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  maxLength={50}
                  autoComplete="given-name"
                />
              </label>

              <label className="auth-label">
                Last name
                <input
                  className="auth-input"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  maxLength={50}
                  autoComplete="family-name"
                />
              </label>
              </div>

              <label className="auth-label">
                Username
                <input
                  className="auth-input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  title="Letters, numbers and underscores"
                  autoComplete="username"
                />
              </label>
            </>
          )}

          <label className="auth-label">
            {isLogin ? 'Username or email' : 'Email'}
            <input
              ref={emailInput}
              type={isLogin ? 'text' : 'email'}
              className="auth-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete={isLogin ? 'username' : 'email'}
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
              minLength={isLogin ? undefined : 12}
              aria-describedby={isLogin ? undefined : 'password-rules'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </label>

          {!isLogin && (
            <>
              <p id="password-rules" className="auth-hint">
                At least 12 characters with upper and lower case letters, a number and a symbol.
              </p>

              <label className="auth-label">
                Repeat password
                <input
                  type="password"
                  className="auth-input"
                  value={repeatPassword}
                  onChange={e => setRepeatPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </label>
            </>
          )}

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Please wait' : isLogin ? 'Sign in' : 'Create account'}
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
