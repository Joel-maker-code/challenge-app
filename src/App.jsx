import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function getJoinCodeFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('join')
}

function dayKey(iso) {
  return new Date(iso).toDateString()
}

function computeStreak(checkins) {
  if (!checkins || checkins.length === 0) return 0
  const days = new Set(checkins.map((c) => dayKey(c.checked_in_at)))
  let streak = 0
  let cursor = new Date()
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (days.has(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function hasCheckedInToday(checkins) {
  if (!checkins || checkins.length === 0) return false
  return checkins.some((c) => dayKey(c.checked_in_at) === new Date().toDateString())
}

function missedRecently(checkins) {
  if (!checkins || checkins.length === 0) return false
  const days = new Set(checkins.map((c) => dayKey(c.checked_in_at)))
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  return !days.has(today.toDateString()) && !days.has(yesterday.toDateString())
}

function App() {
  const [challenges, setChallenges] = useState([])
  const [newChallengeName, setNewChallengeName] = useState('')
  const [newRules, setNewRules] = useState('')
  const [newPrize, setNewPrize] = useState('')
  const [showExtra, setShowExtra] = useState(false)
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

    const token = crypto.randomUUID()

    const { data, error } = await supabase
      .from('challenges')
      .insert([{
        name: newChallengeName,
        rules: newRules || null,
        prize_pool: newPrize || null,
        creator_token: token,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating challenge:', error)
      alert('Something went wrong creating the challenge.')
    } else {
      localStorage.setItem('creator_' + data.id, token)
      setNewChallengeName('')
      setNewRules('')
      setNewPrize('')
      setShowExtra(false)
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
    loadChallenges()
  }

  if (selectedChallenge) {
    return <ChallengeDetail challenge={selectedChallenge} onBack={backToList} />
  }

  return (
    <div className="page">
      <div className="card">
        <p className="brand-eyebrow">No spreadsheets. No excuses.</p>
        <h1>GROUP CHALLENGES</h1>
        <p className="subtitle">Create a challenge, share the link, keep each other honest.</p>

        <form onSubmit={createChallenge} className="create-form-wrap">
          <div className="create-form">
            <input
              type="text"
              placeholder="e.g. 30-Day Push-up Challenge"
              value={newChallengeName}
              onChange={(e) => setNewChallengeName(e.target.value)}
            />
            <button type="submit">Create Challenge</button>
          </div>

          <button
            type="button"
            className="toggle-link"
            onClick={() => setShowExtra(!showExtra)}
          >
            {showExtra ? '− Hide rules & prize pool' : '+ Add rules & prize pool (optional)'}
          </button>

          {showExtra && (
            <div className="extra-fields">
              <textarea
                placeholder="Rules, e.g. 50 push-ups a day, 6 days a week"
                value={newRules}
                onChange={(e) => setNewRules(e.target.value)}
              />
              <input
                type="text"
                placeholder="Prize pool, e.g. $20 each, loser buys beers"
                value={newPrize}
                onChange={(e) => setNewPrize(e.target.value)}
              />
            </div>
          )}
        </form>

        <h2>Active Challenges</h2>
        {loading ? (
          <p>Loading...</p>
        ) : challenges.length === 0 ? (
          <p className="empty">Nobody's started one yet. Be first.</p>
        ) : (
          <ul className="challenge-list">
            {challenges.map((c) => (
              <li key={c.id} onClick={() => goToChallenge(c)} className="challenge-item">
                <strong>{c.name}</strong>
                <span className="code">Code: {c.invite_code}</span>
                {c.prize_pool && <span className="prize-badge">Prize: {c.prize_pool}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ChallengeDetail({ challenge: initialChallenge, onBack }) {
  const [challenge, setChallenge] = useState(initialChallenge)
  const [name, setName] = useState('')
  const [participants, setParticipants] = useState([])
  const [myParticipantId, setMyParticipantId] = useState(
    localStorage.getItem('participant_' + initialChallenge.id)
  )
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(challenge.name)
  const [editRules, setEditRules] = useState(challenge.rules || '')
  const [editPrize, setEditPrize] = useState(challenge.prize_pool || '')
  const [viewingPhoto, setViewingPhoto] = useState(null)

  const isCreator =
    challenge.creator_token &&
    localStorage.getItem('creator_' + challenge.id) === challenge.creator_token

  useEffect(() => {
    loadParticipants()
  }, [])

  async function loadParticipants() {
    setLoading(true)
    const { data: participantsData, error } = await supabase
      .from('participants')
      .select('*, checkins(id, checked_in_at, photo_url)')
      .eq('challenge_id', challenge.id)

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const withStats = participantsData
      .map((p) => ({
        ...p,
        checkinCount: p.checkins.length,
        streak: computeStreak(p.checkins),
        checkedInToday: hasCheckedInToday(p.checkins),
        missed: missedRecently(p.checkins),
      }))
      .sort((a, b) => b.streak - a.streak || b.checkinCount - a.checkinCount)

    setParticipants(withStats)
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

    localStorage.setItem('participant_' + challenge.id, data.id)
    setMyParticipantId(data.id)
    loadParticipants()
  }

  async function leaveChallenge() {
    if (!confirm('Leave this challenge? Your check-ins will be removed.')) return

    const { error } = await supabase.rpc('leave_challenge', {
      p_participant_id: myParticipantId,
    })

    if (error) {
      console.error(error)
      alert('Something went wrong leaving.')
      return
    }

    localStorage.removeItem('participant_' + challenge.id)
    setMyParticipantId(null)
    setName('')
    loadParticipants()
  }

  async function checkIn() {
    setUploading(true)
    let photo_url = null

    if (photoFile) {
      const safeName = photoFile.name.replace(/[^a-zA-Z0-9.]/g, '_')
      const filePath = myParticipantId + '/' + Date.now() + '-' + safeName
      const { error: uploadError } = await supabase.storage
        .from('checkin-photos')
        .upload(filePath, photoFile)

      if (uploadError) {
        console.error(uploadError)
        alert('Photo upload failed, logging your check-in without it.')
      } else {
        const { data: urlData } = supabase.storage
          .from('checkin-photos')
          .getPublicUrl(filePath)
        photo_url = urlData.publicUrl
      }
    }

    const { error } = await supabase
      .from('checkins')
      .insert([{ participant_id: myParticipantId, photo_url }])

    if (error) {
      console.error(error)
      alert('Something went wrong checking in.')
    } else {
      setPhotoFile(null)
      loadParticipants()
    }
    setUploading(false)
  }

  function copyLink() {
    const url = window.location.origin + window.location.pathname + '?join=' + challenge.invite_code
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveEdit(e) {
    e.preventDefault()
    const token = localStorage.getItem('creator_' + challenge.id)

    const { error } = await supabase.rpc('update_challenge', {
      p_challenge_id: challenge.id,
      p_token: token,
      p_name: editName,
      p_rules: editRules || null,
      p_prize: editPrize || null,
    })

    if (error) {
      console.error(error)
      alert('Something went wrong saving changes: ' + error.message)
      return
    }

    setChallenge({ ...challenge, name: editName, rules: editRules, prize_pool: editPrize })
    setEditing(false)
  }

  async function deleteChallenge() {
    if (!confirm('Delete this challenge for everyone? This cannot be undone.')) return

    const token = localStorage.getItem('creator_' + challenge.id)

    const { error } = await supabase.rpc('delete_challenge', {
      p_challenge_id: challenge.id,
      p_token: token,
    })

    if (error) {
      console.error(error)
      alert('Something went wrong deleting the challenge: ' + error.message)
      return
    }

    localStorage.removeItem('creator_' + challenge.id)
    onBack()
  }

  const me = participants.find((p) => p.id === myParticipantId)

  const totalCheckins = participants.reduce((sum, p) => sum + p.checkinCount, 0)
  const topStreak = participants.length > 0 ? participants[0] : null
  const recentCheckins = participants
    .flatMap((p) => p.checkins.map((c) => ({ ...c, participantName: p.name })))
    .sort((a, b) => new Date(b.checked_in_at) - new Date(a.checked_in_at))
    .slice(0, 8)

  return (
    <div className="page">
      <div className="card">
        <button onClick={onBack} className="back-btn">← Back</button>

        {editing ? (
          <form onSubmit={saveEdit} className="edit-form">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Challenge name"
            />
            <textarea
              value={editRules}
              onChange={(e) => setEditRules(e.target.value)}
              placeholder="Rules"
            />
            <input
              type="text"
              value={editPrize}
              onChange={(e) => setEditPrize(e.target.value)}
              placeholder="Prize pool"
            />
            <div className="edit-actions">
              <button type="submit">Save</button>
              <button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <h1>{challenge.name}</h1>
            {challenge.rules && <p className="rules">{challenge.rules}</p>}
            {challenge.prize_pool && <p className="prize-line">Prize: {challenge.prize_pool}</p>}
          </>
        )}

        {isCreator && !editing && (
          <div className="creator-actions">
            <button className="ghost-btn" onClick={() => setEditing(true)}>Edit challenge</button>
            <button className="danger-btn" onClick={deleteChallenge}>Delete challenge</button>
          </div>
        )}

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
            <p>
              Logged in as <strong>{me ? me.name : ''}</strong> · streak: {me ? me.streak : 0} days
              {me && me.missed && <span className="missed-badge">missed a day</span>}
            </p>

            {me && me.checkedInToday ? (
              <p className="already-logged">Already logged today. Nice work.</p>
            ) : (
              <>
                <label className="photo-input">
                  {photoFile ? photoFile.name : 'Add a photo (optional)'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files[0])}
                    hidden
                  />
                </label>
                <button onClick={checkIn} className="checkin-btn" disabled={uploading}>
                  {uploading ? 'Logging...' : 'LOG TODAY'}
                </button>
              </>
            )}

            <button onClick={leaveChallenge} className="leave-btn">Leave challenge</button>
          </div>
        )}

        <h2>Leaderboard</h2>
        {loading ? (
          <p>Loading...</p>
        ) : participants.length === 0 ? (
          <p className="empty">No one's joined yet.</p>
        ) : (
          <ol className="leaderboard">
            {participants.map((p) => (
              <li key={p.id}>
                <span className="lb-name">
                  {p.name}
                  {p.missed && <span className="missed-dot" title="Missed a day">⚠</span>}
                </span>
                <span className="score">{p.streak}</span>
              </li>
            ))}
          </ol>
        )}

        <h2>Stats</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-number">{participants.length}</span>
            <span className="stat-label">Participants</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{totalCheckins}</span>
            <span className="stat-label">Total check-ins</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{topStreak ? topStreak.streak : 0}</span>
            <span className="stat-label">{topStreak ? topStreak.name + "'s streak" : 'Top streak'}</span>
          </div>
        </div>

        {recentCheckins.length > 0 && (
          <>
            <h2>Recent check-ins</h2>
            <ul className="feed">
              {recentCheckins.map((c) => (
                <li key={c.id} className="feed-item">
                  {c.photo_url && (
                    <img
                      src={c.photo_url}
                      alt=""
                      className="feed-photo"
                      onClick={() => setViewingPhoto(c.photo_url)}
                    />
                  )}
                  <span>
                    <strong>{c.participantName}</strong> logged a check-in
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {viewingPhoto && (
        <div className="photo-modal" onClick={() => setViewingPhoto(null)}>
          <img src={viewingPhoto} alt="" className="photo-modal-img" />
        </div>
      )}
    </div>
  )
}

export default App
