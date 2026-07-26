import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import AuthOverlay from './AuthOverlay'
import AuthConfirmHandler from './AuthConfirmHandler'
import './App.css'

// STAGE 3 TEST HARNESS — temporary. Tests the full AuthOverlay
// (signup/login/forgot/reset) wired to real auth state.
// Will be replaced by the real App.jsx in Stage 5.

function App() {
  const { session, profile, authReady, lastAuthEvent, logout } = useAuth()
  const [authView, setAuthView] = useState(null)

  useEffect(() => {
    if (lastAuthEvent === 'PASSWORD_RECOVERY') {
      setAuthView('reset')
    }
    if (lastAuthEvent === 'SIGNED_IN') {
      setAuthView((v) => (v === 'reset' ? v : null))
    }
  }, [lastAuthEvent])

  // A password-reset link also redirects here now (so it can carry a pending
  // invite code the same way a confirmation link does), but it needs the
  // existing tested reset flow, not AuthConfirmHandler's signup-confirm UI.
  const isRecoveryLink =
    lastAuthEvent === 'PASSWORD_RECOVERY' ||
    new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'

  if (window.location.pathname === '/auth/confirm' && !isRecoveryLink) {
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', color: '#eee', background: '#111', minHeight: '100vh' }}>
        <AuthConfirmHandler session={session} authReady={authReady} />
      </div>
    )
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
      <h1>Stage 3 — AuthOverlay Test</h1>

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
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button onClick={() => setAuthView('signup')} style={{ padding: '10px 20px' }}>Open Sign Up</button>
          <button onClick={() => setAuthView('login')} style={{ padding: '10px 20px' }}>Open Log In</button>
          <button onClick={() => setAuthView('forgot')} style={{ padding: '10px 20px' }}>Open Forgot Password</button>
        </div>
      )}

      <AuthOverlay view={authView} setView={setAuthView} />
    </div>
  )
}

export default App
