import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { companion } from '../lib/companion'

const card = {
  background: 'var(--cr-surface)',
  border: '1px solid var(--cr-border)',
  borderRadius: 12,
  padding: 20,
}

const btnBase = {
  padding: '10px 20px',
  borderRadius: 8,
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  color: '#fff',
  background: 'var(--cr-accent)',
  width: '100%',
  marginTop: 12,
}

export default function Pipeline() {
  const [companiesInput, setCompaniesInput] = useState('')
  const [dryRun, setDryRun] = useState(true)
  const [running, setRunning] = useState({ pipeline: false, recruiter: false, autoApply: false })
  const [events, setEvents] = useState([])
  const [companionUp, setCompanionUp] = useState(null)
  const feedRef = useRef(null)

  // Poll scrape_events every 5s
  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 5000)
    return () => clearInterval(interval)
  }, [])

  // Poll companion status every 10s
  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchEvents() {
    if (!supabase) return
    const { data } = await supabase
      .from('scrape_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(30)
    if (data) setEvents(data)
  }

  async function checkStatus() {
    try {
      const res = await companion.status()
      setCompanionUp(res && !res.error)
    } catch {
      setCompanionUp(false)
    }
  }

  async function handleRunPipeline() {
    setRunning(r => ({ ...r, pipeline: true }))
    try {
      await companion.runPipeline()
    } catch { /* handled by status */ }
    setRunning(r => ({ ...r, pipeline: false }))
  }

  async function handleRecruiterFinder() {
    const companies = companiesInput.split(',').map(c => c.trim()).filter(Boolean)
    if (companies.length === 0) return
    setRunning(r => ({ ...r, recruiter: true }))
    try {
      await companion.recruiterPipeline({ companies })
    } catch { /* handled by status */ }
    setRunning(r => ({ ...r, recruiter: false }))
  }

  async function handleAutoApply() {
    setRunning(r => ({ ...r, autoApply: true }))
    try {
      await companion.autoApplyAll({ dry_run: dryRun })
    } catch { /* handled by status */ }
    setRunning(r => ({ ...r, autoApply: false }))
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Pipeline</h1>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: 'var(--cr-muted)',
          background: 'var(--cr-surface2)', padding: '4px 12px', borderRadius: 20,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: companionUp === null ? 'var(--cr-muted)' : companionUp ? 'var(--cr-success)' : 'var(--cr-danger)',
          }} />
          Companion {companionUp === null ? '...' : companionUp ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {/* Full Pipeline */}
        <div style={card}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Full Pipeline</div>
          <div style={{ fontSize: 13, color: 'var(--cr-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            Search LinkedIn Jobs &rarr; Find Companies &rarr; Find Recruiters &rarr; Find Emails
          </div>
          <button
            onClick={handleRunPipeline}
            disabled={running.pipeline}
            style={{
              ...btnBase,
              opacity: running.pipeline ? 0.6 : 1,
              cursor: running.pipeline ? 'not-allowed' : 'pointer',
            }}
          >
            {running.pipeline ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Spinner /> Running...
              </span>
            ) : 'Run Full Pipeline'}
          </button>
        </div>

        {/* Recruiter Finder */}
        <div style={card}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Recruiter Finder</div>
          <div style={{ fontSize: 13, color: 'var(--cr-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            Find recruiters for specific companies.
          </div>
          <input
            type="text"
            placeholder="Company1, Company2, ..."
            value={companiesInput}
            onChange={e => setCompaniesInput(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--cr-surface2)',
              border: '1px solid var(--cr-border)',
              borderRadius: 6,
              color: 'var(--cr-text)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleRecruiterFinder}
            disabled={running.recruiter}
            style={{
              ...btnBase,
              opacity: running.recruiter ? 0.6 : 1,
              cursor: running.recruiter ? 'not-allowed' : 'pointer',
            }}
          >
            {running.recruiter ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Spinner /> Running...
              </span>
            ) : 'Find Recruiters'}
          </button>
        </div>

        {/* Auto Apply */}
        <div style={card}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Auto Apply</div>
          <div style={{ fontSize: 13, color: 'var(--cr-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            Apply to all saved Easy Apply jobs.
          </div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'var(--cr-muted)', cursor: 'pointer',
          }}>
            <span
              onClick={() => setDryRun(!dryRun)}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: dryRun ? 'var(--cr-accent)' : 'var(--cr-border)',
                position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                display: 'inline-block',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: dryRun ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </span>
            Dry Run {dryRun ? '(ON)' : '(OFF)'}
          </label>
          <button
            onClick={handleAutoApply}
            disabled={running.autoApply}
            style={{
              ...btnBase,
              background: dryRun ? 'var(--cr-accent)' : 'var(--cr-warning)',
              opacity: running.autoApply ? 0.6 : 1,
              cursor: running.autoApply ? 'not-allowed' : 'pointer',
            }}
          >
            {running.autoApply ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Spinner /> Running...
              </span>
            ) : 'Start Auto-Apply'}
          </button>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Live Activity Feed</div>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--cr-success)',
            animation: 'pulse 2s infinite',
          }} />
        </div>
        <div
          ref={feedRef}
          style={{
            maxHeight: 320,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {events.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--cr-muted)', padding: 20, textAlign: 'center' }}>
              No recent activity. Start a pipeline to see events here.
            </div>
          ) : (
            events.map((evt, i) => (
              <div
                key={evt.id || i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: i % 2 === 0 ? 'var(--cr-surface2)' : 'transparent',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--cr-muted)', fontFamily: 'monospace', fontSize: 12, flexShrink: 0 }}>
                  {formatTime(evt.timestamp)}
                </span>
                <span style={{ color: 'var(--cr-text)' }}>
                  {evt.event_type && (
                    <span style={{
                      color: 'var(--cr-accent)',
                      fontWeight: 600,
                      marginRight: 8,
                    }}>
                      [{evt.event_type}]
                    </span>
                  )}
                  {evt.message || evt.detail || JSON.stringify(evt.payload || '')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
      }}
    />
  )
}
