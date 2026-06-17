import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>📋 Reports & Exports</h1>
      <p style={{ color: '#667168', fontSize: 13, marginBottom: 24 }}>
        Generate and download analytics reports
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Quick Reports */}
        <Card title="📊 Quick Reports" icon="📊">
          <ReportRow label="Today's Snapshot" desc="Views, leads, RFQs for today" />
          <ReportRow label="Weekly Summary" desc="Traffic + leads + pipeline, last 7 days" />
          <ReportRow label="Monthly Report" desc="Full analytics for the current month" />
          <ReportRow label="Lead Export (CSV)" desc="All leads with scores, sources, statuses" />
          <ReportRow label="RFQ Export (CSV)" desc="All RFQ carts with items and totals" />
        </Card>

        {/* Scheduled Reports */}
        <Card title="⏰ Scheduled Reports" icon="⏰">
          <div style={{ marginBottom: 16 }}>
            <Check label="Daily email digest (8 AM)" checked />
            <Check label="Weekly pipeline report (Mon 9 AM)" checked />
            <Check label="Monthly analytics PDF (1st of month)" checked={false} />
            <Check label="Real-time lead alerts" checked />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recipient Email
            </label>
            <input defaultValue="admin@homeu.ph" style={{ padding: '10px 14px', border: '1.5px solid #d9e0d7', borderRadius: 10, fontSize: 14, background: '#f7f9f6' }} />
          </div>
        </Card>
      </div>

      {/* Custom Report Builder */}
      <Card title="🔧 Custom Report Builder" icon="🔧">
        <p style={{ fontSize: 13, color: '#667168', marginBottom: 16 }}>
          Select metrics and date range to generate a custom report.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <MetricCheck label="Page Views" />
          <MetricCheck label="Unique Visitors" defaultChecked />
          <MetricCheck label="New Leads" defaultChecked />
          <MetricCheck label="Lead Score Avg" />
          <MetricCheck label="RFQ Submissions" defaultChecked />
          <MetricCheck label="Conversion Rate" defaultChecked />
          <MetricCheck label="Quotations Sent" defaultChecked />
          <MetricCheck label="Appointments" />
          <MetricCheck label="Chat Messages" />
          <MetricCheck label="Top Products" defaultChecked />
          <MetricCheck label="Top Pages" defaultChecked />
          <MetricCheck label="Referrer Sources" />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#667168' }}>From</label>
            <input type="date" defaultValue={new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)} style={{ padding: '8px 12px', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 13, background: '#f7f9f6' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#667168' }}>To</label>
            <input type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={{ padding: '8px 12px', border: '1.5px solid #d9e0d7', borderRadius: 8, fontSize: 13, background: '#f7f9f6' }} />
          </div>
          <button style={{ padding: '10px 24px', background: '#151a17', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Generate Report
          </button>
        </div>
      </Card>

      {/* Export Data */}
      <Card title="📤 Data Export" icon="📤">
        <p style={{ fontSize: 13, color: '#667168', marginBottom: 12 }}>
          Export raw analytics data for external analysis.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <ExportBtn label="Page Views (CSV)" />
          <ExportBtn label="Leads (CSV)" />
          <ExportBtn label="RFQ Pipeline (CSV)" />
          <ExportBtn label="Messages (CSV)" />
          <ExportBtn label="All Data (JSON)" />
        </div>
      </Card>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#151a17', margin: '0 0 14px' }}>{icon ? `${icon} ` : ''}{title}</h3>
      {children}
    </div>
  )
}

function ReportRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eef1ed' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#151a17' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#667168' }}>{desc}</div>
      </div>
      <button style={{ padding: '6px 14px', background: '#1a6d3e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        Download
      </button>
    </div>
  )
}

function Check({ label, checked }: { label: string; checked: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 13 }}>
      <input type="checkbox" defaultChecked={checked} style={{ accentColor: '#1a6d3e', width: 15, height: 15 }} />
      <span>{label}</span>
    </label>
  )
}

function MetricCheck({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
      <input type="checkbox" defaultChecked={defaultChecked} style={{ accentColor: '#1a6d3e', width: 15, height: 15 }} />
      <span style={{ color: '#151a17' }}>{label}</span>
    </label>
  )
}

function ExportBtn({ label }: { label: string }) {
  return (
    <button style={{ padding: '8px 16px', background: '#f7f9f6', border: '1px solid #d9e0d7', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#151a17' }}>
      📥 {label}
    </button>
  )
}
