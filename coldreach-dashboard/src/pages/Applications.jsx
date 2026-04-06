import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_OPTIONS = ['saved', 'applied', 'rejected', 'offer']

const statusColors = {
  saved: 'var(--cr-muted)',
  applied: 'var(--cr-accent)',
  rejected: 'var(--cr-danger)',
  offer: 'var(--cr-success)',
}

const card = {
  background: 'var(--cr-surface)',
  border: '1px solid var(--cr-border)',
  borderRadius: 12,
  padding: 20,
}

export default function Applications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  async function fetchApplications() {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('applications')
      .select('*, jobs(title, job_url, status, companies(name))')
      .order('sent_at', { ascending: false })
    if (!error && data) setApplications(data)
    setLoading(false)
  }

  async function updateStatus(id, newStatus) {
    if (!supabase) return
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', id)
    if (!error) {
      setApplications(prev =>
        prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
      )
    }
  }

  const total = applications.length
  const responses = applications.filter(a => a.status === 'rejected' || a.status === 'offer').length
  const offers = applications.filter(a => a.status === 'offer').length
  const offerRate = total > 0 ? ((offers / total) * 100).toFixed(1) : '0.0'

  const summaryCards = [
    { label: 'Total Applied', value: total, color: 'var(--cr-accent)' },
    { label: 'Responses', value: responses, color: 'var(--cr-warning)' },
    { label: 'Offer Rate', value: `${offerRate}%`, color: 'var(--cr-success)' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Applications</h1>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {summaryCards.map(({ label, value, color }) => (
          <div key={label} style={card}>
            <div style={{ fontSize: 13, color: 'var(--cr-muted)', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Application List */}
      {loading ? (
        <div style={{ color: 'var(--cr-muted)', textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : applications.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 16, color: 'var(--cr-muted)', marginBottom: 8 }}>No applications yet.</div>
          <div style={{ fontSize: 14, color: 'var(--cr-muted)' }}>Run Auto-Apply to start.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {applications.map(app => {
            const jobTitle = app.jobs?.title || 'Unknown Job'
            const companyName = app.jobs?.companies?.name || 'Unknown Company'
            const appliedDate = app.sent_at
              ? new Date(app.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'N/A'
            const isExpanded = expandedId === app.id
            const coverLetter = app.cover_letter || ''

            return (
              <div key={app.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{jobTitle}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 10px',
                        borderRadius: 20,
                        background: statusColors[app.status] || 'var(--cr-muted)',
                        color: '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>
                        {app.status || 'saved'}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--cr-muted)', marginBottom: 4 }}>{companyName}</div>
                    <div style={{ fontSize: 12, color: 'var(--cr-muted)' }}>Applied: {appliedDate}</div>
                  </div>
                  <div>
                    <select
                      value={app.status || 'saved'}
                      onChange={e => updateStatus(app.id, e.target.value)}
                      style={{
                        background: 'var(--cr-surface2)',
                        color: 'var(--cr-text)',
                        border: '1px solid var(--cr-border)',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 13,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cover Letter Preview */}
                {coverLetter && (
                  <div style={{ marginTop: 12 }}>
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      style={{
                        fontSize: 13,
                        color: 'var(--cr-muted)',
                        cursor: 'pointer',
                        lineHeight: 1.5,
                        background: 'var(--cr-surface2)',
                        padding: '10px 14px',
                        borderRadius: 8,
                      }}
                    >
                      {isExpanded ? coverLetter : coverLetter.slice(0, 100) + (coverLetter.length > 100 ? '...' : '')}
                      {coverLetter.length > 100 && (
                        <span style={{ color: 'var(--cr-accent)', marginLeft: 6, fontSize: 12 }}>
                          {isExpanded ? 'Show less' : 'Show more'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
