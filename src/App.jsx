import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function getJoinCodeFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('join')
}

function App() {
  const [challenges, setChallenges] = useState([])
  const [newChallengeName, setNewChallengeName] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedChallenge, setSelectedChallenge] = useState(null)

  useEffect(() => {
    loadChallenges()
  }, [])

  useEffect(() => {
    const code = getJoinCodeFromUrl()
    if (code && challenges.length > 0) {
      const match = challenges.find((c) => c.invite_code === code)
      if (match) setSelectedChallenge(match)
    }
  }, [challenges])

  async function loadChallenges() {
    setLoading(true)
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error loading challenges:', error)
    else setChallenges(data)
    setLoading(false)
  }

  async function createChallenge(e) {
    e.preventDefault()
    if (!newChallengeName.trim()) return

    const { error } = await supabase
      .from('challenges')
      .insert([{ name: newChallengeName }])

    if (error) {
      console.error('Error creating challenge:', error)
      alert('Something went wrong creating the challenge.')
    } else {
      setNewChallengeName('')
      loadChallenges()
    }
  }

  function goToChallenge(c) {
    setSelectedChallenge(c)
    const url = new URL(window.location)
    url.searchParams.set('join', c.invite_code)
    window.history.pushState({}, '', url)
  }

  function backToList() {
    setSelectedChallenge(null)
    const url = new URL(window.location)
    url.searchParams.delete('join')
    window.history.pushState({}, '', url)
  }

  if (selectedChallenge) {
    return <ChallengeDetail challenge={selectedChallenge} onBack={backToList} />
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Group Challenges</h1>
        <p className="subtitle">Create a challenge, share the link, keep each other honest.</p>

        <form onSubmit={createChallenge} className="create-form">
          <input
            type="text"
            placeholder="e.g. 30-Day Push-up Challenge"
            value={newChallengeName}
            onChange={(e) => setNewChallengeName(e.target.value)}
          />
          <button type="submit">Create Challenge</button>
        </form>

        <h2>Active Challenges</h2>
        {loading ? (
          <p>Loading...</p>
        ) : challenges.length === 0 ? (
          <p className="empty">No challenges yet — create the first one above.</p>
        ) : (
          <ul className="challenge-list">
            {challenges.map((c) => (
              <li key={c.id} onClick={() => goToChallenge(c)} className="challenge-item">
                <strong>{c.name}</strong>
                <span className="code">Code: {c.invite_code}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ChallengeDetail({ challenge, onBack }) {
  const [name, setName] = useState('')
  const [participants, setParticipants] = useState([])
  const [myParticipantId, setMyParticipantId] = useState(
    localStorage.getItem(`participant_${challenge.id}`)
  )
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadParticipants()
  }, [])

  async function loadParticipants() {
    setLoading(true)
    const { data: participantsData, error } = await supabase
      .from('participants')
      .select('*, checkins(id)')
      .eq('challenge_id', challenge.id)

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const withCounts = participantsData
      .map((p) => ({ ...p, checkinCount: p.checkins.length }))
      .sort((a, b) => b.checkinCount - a.checkinCount)

    setParticipants(withCounts)
    setLoading(false)
  }

  async function joinChallenge(e) {
    e.preventDefault()
    if (!name.trim()) return

    const { data, error } = await supabase
      .from('participants')
      .insert([{ challenge_id: challenge.id, name }])
      .select()
      .single()

    if (error) {
      console.error(error)
      alert('Something went wrong joining.')
      return
    }

    localStorage.setItem(`participant_${challenge.id}`, data.id)
    setMyParticipantId(data.id)
    loadParticipants()
  }

  async function checkIn() {
    const { error } = await supabase
      .from('checkins')
      .insert([{ participant_id: myParticipantId }])

    if (error) {
      console.error(error)
      alert('Something went wrong checking in.')
    } else {
      loadParticipants()
    }
  }

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}?join=${challenge.invite_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const me = participants.find((p) => p.id === myParticipantId)

  return (
    <div className="page">
      <div className="card">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>{challenge.name}</h1>

        <button onClick={copyLink} className="copy-btn">
          {copied ? '✅ Link copied!' : '🔗 Copy invite link'}
        </button>

        {!myParticipantId ? (
          <form onSubmit={joinChallenge} className="join-form">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit">Join Challenge</button>
          </form>
        ) : (
          <div className="checkin-box">
            <p>You're in! Streak so far: <strong>{me ? me.checkinCount : 0}</strong> check-ins</p>
            <button onClick={checkIn} className="checkin-btn">
              ✅ I completed today's challenge
            </button>
          </div>
        )}

        <h2>Leaderboard</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ol className="leaderboard">
            {participants.map((p) => (
              <li key={p.id}>
                <span>{p.name}</span>
                <span className="score">{p.checkinCount}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export default App