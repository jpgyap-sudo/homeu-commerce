import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function StoreSettingsPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#151a17' }}>
        🏪 Store Profile
      </h2>
      <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667168' }}>
        Branding, contact info, and business details
      </p>

      <div style={{
        background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
        padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <Field label="Store Name" value="Home Atelier Commerce" />
        <Field label="Display Name" value="Home Atelier" />
        <Field label="Contact Email" value="hello@homeu.ph" />
        <Field label="Phone" value="+63 2 8123 4567" />
        <Field label="Address" value="Manila, Philippines" />
        <Field label="Currency" value="PHP (₱)" />
        <Field label="Timezone" value="Asia/Manila (UTC+8)" />

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button style={{
            padding: '12px 28px', background: '#151a17', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 12, fontWeight: 600, color: '#667168',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </label>
      <input
        defaultValue={value}
        style={{
          padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10,
          fontSize: 14, fontFamily: 'inherit', outline: 'none',
          background: '#f7f9f6', color: '#151a17',
        }}
      />
    </div>
  )
}
