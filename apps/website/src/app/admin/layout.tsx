import './admin.css'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/products', label: 'Products', icon: '🛋️' },
  { href: '/admin/categories', label: 'Categories', icon: '📂' },
  { href: '/admin/customers', label: 'Customers', icon: '🏢' },
  { href: '/admin/rfq', label: 'RFQ Requests', icon: '📋' },
  { href: '/admin/quotations', label: 'Quotations', icon: '📄' },
  { href: '/admin/collections/leads', label: 'Leads', icon: '👤' },
  { href: '/admin/collections/appointments', label: 'Appointments', icon: '📅' },
  { href: '/admin/media', label: 'Media', icon: '🖼️' },
  { href: '/admin/pages', label: 'Pages', icon: '📝' },
  { href: '/admin/redirects', label: 'Redirects', icon: '🔀' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--admin-bg, #f4f6f4)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 250,
        minWidth: 250,
        background: '#151a17',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Branding */}
        <div style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
            🏠 HomeU
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Operations Console
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 20px',
                color: 'rgba(255,255,255,0.75)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.15s',
                borderLeft: '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
        }}>
          DaVinciOS v1.0
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
