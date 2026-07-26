import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// Central auth state: initial session + live updates, with cleanup.
// authReady only flips true once the initial session check has resolved,
// so the app never briefly flashes a "logged out" screen for a logged-in user.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [lastAuthEvent, setLastAuthEvent] = useState(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setAuthReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      setLastAuthEvent(event)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      if (!session) {
        setProfile(null)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (mounted && !error) setProfile(data)
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [session])

  async function logout() {
    await supabase.auth.signOut()
  }

  return { session, profile, authReady, lastAuthEvent, logout }
}