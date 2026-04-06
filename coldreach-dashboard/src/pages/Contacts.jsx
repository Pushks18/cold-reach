import { useState, useEffect } from 'react'
import { ExternalLink, CheckCircle, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    fetchContacts()
  }, [])

  async function fetchContacts() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, companies(name)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setContacts(data ?? [])
    } catch (err) {
      console.error('Contacts fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(ts) {
    if (!ts) return '\u2014'
    return new Date(ts).toLocaleDateString()
  }

  const filtered = contacts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = (c.name ?? '').toLowerCase()
    const email = (c.email ?? '').toLowerCase()
    const company = (c.companies?.name ?? '').toLowerCase()
    return name.includes(q) || email.includes(q) || company.includes(q)
  })

  const emailCount = filtered.filter((c) => c.email).length

  function exportCSV() {
    const headers = ['Name', 'Email', 'Title', 'Company', 'LinkedIn', 'Source', 'Found']
    const rows = filtered.map((c) => [
      c.name ?? '',
      c.email ?? '',
      c.title ?? '',
      c.companies?.name ?? '',
      c.linkedin_url ?? '',
      c.source ?? '',
      c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `coldreach-contacts-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!supabase) {
    return (
      <div style={styles.unconfigured}>
        <p style={{ fontSize: 18, color: 'var(--cr-muted)' }}>
          Configure Supabase in Settings to view contacts.
        </p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h1 style={styles.heading}>Contacts</h1>
        <button style={styles.exportBtn} onClick={exportCSV}>
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <input
          type="text"
          placeholder="Search by name, email, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Summary */}
      <p style={styles.summary}>
        Showing {filtered.length} contacts, {emailCount} with email
      </p>

      {/* Table */}
      {loading ? (
        <p style={{ color: 'var(--cr-muted)', fontSize: 14 }}>Loading contacts...</p>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ color: 'var(--cr-muted)', fontSize: 14 }}>
            No contacts found. Run the recruiter pipeline to start finding contacts.
          </p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Company</th>
                <th style={styles.th}>LinkedIn</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Found</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id ?? i} style={i % 2 === 0 ? styles.rowEven : {}}>
                  <td style={styles.td}>{c.name ?? '\u2014'}</td>
                  <td style={styles.td}>
                    <span style={styles.emailCell}>
                      {c.email ? (
                        <>
                          {c.email_verified && (
                            <CheckCircle size={14} style={{ color: 'var(--cr-success)', flexShrink: 0 }} />
                          )}
                          <span>{c.email}</span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--cr-muted)' }}>{'\u2014'}</span>
                      )}
                    </span>
                  </td>
                  <td style={styles.td}>{c.title ?? '\u2014'}</td>
                  <td style={styles.td}>{c.companies?.name ?? '\u2014'}</td>
                  <td style={styles.td}>
                    {c.linkedin_url ? (
                      <a
                        href={c.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.linkIcon}
                        title={c.linkedin_url}
                      >
                        <ExternalLink size={15} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--cr-muted)' }}>{'\u2014'}</span>
                    )}
                  </td>
                  <td style={styles.td}>{c.source ?? '\u2014'}</td>
                  <td style={styles.td}>{formatDate(c.created_at)}</td>
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
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--cr-text)',
    margin: 0,
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--cr-text)',
    background: 'var(--cr-surface2)',
    border: '1px solid var(--cr-border)',
    borderRadius: 8,
    cursor: 'pointer',
  },
  searchWrap: {
    marginBottom: 12,
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
  summary: {
    fontSize: 13,
    color: 'var(--cr-muted)',
    marginBottom: 16,
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
  emailCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  linkIcon: {
    color: 'var(--cr-accent)',
    display: 'inline-flex',
    alignItems: 'center',
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
