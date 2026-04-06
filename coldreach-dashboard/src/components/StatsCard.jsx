export default function StatsCard({ label, value, icon: Icon, color = 'var(--cr-accent)' }) {
  return (
    <div style={{
      background: 'var(--cr-surface)', border: '1px solid var(--cr-border)',
      borderRadius: 12, padding: 20, minWidth: 180,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--cr-muted)', fontSize: 13 }}>{label}</span>
        {Icon && <Icon size={18} style={{ color }} />}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
