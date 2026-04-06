import { useState, useEffect } from 'react'
import { Briefcase, Send, Users, Mail, Play, Search, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { companion } from '../lib/companion'
import StatsCard from '../components/StatsCard'

export default function Dashboard() {
  const [stats, setStats] = useState({ jobs: 0, applied: 0, contacts: 0, emails: 0 })
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionStatus, setActionStatus] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [jobsRes, appliedRes, contactsRes, emailsRes, eventsRes] = await Promise.all([
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'applied'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).not('email', 'is', null),
        supabase.from('scrape_events').select('*').order('created_at', { ascending: false }).limit(10),
      ])

      setStats({
        jobs: jobsRes.count ?? 0,
        applied: appliedRes.count ?? 0,
        contacts: contactsRes.count ?? 0,
        emails: emailsRes.count ?? 0,
      })
      setEvents(eventsRes.data ?? [])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(label, fn) {
    setActionStatus({ label, state: 'running' })
    try {
      await fn()
      setActionStatus({ label, state: 'done' })
      fetchData()
    } catch (err) {
      console.error(`Action "${label}" failed:`, err)
      setActionStatus({ label, state: 'error' })
    }
    setTimeout(() => setActionStatus(null), 3000)
  }

  function truncate(str, len = 40) {
    if (!str) return '\u2014'
    return str.length > len ? str.slice(0, len) + '...' : str
  }

  function formatTime(ts) {
    if (!ts) return '\u2014'
    const d = new Date(ts)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!supabase) {
    return (
      <div style={styles.unconfigured}>
        <p style={{ fontSize: 18, color: 'var(--cr-muted)' }}>
          Configure Supabase in Settings to view your dashboard.
        </p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Dashboard</h1>

      {/* Stat cards */}
      <div style={styles.statsGrid}>
        <StatsCard icon={Briefcase} label="Total Jobs" value={loading ? '\u2014' : stats.jobs} />
        <StatsCard icon={Send} label="Applications Sent" value={loading ? '\u2014' : stats.applied} />
        <StatsCard icon={Users} label="Recruiters Found" value={loading ? '\u2014' : stats.contacts} />
        <StatsCard icon={Mail} label="Emails Found" value={loading ? '\u2014' : stats.emails} />
      </div>

      {/* Quick actions */}
      <div style={styles.section}>
        <h2 style={styles.subheading}>Quick Actions</h2>
        <div style={styles.actionsRow}>
          {[
            { label: 'Run Pipeline', icon: Play, fn: () => companion.runPipeline() },
            { label: 'Find Recruiters', icon: Search, fn: () => companion.recruiterPipeline() },
            { label: 'Auto Apply (Dry Run)', icon: Zap, fn: () => companion.autoApplyAll({ dry_run: true }) },
          ].map(({ label, icon: Icon, fn }) => (
            <button
              key={label}
              style={styles.actionBtn}
              onClick={() => handleAction(label, fn)}
              disabled={actionStatus?.label === label && actionStatus.state === 'running'}
            >
              <Icon size={16} />
              {actionStatus?.label === label && actionStatus.state === 'running'
                ? 'Running...'
                : label}
            </button>
          ))}
        </div>
        {actionStatus && actionStatus.state !== 'running' && (
          <p style={{
            marginTop: 8,
            fontSize: 13,
            color: actionStatus.state === 'done' ? 'var(--cr-success)' : 'var(--cr-danger)',
          }}>
            {actionStatus.label}: {actionStatus.state === 'done' ? 'Completed' : 'Failed'}
          </p>
        )}
      </div>

      {/* Recent activity */}
      <div style={styles.section}>
        <h2 style={styles.subheading}>Recent Activity</h2>
        {events.length === 0 ? (
          <p style={{ color: 'var(--cr-muted)', fontSize: 14 }}>
            No scrape events yet. Run the pipeline to get started.
          </p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>URL</th>
                  <th style={styles.th}>Contacts Found</th>
                  <th style={styles.th}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={ev.id ?? i} style={i % 2 === 0 ? styles.rowEven : {}}>
                    <td style={styles.td}>{ev.source ?? '\u2014'}</td>
                    <td style={styles.td} title={ev.url}>{truncate(ev.url)}</td>
                    <td style={styles.td}>{ev.contacts_found ?? 0}</td>
                    <td style={styles.td}>{formatTime(ev.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: 24,
    maxWidth: 1200,
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 24,
    color: 'var(--cr-text)',
  },
  subheading: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    color: 'var(--cr-text)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  actionsRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--cr-text)',
    background: 'var(--cr-surface2)',
    border: '1px solid var(--cr-border)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  tableWrap: {
    overflowX: 'auto',
    borderRadius: 8,
    border: '1px solid var(--cr-border)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--cr-muted)',
    background: 'var(--cr-surface)',
    borderBottom: '1px solid var(--cr-border)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 14px',
    borderBottom: '1px solid var(--cr-border)',
    color: 'var(--cr-text)',
  },
  rowEven: {
    background: 'var(--cr-surface)',
  },
  unconfigured: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    padding: 24,
  },
}
