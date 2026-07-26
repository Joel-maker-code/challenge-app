import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './useAuth'
import './App.css'

// STAGE 2 TEST HARNESS — temporary, minimal, auth-only.
// This will be replaced by the real App.jsx once Stages 3-5 are built and tested.

function App() {
  const { session, profile, authReady, lastAuthEvent, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signup')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setMessage('Signed up. Check your email to confirm, then log in below.')
  }

  async function handleLogIn(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  if (!authReady) {
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', color: '#eee', background: '#111', minHeight: '100vh' }}>
        Loading auth state...
      </div>
    )
  }

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', color: '#eee', background: '#111', minHeight: '100vh' }}>
      <h1>Stage 2 — Auth Test Harness</h1>

      <p>authReady: <strong>{String(authReady)}</strong></p>
      <p>lastAuthEvent: <strong>{lastAuthEvent || '(none yet)'}</strong></p>
      <p>session: <strong>{session ? session.user.email : 'null'}</strong></p>
      <p>profile: <strong>{profile ? JSON.stringify(profile) : 'null'}</strong></p>

      {session ? (
        <div style={{ marginTop: 20 }}>
          <p>Logged in as {session.user.email}</p>
          <button onClick={logout} style={{ padding: '10px 20px' }}>Log Out</button>
        </div>
      ) : (
        <div style={{ marginTop: 20, maxWidth: 320 }}>
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => setMode('signup')} style={{ marginRight: 8, fontWeight: mode === 'signup' ? 'bold' : 'normal' }}>Sign Up</button>
            <button onClick={() => setMode('login')} style={{ fontWeight: mode === 'login' ? 'bold' : 'normal' }}>Log In</button>
          </div>

          <form onSubmit={mode === 'signup' ? handleSignUp : handleLogIn} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: 8 }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: 8 }}
              required
              minLength={6}
            />
            <button type="submit" style={{ padding: 10 }}>
              {mode === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          {error && <p style={{ color: '#ff8a6a' }}>{error}</p>}
          {message && <p style={{ color: '#6fbf7a' }}>{message}</p>}
        </div>
      )}
    </div>
  )
}

export default App
