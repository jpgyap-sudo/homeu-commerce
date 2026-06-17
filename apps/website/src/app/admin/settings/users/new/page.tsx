import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { query } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export default async function NewUserPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#151a17' }}>
        Create Admin User
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#667168' }}>
        Add a new administrator to the operations console
      </p>

      <form
        action={async (formData: FormData) => {
          'use server'
          const email = String(formData.get('email') || '').trim().toLowerCase()
          const name = String(formData.get('name') || '').trim()
          const password = String(formData.get('password') || '')
          const role = String(formData.get('role') || 'admin')

          if (!email || !password) {
            return
          }

          try {
            const hash = await hashPassword(password)
            await query(
              `INSERT INTO customers (email, name, role, status, password_hash)
               VALUES ($1, $2, $3, 'active', $4)
               ON CONFLICT (email) DO NOTHING`,
              [email, name || email, role, hash]
            )
          } catch (e) {
            console.error('Failed to create user:', e)
          }

          revalidatePath('/admin/settings/users')
          redirect('/admin/settings/users')
        }}
        style={{
          background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
          padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
        }}
      >
        <Field label="Email" name="email" type="email" placeholder="admin@homeu.ph" required />
        <Field label="Full Name" name="name" type="text" placeholder="Jane Doe" />
        <Field label="Password" name="password" type="password" placeholder="••••••••" required />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Role</label>
          <select
            name="role"
            defaultValue="admin"
            style={{
              padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
              fontSize: 14, fontFamily: 'inherit', background: '#f7f9f6', color: '#151a17',
            }}
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
            <option value="editor">Editor</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            type="submit"
            style={{
              padding: '12px 28px', background: '#151a17', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Create User
          </button>
          <a
            href="/admin/settings/users"
            style={{
              padding: '12px 20px', color: '#667168', fontSize: 14,
              textDecoration: 'none', alignSelf: 'center',
            }}
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}

function Field({ label, name, type, placeholder, required }: {
  label: string; name: string; type: string; placeholder: string; required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        style={{
          padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
          fontSize: 14, fontFamily: 'inherit', outline: 'none',
          background: '#f7f9f6', color: '#151a17',
        }}
      />
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#667168',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}
