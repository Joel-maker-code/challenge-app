import { useState } from 'react'
import { supabase } from './supabaseClient'

// Signup / Login / Forgot-password / Reset-password, as one overlay.
// `view` controls which form shows; `setView(null)` closes it.
function AuthOverlay({ view, setView }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function reset() {
    setError('')
    setMessage('')
  }

  async function handleSignUp(e) {
    e.preventDefault()
    reset()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setMessage('Check your email to confirm your account, then come back and log in.')
  }

  async function handleLogIn(e) {
    e.preventDefault()
    reset()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleForgot(e) {
    e.preventDefault()
    reset()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setMessage('Check your email for a password reset link.')
  }

  async function handleReset(e) {
    e.preventDefault()
    reset()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password updated. You are now logged in.')
      setTimeout(() => setView(null), 1500)
    }
  }

  if (!view) return null

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {view !== 'reset' && (
          <button type="button" className="back-btn" onClick={() => setView(null)}>← Close</button>
        )}

        {view === 'signup' && (
          <>
            <h2>Sign Up</h2>
            <form onSubmit={handleSignUp} className="auth-form">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              <tton type="submit" disabled={loading}>{loading ? 'Signing up...' : 'Sign Up'}</button>
            </form>
            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-message">{message}</p>}
            <p className="auth-switch">
              Already have an account?{' '}
              <button type="button" className="inline-link" onClick={() => { setView('login'); reset() }}>Log in</button>
            </p>
          </>
        )}

        {view === 'login' && (
          <>
            <h2>Log In</h2>
            <form onSubmit={handleLogIn} className="auth-form">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Log In'}</button>
            </form>
            {error && <p className="auth-error">{error}</p>}
            <p className="auth-switch">
              <button type="button" className="inline-link" onClick={() => { setView('forgot'); reset() }}>Forgot password?</button>
            </p>
            <p className="auth-switch">
              No account?{' '}
              <button type="button" className="inline-link" onClick={() => { setView('signup'); reset() }}>Sign up</button>
            </p>
          </>
        )}

        {view === 'forgot' && (
          <>
            <h2>Reset Password</h2>
            <form onSubmit={handleForgot} className="auth-form">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
            </form>
            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-message">{message}</p>}
            <p className="auth-switch">
              <button type="button" className="inline-link" onClick={() => { setView('login'); reset() }}>Back to log in</button>
            </p>
          </>
        )}

        {view === 'reset' && (
          <>
            <h2>Set New Password</h2>
            <p className="auth-switch">You clicked a password reset link. Choose a new password below.</p>
            <form onSubmit={handleReset} className="auth-form">
              <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              <button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update password'}</button>
            </form>
            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-message">{message}</p>}
          </>
        )}
      </div>
    </div>
  )
}

export default AuthOverlay
