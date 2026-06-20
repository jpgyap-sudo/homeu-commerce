import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Mail, MousePointerClick, Users, CalendarCheck, Flame } from 'lucide-react';
import { apiGet, API_BASE } from './lib/api';
import './styles.css';

type Summary = { customers: number; sent: number; opens: number; clicks: number; rfqs: number; appointments: number };
type Customer = {
  customer_id: string;
  email: string;
  full_name: string | null;
  sent_count: number;
  open_count: number;
  click_count: number;
  rfq_count: number;
  appointment_count: number;
  last_activity_at: string | null;
  lead_score: number;
  lead_status: 'hot' | 'warm' | 'cold';
};

function Card({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return <div className="card"><div className="icon">{icon}</div><div><p>{label}</p><strong>{value}</strong></div></div>;
}

function badge(status: string) {
  return `badge ${status}`;
}

function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [s, c] = await Promise.all([
        apiGet<Summary>('/stats/summary'),
        apiGet<Customer[]>('/stats/customers')
      ]);
      setSummary(s);
      setCustomers(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    }
  }

  useEffect(() => { load(); }, []);

  const openRate = summary && summary.sent ? Math.round((summary.opens / summary.sent) * 100) : 0;
  const clickRate = summary && summary.sent ? Math.round((summary.clicks / summary.sent) * 100) : 0;

  return <main>
    <header>
      <div>
        <h1>Email Trust Dashboard</h1>
        <p>Track opens, clicks, RFQs, appointments, contact-card downloads, and lead score.</p>
      </div>
      <button onClick={load}>Refresh</button>
    </header>

    {error && <div className="error">{error}</div>}

    <section className="grid">
      <Card label="Customers" value={summary?.customers ?? 0} icon={<Users size={22}/>} />
      <Card label="Emails Sent" value={summary?.sent ?? 0} icon={<Mail size={22}/>} />
      <Card label="Open Rate" value={`${openRate}%`} icon={<Flame size={22}/>} />
      <Card label="Click Rate" value={`${clickRate}%`} icon={<MousePointerClick size={22}/>} />
      <Card label="RFQs" value={summary?.rfqs ?? 0} icon={<MousePointerClick size={22}/>} />
      <Card label="Appointments" value={summary?.appointments ?? 0} icon={<CalendarCheck size={22}/>} />
    </section>

    <section className="panel">
      <h2>Customer Lead Scores</h2>
      <table>
        <thead><tr><th>Customer</th><th>Status</th><th>Score</th><th>Sent</th><th>Opens</th><th>Clicks</th><th>RFQs</th><th>Appointments</th><th>Last Activity</th></tr></thead>
        <tbody>
          {customers.map((c) => <tr key={c.customer_id}>
            <td><strong>{c.full_name || 'Unnamed'}</strong><br/><span>{c.email}</span></td>
            <td><span className={badge(c.lead_status)}>{c.lead_status}</span></td>
            <td>{c.lead_score}</td>
            <td>{c.sent_count}</td>
            <td>{c.open_count}</td>
            <td>{c.click_count}</td>
            <td>{c.rfq_count}</td>
            <td>{c.appointment_count}</td>
            <td>{c.last_activity_at ? new Date(c.last_activity_at).toLocaleString() : '-'}</td>
          </tr>)}
        </tbody>
      </table>
    </section>

    <section className="panel muted">
      <h2>Integration URLs</h2>
      <p>Open pixel: <code>{API_BASE}/t/open/MESSAGE_ID.gif</code></p>
      <p>Click redirect: <code>{API_BASE}/t/click/MESSAGE_ID?url=https://homeu.ph/products/example</code></p>
      <p>Contact card: <code>{API_BASE}/contact.vcf?customer_id=CUSTOMER_ID</code></p>
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
