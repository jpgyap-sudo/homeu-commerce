export default function AdminLoading() {
  return (
    <div>
      <header className="luxe-page-header" style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ width: 200, height: 32, background: 'var(--luxe-warm-200)', borderRadius: 6, marginBottom: 8 }} />
        <div style={{ width: 320, height: 16, background: 'var(--luxe-warm-100)', borderRadius: 4 }} />
      </header>

      {/* Stat cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="luxe-card" style={{ padding: 'var(--space-6)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--luxe-warm-200)', marginBottom: 16 }} />
            <div style={{ width: 60, height: 36, background: 'var(--luxe-warm-200)', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 100, height: 13, background: 'var(--luxe-warm-100)', borderRadius: 4 }} />
          </div>
        ))}
      </div>

      {/* Two column grid skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {[1,2].map(i => (
          <div key={i} className="luxe-card">
            <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--luxe-warm-100)' }}>
              <div style={{ width: 120, height: 18, background: 'var(--luxe-warm-200)', borderRadius: 4 }} />
            </div>
            <div style={{ padding: 'var(--space-6)' }}>
              <div style={{ width: '100%', height: 120, background: 'var(--luxe-warm-100)', borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* DNA card skeleton */}
      <div className="luxe-card" style={{ marginTop: 'var(--space-8)' }}>
        <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--luxe-warm-100)' }}>
          <div style={{ width: 200, height: 18, background: 'var(--luxe-warm-200)', borderRadius: 4 }} />
        </div>
        <div style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ flex: 1, height: 80, background: 'var(--luxe-warm-100)', borderRadius: 6 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
