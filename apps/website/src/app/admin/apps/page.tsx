import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import Link from 'next/link'

export default async function CategoryAppsPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const { rows: apps } = await query('SELECT * FROM category_apps ORDER BY category, name').catch(() => ({ rows: [] }))

  return (
    <div>
      <header className="luxe-page-header">
        <h1 className="luxe-page-title">
          <span style={{ marginRight: 'var(--space-3)' }}>🧩</span>Category Apps
        </h1>
        <p className="luxe-page-subtitle">Modular apps that extend your categories with custom functionality.</p>
      </header>

      {/* Installed Apps */}
      <div className="luxe-grid-3">
        {apps.map((app: any) => (
          <Link key={app.id} href={`/admin/apps/${app.slug}`} style={{ textDecoration: 'none' }}>
            <div className="luxe-stat-card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ fontSize: 32, marginBottom: 'var(--space-3)' }}>{app.icon || '📦'}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--luxe-navy-900)', marginBottom: 'var(--space-2)' }}>
                {app.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--luxe-slate-600)', lineHeight: 1.5 }}>
                {app.description || 'No description'}
              </div>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <span className={`luxe-badge ${app.enabled ? 'success' : 'neutral'}`}>
                  {app.enabled ? '● Active' : '○ Inactive'}
                </span>
                <span className="luxe-badge info" style={{ marginLeft: 8 }}>{app.category}</span>
              </div>
            </div>
          </Link>
        ))}

        {/* App Store (coming soon) */}
        <div className="luxe-stat-card" style={{ padding: 'var(--space-6)', border: '2px dashed var(--luxe-warm-300)', background: 'transparent', boxShadow: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <div style={{ fontSize: 32, marginBottom: 'var(--space-3)', opacity: 0.4 }}>➕</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--luxe-slate-400)' }}>App Store</div>
          <div style={{ fontSize: 12, color: 'var(--luxe-slate-400)', textAlign: 'center', marginTop: 4 }}>More apps coming soon</div>
        </div>
      </div>
    </div>
  )
}
