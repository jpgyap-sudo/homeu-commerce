import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

interface AdminUser {
  id: number
  email: string
  name: string
  role: string
  status: string
  created_at: string
}

async function loadUsers(): Promise<AdminUser[]> {
  try {
    const r = await query(
      `SELECT id, email, COALESCE(name, email) as name, role, status, created_at
       FROM customers
       WHERE role = 'admin'
       ORDER BY created_at DESC`
    )
    return r.rows as AdminUser[]
  } catch {
    return []
  }
}

export default async function AdminUsersPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const users = await loadUsers()

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#151a17' }}>
            👥 Users & Roles
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#667168' }}>
            Manage admin accounts and permissions
          </p>
        </div>
        <a
          href="/admin/settings/users/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px',
            background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)',
            color: '#fff', borderRadius: 10, textDecoration: 'none',
            fontSize: 13, fontWeight: 600,
          }}
        >
          + Create User
        </a>
      </div>

      {/* Users Table */}
      <div style={{
        background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, overflow: 'hidden',
      }}>
        {users.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#667168', fontSize: 14 }}>
            No admin users found. Create your first admin user.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #d9e0d7', background: '#f7f9f6' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #eef1ed' }}>
                  <td style={tdStyle}>
                    <a href={`/admin/settings/users/${user.id}`} style={{ color: '#1a6d3e', textDecoration: 'none', fontWeight: 500 }}>
                      {user.name}
                    </a>
                  </td>
                  <td style={{ ...tdStyle, color: '#667168' }}>{user.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 4,
                      background: user.role === 'superadmin' ? '#fef2e8' : '#e8f0fe',
                      color: user.role === 'superadmin' ? '#8f4e2a' : '#1a5bb5',
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status === 'active' ? '🟢 Active' : user.status === 'inactive' ? '⚪ Inactive' : user.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: '#667168' }}>
                    {new Date(user.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <a href={`/admin/settings/users/${user.id}`} style={{ color: '#1a6d3e', fontSize: 13, textDecoration: 'none', marginRight: 12 }}>
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px',
  fontSize: 11, fontWeight: 600, color: '#667168',
  textTransform: 'uppercase', letterSpacing: '0.05em',
}
const tdStyle: React.CSSProperties = { padding: '12px 16px' }
