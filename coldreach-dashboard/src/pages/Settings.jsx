import { useState, useEffect } from 'react'
import { isConfigured } from '../lib/supabase'
import { companion } from '../lib/companion'

const card = {
  background: 'var(--cr-surface)',
  border: '1px solid var(--cr-border)',
  borderRadius: 12,
  padding: 20,
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--cr-surface2)',
  border: '1px solid var(--cr-border)',
  borderRadius: 6,
  color: 'var(--cr-text)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 13,
  color: 'var(--cr-muted)',
  marginBottom: 6,
  display: 'block',
}

const sectionTitle = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 16,
}

const API_KEYS = ['Hunter.io', 'Apollo.io', 'Snov.io', 'PDL']

export default function Settings() {
  const [url, setUrl] = useState(localStorage.getItem('supabase-url') || '')
  const [key, setKey] = useState(localStorage.getItem('supabase-key') || '')
  const [profile, setProfile] = useState(null)
  const [resumes, setResumes] = useState([])
  const [profileLoading, setProfileLoading] = useState(true)
  const [resumesLoading, setResumesLoading] = useState(true)

  useEffect(() => {
    loadProfile()
    loadResumes()
  }, [])

  async function loadProfile() {
    try {
      const data = await companion.getProfile()
      if (data && !data.error) setProfile(data)
    } catch { /* companion may be offline */ }
    setProfileLoading(false)
  }

  async function loadResumes() {
    try {
      const data = await companion.getResumes()
      if (data && !data.error) setResumes(Array.isArray(data) ? data : data.resumes || [])
    } catch { /* companion may be offline */ }
    setResumesLoading(false)
  }

  function handleSaveSupabase() {
    localStorage.setItem('supabase-url', url)
    localStorage.setItem('supabase-key', key)
    window.location.reload()
  }

  const configured = isConfigured()

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Supabase Configuration */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={sectionTitle}>Supabase Configuration</div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600,
              color: configured ? 'var(--cr-success)' : 'var(--cr-danger)',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: configured ? 'var(--cr-success)' : 'var(--cr-danger)',
              }} />
              {configured ? 'Connected' : 'Not configured'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Project URL</label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Anon Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={key}
                onChange={e => setKey(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleSaveSupabase}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                color: '#fff',
                background: 'var(--cr-accent)',
                alignSelf: 'flex-start',
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Profile */}
        <div style={card}>
          <div style={sectionTitle}>Profile</div>
          {profileLoading ? (
            <div style={{ fontSize: 13, color: 'var(--cr-muted)' }}>Loading profile...</div>
          ) : !profile ? (
            <div style={{ fontSize: 13, color: 'var(--cr-muted)' }}>
              Could not load profile. Make sure companion is running.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ProfileField label="Name" value={profile.name} />
              <ProfileField label="Email" value={profile.email} />
              <ProfileField label="Phone" value={profile.phone} />
              <ProfileField label="Location" value={profile.location} />
              {profile.skills && profile.skills.length > 0 && (
                <div>
                  <div style={labelStyle}>Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.skills.map((skill, i) => (
                      <span key={i} style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 20,
                        background: 'var(--cr-surface2)',
                        border: '1px solid var(--cr-border)',
                        color: 'var(--cr-text)',
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resumes */}
        <div style={card}>
          <div style={sectionTitle}>Resumes</div>
          {resumesLoading ? (
            <div style={{ fontSize: 13, color: 'var(--cr-muted)' }}>Loading resumes...</div>
          ) : resumes.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--cr-muted)' }}>
              No resumes found. Add resume files to the companion resumes directory.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resumes.map((r, i) => {
                const filename = typeof r === 'string' ? r : r.filename || r.name || 'Unknown'
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    background: 'var(--cr-surface2)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--cr-accent)' }}>&#128196;</span>
                    {filename}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* API Keys Status */}
        <div style={card}>
          <div style={sectionTitle}>API Keys Status</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
            {API_KEYS.map(name => (
              <div key={name} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px',
                background: 'var(--cr-surface2)',
                borderRadius: 8,
                fontSize: 13,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--cr-muted)',
                }} />
                {name}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--cr-muted)', lineHeight: 1.5 }}>
            Configure API keys in companion <code style={{ background: 'var(--cr-surface2)', padding: '2px 6px', borderRadius: 4 }}>.env</code> file.
          </div>
        </div>

        {/* Schedule */}
        <div style={card}>
          <div style={sectionTitle}>Schedule</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: 'var(--cr-surface2)',
              borderRadius: 8,
              fontSize: 13,
            }}>
              <span style={{ color: 'var(--cr-accent)', fontWeight: 600 }}>Pipeline</span>
              <span style={{ color: 'var(--cr-muted)' }}>runs daily at 8am</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: 'var(--cr-surface2)',
              borderRadius: 8,
              fontSize: 13,
            }}>
              <span style={{ color: 'var(--cr-accent)', fontWeight: 600 }}>Auto-apply</span>
              <span style={{ color: 'var(--cr-muted)' }}>runs at 9am & 9pm</span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--cr-warning)', marginTop: 12, lineHeight: 1.5 }}>
            Set <code style={{ background: 'var(--cr-surface2)', padding: '2px 6px', borderRadius: 4 }}>AUTO_APPLY_LIVE=true</code> in <code style={{ background: 'var(--cr-surface2)', padding: '2px 6px', borderRadius: 4 }}>.env</code> to enable real submissions.
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileField({ label, value }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{
        fontSize: 14,
        padding: '8px 12px',
        background: 'var(--cr-surface2)',
        borderRadius: 6,
        color: value ? 'var(--cr-text)' : 'var(--cr-muted)',
      }}>
        {value || 'Not set'}
      </div>
    </div>
  )
}

