import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { companion } from '../lib/companion'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'saved', label: 'Saved' },
  { key: 'applied', label: 'Applied' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'offer', label: 'Offer' },
]

const STATUS_COLORS = {
  saved: 'var(--cr-muted)',
  applied: 'var(--cr-accent)',
  rejected: 'var(--cr-danger)',
  offer: 'var(--cr-success)',
}

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [applyingId, setApplyingId] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    fetchJobs()
  }, [])

  async function fetchJobs() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, companies(name)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      setJobs(data ?? [])
    } catch (err) {
      console.error('Jobs fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleApply(jobId) {
    setApplyingId(jobId)
    try {
      await companion.apply(jobId, true)
      fetchJobs()
    } catch (err) {
      console.error('Apply error:', err)
    } finally {
      setApplyingId(null)
    }
  }

  function formatDate(ts) {
    if (!ts) return '\u2014'
    return new Date(ts).toLocaleDateString()
  }

  const filtered = jobs.filter((job) => {
    if (activeTab !== 'all' && job.status !== activeTab) return false
    if (search) {
      const q = search.toLowerCase()
      const title = (job.title ?? '').toLowerCase()
      const company = (job.companies?.name ?? '').toLowerCase()
      if (!title.includes(q) && !company.includes(q)) return false
    }
    return true
  })

  if (!supabase) {
    return (
      <div style={styles.unconfigured}>
        <p style={{ fontSize: 18, color: 'var(--cr-muted)' }}>
          Configure Supabase in Settings to view jobs.
        </p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Jobs</h1>

      {/* Tabs */}
      <div style={styles.tabsRow}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              ...styles.tab,
              ...(activeTab === key ? styles.tabActive : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <input
          type="text"
          placeholder="Search by title or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: 'var(--cr-muted)', fontSize: 14 }}>Loading jobs...</p>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ color: 'var(--cr-muted)', fontSize: 14 }}>
            No jobs found. Run the pipeline to start scraping.
          </p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Company</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Apply Method</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job, i) => (
                <tr key={job.id ?? i} style={i % 2 === 0 ? styles.rowEven : {}}>
                  <td style={styles.td}>{job.title ?? '\u2014'}</td>
                  <td style={styles.td}>{job.companies?.name ?? '\u2014'}</td>
                  <td style={styles.td}>{job.location ?? '\u2014'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      background: STATUS_COLORS[job.status] ?? 'var(--cr-muted)',
                    }}>
                      {job.status ?? 'unknown'}
                    </span>
                  </td>
                  <td style={styles.td}>{job.apply_method ?? '\u2014'}</td>
                  <td style={styles.td}>{formatDate(job.created_at)}</td>
                  <td style={styles.td}>
                    {job.status === 'saved' && (
                      <button
                        style={styles.applyBtn}
                        onClick={() => handleApply(job.id)}
                        disabled={applyingId === job.id}
                      >
                        {applyingId === job.id ? 'Applying...' : 'Apply'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    marginBottom: 20,
    color: 'var(--cr-text)',
  },
  tabsRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
    borderBottom: '1px solid var(--cr-border)',
    paddingBottom: 0,
  },
  tab: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--cr-muted)',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    color: 'var(--cr-accent)',
    borderBottomColor: 'var(--cr-accent)',
  },
  searchWrap: {
    marginBottom: 16,
  },
  searchInput: {
    width: '100%',
    maxWidth: 400,
    padding: '8px 14px',
    fontSize: 14,
    color: 'var(--cr-text)',
    background: 'var(--cr-surface)',
    border: '1px solid var(--cr-border)',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
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
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    textTransform: 'capitalize',
  },
  applyBtn: {
    padding: '5px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#fff',
    background: 'var(--cr-accent)',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  empty: {
    padding: 40,
    textAlign: 'center',
  },
  unconfigured: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    padding: 24,
  },
}
