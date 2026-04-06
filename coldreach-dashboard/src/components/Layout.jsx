import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Users, Send, Workflow, Settings } from 'lucide-react'

const nav = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/applications', label: 'Applications', icon: Send },
  { path: '/pipeline', label: 'Pipeline', icon: Workflow },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 220, background: 'var(--cr-surface)', borderRight: '1px solid var(--cr-border)',
        display: 'flex', flexDirection: 'column', padding: '20px 0',
      }}>
        <div style={{ padding: '0 20px 24px', fontSize: 20, fontWeight: 700, color: 'var(--cr-accent)' }}>
          ColdReach
        </div>
        <nav style={{ flex: 1 }}>
          {nav.map(({ path, label, icon: Icon }) => (
            <Link key={path} to={path} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
              color: pathname === path ? 'var(--cr-accent)' : 'var(--cr-muted)',
              background: pathname === path ? 'var(--cr-surface2)' : 'transparent',
              textDecoration: 'none', fontSize: 14, fontWeight: pathname === path ? 600 : 400,
              borderLeft: pathname === path ? '3px solid var(--cr-accent)' : '3px solid transparent',
            }}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
