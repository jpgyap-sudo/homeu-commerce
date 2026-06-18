import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import Link from 'next/link'

const APP_SETTINGS = [
  {
    slug: 'instagram-feed', name: 'Instagram Feed', icon: '📸', category: 'social',
    settings: [
      { key: 'sync_interval', label: 'Auto-sync interval', type: 'select', options: ['manual','1h','3h','6h','12h','24h'], default: '6h' },
      { key: 'default_layout', label: 'Default grid layout', type: 'select', options: ['masonry','metro','classic','collage','spotlight'], default: 'masonry' },
      { key: 'posts_per_page', label: 'Posts per page', type: 'number', default: 12 },
      { key: 'show_captions', label: 'Show captions on hover', type: 'toggle', default: true },
      { key: 'enable_shoppable', label: 'Shoppable product tags', type: 'toggle', default: true },
    ],
  },
  {
    slug: 'email-inbox', name: 'Email Inbox', icon: '📧', category: 'messaging',
    settings: [
      { key: 'imap_host', label: 'IMAP Host', type: 'text', default: 'imap.zoho.com' },
      { key: 'imap_port', label: 'IMAP Port', type: 'number', default: 993 },
      { key: 'sync_interval', label: 'Sync interval', type: 'select', options: ['manual','5m','15m','30m','1h'], default: '15m' },
      { key: 'auto_categorize', label: 'Auto-categorize emails', type: 'toggle', default: true },
      { key: 'signature', label: 'Email signature', type: 'textarea', default: 'Best regards,\nHomeU.ph Team' },
    ],
  },
  {
    slug: 'central-inbox', name: 'Central Inbox', icon: '📬', category: 'messaging',
    settings: [
      { key: 'enable_website_chat', label: 'Website Chat channel', type: 'toggle', default: true },
      { key: 'enable_email', label: 'Email channel', type: 'toggle', default: true },
      { key: 'enable_facebook', label: 'Facebook Messenger', type: 'toggle', default: false },
      { key: 'enable_instagram', label: 'Instagram DM', type: 'toggle', default: false },
      { key: 'auto_assign', label: 'Auto-assign to staff', type: 'toggle', default: false },
      { key: 'ai_suggestions', label: 'AI reply suggestions', type: 'toggle', default: false },
      { key: 'unread_badge', label: 'Show unread badge in sidebar', type: 'toggle', default: true },
    ],
  },
  {
    slug: 'chatbot', name: 'Concierge Chatbot', icon: '🤖', category: 'messaging',
    settings: [
      { key: 'greeting_message', label: 'Greeting message', type: 'textarea', default: 'Hello! How can I help you find the perfect furniture today?' },
      { key: 'business_hours_only', label: 'Business hours only', type: 'toggle', default: false },
      { key: 'collect_leads', label: 'Collect visitor leads', type: 'toggle', default: true },
      { key: 'product_recommendations', label: 'Show product suggestions', type: 'toggle', default: true },
      { key: 'handoff_after', label: 'Handoff to human after (messages)', type: 'number', default: 5 },
    ],
  },
]

export default async function CategoryAppsPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const { rows: apps } = await query('SELECT * FROM category_apps ORDER BY category, name').catch(() => ({ rows: [] }))

  return (
    <div>
      <header className="luxe-page-header">
        <h1 className="luxe-page-title">
          <span style={{ marginRight: 'var(--space-3)' }}>🧩</span>App Settings
        </h1>
        <p className="luxe-page-subtitle">Configure and manage your installed apps. Click an app to adjust its settings.</p>
      </header>

      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        {APP_SETTINGS.map(app => (
          <div key={app.slug} className="luxe-card">
            <div className="luxe-card-header">
              <h2 className="luxe-card-title">
                <span style={{ marginRight: 'var(--space-2)' }}>{app.icon}</span>
                {app.name}
              </h2>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span className={`luxe-badge ${apps.some((a: any) => a.slug === app.slug && a.enabled) ? 'success' : 'neutral'}`} style={{ fontSize: 10 }}>
                  {apps.some((a: any) => a.slug === app.slug && a.enabled) ? '● Active' : '○ Inactive'}
                </span>
                <Link href={`/admin/apps/${app.slug}`} className="luxe-btn luxe-btn-ghost luxe-btn-sm">
                  Open App →
                </Link>
              </div>
            </div>

            <div className="luxe-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                {app.settings.map(setting => (
                  <div key={setting.key}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--luxe-slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      {setting.label}
                    </label>
                    {setting.type === 'select' && (
                      <select className="luxe-select" defaultValue={String(setting.default)} style={{ width: '100%' }}>
                        {setting.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {setting.type === 'toggle' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" defaultChecked={setting.default === true} style={{ width: 18, height: 18, accentColor: 'var(--luxe-blue-600)' }} />
                        <span style={{ fontSize: 13, color: 'var(--luxe-charcoal)' }}>Enabled</span>
                      </label>
                    )}
                    {setting.type === 'number' && (
                      <input className="luxe-input" type="number" defaultValue={Number(setting.default)} />
                    )}
                    {setting.type === 'text' && (
                      <input className="luxe-input" type="text" defaultValue={String(setting.default)} />
                    )}
                    {setting.type === 'textarea' && (
                      <textarea className="luxe-input" rows={2} defaultValue={String(setting.default)} style={{ resize: 'vertical' }} />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                <button className="luxe-btn luxe-btn-gold luxe-btn-sm">💾 Save {app.name} Settings</button>
              </div>
            </div>
          </div>
        ))}

        {/* App Store placeholder */}
        <div className="luxe-card" style={{ border: '2px dashed var(--luxe-warm-300)', background: 'transparent', boxShadow: 'none' }}>
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 'var(--space-3)', opacity: 0.4 }}>➕</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--luxe-slate-400)' }}>App Store</div>
            <div style={{ fontSize: 12, color: 'var(--luxe-slate-400)', marginTop: 4 }}>More apps coming soon</div>
          </div>
        </div>
      </div>
    </div>
  )
}
