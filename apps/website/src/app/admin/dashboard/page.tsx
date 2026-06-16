import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect('/admin/login')
  }

  const counts = await Promise.all([
    query('SELECT COUNT(*) as count FROM products').then(r => Number(r.rows[0].count)),
    query('SELECT COUNT(*) as count FROM customers').then(r => Number(r.rows[0].count)),
    query('SELECT COUNT(*) as count FROM categories').then(r => Number(r.rows[0].count)),
    query('SELECT COUNT(*) as count FROM rfq_requests').then(r => Number(r.rows[0].count)),
  ]).catch(() => [0, 0, 0, 0])

  return (
    <div className="admin-dashboard">
      <h1>Welcome, {session.name || session.email}</h1>
      <p>HomeU Operations Console</p>

      <div className="admin-dashboard-cards">
        <div className="admin-dashboard-card">
          <h2>Products</h2>
          <div className="count">{counts[0]}</div>
        </div>
        <div className="admin-dashboard-card">
          <h2>Customers</h2>
          <div className="count">{counts[1]}</div>
        </div>
        <div className="admin-dashboard-card">
          <h2>Categories</h2>
          <div className="count">{counts[2]}</div>
        </div>
        <div className="admin-dashboard-card">
          <h2>RFQ Requests</h2>
          <div className="count">{counts[3]}</div>
        </div>
      </div>

      <div style={{ marginTop: 32, padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #d9e0d7' }}>
        <p style={{ margin: 0, color: '#667168' }}>
          Logged in as <strong>{session.email}</strong> ({session.role})
        </p>
      </div>
    </div>
  )
}
