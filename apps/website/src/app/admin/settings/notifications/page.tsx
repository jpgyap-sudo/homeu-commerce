import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#151a17' }}>
        🔔 Notifications
      </h2>
      <p style={{ margin: '4px 0 24px', fontSize: 13, color: '#667168' }}>
        Configure email alerts and external integrations
      </p>

      <div style={{
        background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12,
        padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Email */}
        <section>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#151a17' }}>
            📧 Email Alerts
          </h3>
          <Checkbox label="New lead notification" defaultChecked />
          <Checkbox label="RFQ submitted alert" defaultChecked />
          <Checkbox label="Appointment booked alert" defaultChecked />
          <Checkbox label="Weekly summary report" defaultChecked />
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid #d9e0d7', margin: 0 }} />

        {/* Telegram */}
        <section>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#151a17' }}>
            🤖 Telegram Bot
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Bot Token</label>
            <input
              type="password"
              defaultValue="••••••••••••••••"
              style={inputStyle}
            />
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Chat ID</label>
            <input
              defaultValue="-1001234567890"
              style={inputStyle}
            />
          </div>
          <Checkbox label="Send Telegram alerts" defaultChecked />
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid #d9e0d7', margin: 0 }} />

        {/* Slack / Webhook */}
        <section>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#151a17' }}>
            🔗 Webhook
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Webhook URL</label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/..."
              style={inputStyle}
            />
          </div>
          <Checkbox label="Send webhook on lead created" />
          <Checkbox label="Send webhook on RFQ submitted" />
        </section>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button style={primaryBtnStyle}>Save Settings</button>
        </div>
      </div>
    </div>
  )
}

function Checkbox({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, cursor: 'pointer' }}>
      <input type="checkbox" defaultChecked={defaultChecked} style={{ width: 16, height: 16, accentColor: '#1a6d3e' }} />
      <span style={{ fontSize: 13, color: '#151a17' }}>{label}</span>
    </label>
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

const primaryBtnStyle: React.CSSProperties = {
  padding: '12px 28px', background: '#151a17', color: '#fff',
  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
