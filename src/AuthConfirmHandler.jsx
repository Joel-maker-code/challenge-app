import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Supabase reports an expired/invalid/already-used confirmation link as an
// error in the URL hash — no session is ever created, so useAuth never sees
// an event for it. Read it directly, once, before we strip the hash.
function readHash() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const error = hash.get('error')
  return {
    error: error ? (hash.get('error_description') || '').replace(/\+/g, ' ') || 'This link is invalid or has expired.' : null,
    hadToken: hash.has('access_token'),
  }
}

// A pending invite reaches this page as ?join=CODE (carried through by the
// emailRedirectTo set at signup) or, failing that, from an earlier visit
// stored in localStorage. Whichever is found is written back to localStorage
// so the rest of the app has one place to read it from — joining the
// challenge itself happens later, elsewhere.
function resolvePendingInvite() {
  const fromQuery = new URLSearchParams(window.location.search).get('join')
  if (fromQuery) {
    localStorage.setItem('pendingInviteCode', fromQuery)
    return fromQuery
  }
  return localStorage.getItem('pendingInviteCode')
}

function ResendForm({ email, setEmail, onSubmit, resending, error, status }) {
  return (
    <>
      <p className="auth-switch">Enter your email and we'll send a new confirmation link.</p>
      <form onSubmit={onSubmit} className="auth-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={resending}>
          {resending ? 'Sending...' : 'Resend confirmation email'}
        </button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      {status && <p className="auth-message">{status}</p>}
    </>
  )
}

function AuthConfirmHandler({ session, authReady }) {
  const [{ error: linkError, hadToken }] = useState(readHash)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState('')
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  const inviteCode = !linkError && hadToken && session ? resolvePendingInvite() : null

  async function handleResend(e) {
    e.preventDefault()
    setResendStatus('')
    setResendError('')
    setResending(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email: resendEmail })
    setResending(false)
    if (error) setResendError(error.message)
    else setResendStatus('Confirmation email sent — check your inbox.')
  }

  const resendProps = {
    email: resendEmail,
    setEmail: setResendEmail,
    onSubmit: handleResend,
    resending,
    error: resendError,
    status: resendStatus,
  }

  if (linkError) {
    return (
      <div className="auth-card">
        <h2>Link expired</h2>
        <p className="auth-error">{linkError}</p>
        <ResendForm {...resendProps} />
      </div>
    )
  }

  if (!hadToken) {
    return (
      <div className="auth-card">
        <h2>Nothing to confirm</h2>
        <p className="auth-switch">
          This page confirms an account from a link in your email. If you got here another way, go back and use the
          link from the confirmation email instead.
        </p>
      </div>
    )
  }

  if (!authReady) {
    return (
      <div className="auth-card">
        <p>Confirming...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="auth-card">
        <h2>Couldn't confirm this link</h2>
        <p className="auth-error">This link may already have been used.</p>
        <ResendForm {...resendProps} />
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h2>Email confirmed</h2>
      <p className="auth-message">Your account is ready — you're logged in as {session.user.email}.</p>
      {inviteCode && (
        <p className="auth-switch">
          You have a pending invite (code: <strong>{inviteCode}</strong>). Head back to the app to join the
          challenge.
        </p>
      )}
    </div>
  )
}

export default AuthConfirmHandler
