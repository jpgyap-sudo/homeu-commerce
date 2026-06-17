import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { revalidatePath } from 'next/cache'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditUserPage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const userId = parseInt(id, 10)

  const r = await query(
    `SELECT id, email, COALESCE(name, email) as name, role, status
     FROM customers WHERE id = $1 AND role = 'admin'`,
    [userId]
  )
  const user = r.rows[0]
  if (!user) redirect('/admin/settings/users')

  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>
        Edit User: {user.name}
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#667168' }}>
        {user.email}
      </p>

      <form
        action={async (formData: FormData) => {
          'use server'
          const name = String(formData.get('name') || '').trim()
          const role = String(formData.get('role') || 'admin')
          const status = String(formData.get('status') || 'active')
          const newPassword = String(formData.get('newPassword') || '').trim()

          try {
            if (newPassword) {
              const { hashPassword: hp } = await import('@/lib/auth')
              const hash = await hp(newPassword)
              await query(
                `UPDATE customers SET name = $1, role = $2, status = $3, password_hash = $4, updated_at = NOW()
                 WHERE id = $5`,
                [name || user.name, role, status, hash, userId]
              )
            } else {
              await query(
                `UPDATE customers SET name = $1, role = $2, status = $3, updated_at = NOW()
                 WHERE id = $4`,
                [name || user.name, role, status, userId]
              )
            }
          } catch (e) {
            console.error('Failed to update user:', e)
          }

          revalidatePath('/admin/settings/users')
          revalidatePath(`/admin/settings/users/${userId}`)
          redirect('/admin/settings/users')
        }}
        style={{
          background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
          padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
        }}
      >
        <Field label="Full Name" name="name" defaultValue={user.name} />
        <Field label="Email" value={user.email} readOnly />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Role</label>
          <select
            name="role"
            defaultValue={user.role}
            style={selectStyle}
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
            <option value="editor">Editor</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Status</label>
          <select
            name="status"
            defaultValue={user.status}
            style={selectStyle}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>New Password (leave blank to keep current)</label>
          <input
            name="newPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button type="submit" style={primaryBtnStyle}>Save Changes</button>
          <a href="/admin/settings/users" style={cancelStyle}>Cancel</a>

          {/* Delete button — separate form for safety */}
        </div>
      </form>

      {/* Delete section */}
      <div style={{
        marginTop: 24, background: '#fef2e8', border: '1px solid #e8c9b0',
        borderRadius: 12, padding: 20,
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#8f4e2a' }}>
          Danger Zone
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#8f4e2a' }}>
          Permanently delete this user account. This action cannot be undone.
        </p>
        <form
          action={async () => {
            'use server'
            try {
              await query('DELETE FROM customers WHERE id = $1 AND role = $2', [userId, 'admin'])
            } catch (e) {
              console.error('Failed to delete user:', e)
            }
            revalidatePath('/admin/settings/users')
            redirect('/admin/settings/users')
          }}
        >
          <button
            type="submit"
            style={{
              padding: '10px 20px', background: '#e74b16', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
            onClick={e => {
              if (!confirm('Are you sure you want to delete this user?')) e.preventDefault()
            }}
          >
            Delete User
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, name, defaultValue, value, readOnly }: {
  label: string; name?: string; defaultValue?: string; value?: string; readOnly?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        value={value}
        readOnly={readOnly}
        style={inputStyle}
      />
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#667168',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
  background: '#f7f9f6', color: '#151a17',
}

const selectStyle: React.CSSProperties = {
  padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
  fontSize: 14, fontFamily: 'inherit', background: '#f7f9f6', color: '#151a17',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '12px 28px', background: '#151a17', color: '#fff',
  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
}

const cancelStyle: React.CSSProperties = {
  padding: '12px 20px', color: '#667168', fontSize: 14,
  textDecoration: 'none', alignSelf: 'center',
}
