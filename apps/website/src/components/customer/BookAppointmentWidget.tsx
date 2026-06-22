'use client'

import { useState, useEffect } from 'react'

interface Appointment {
  id: string
  preferredDate: string
  preferredTime: string
  visitorCount: number
  status: string
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  requested: '🟡 Requested',
  confirmed: '🟢 Confirmed',
  completed: '✅ Completed',
  cancelled: '⚪ Cancelled',
}

export default function BookAppointmentWidget() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [visitorCount, setVisitorCount] = useState(1)
  const [notes, setNotes] = useState('')

  function load() {
    fetch('/api/customer/appointments', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { appointments: [] })
      .then(d => setAppointments(d.appointments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMsg('')
    try {
      const res = await fetch('/api/customer/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preferredDate: date, preferredTime: time, visitorCount, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment')
      setMsg('Appointment requested! We will confirm shortly.')
      setShowForm(false); setDate(''); setTime(''); setVisitorCount(1); setNotes('')
      load()
    } catch (err: any) {
      setMsg(err.message || 'Failed to book appointment')
    } finally {
      setSubmitting(false)
    }
  }

  const upcoming = appointments.find(a => a.status === 'requested' || a.status === 'confirmed')

  return (
    <div className="dashboard-appointment-widget">
      <div className="dashboard-section-heading">
        <h2>📅 Book an Appointment</h2>
        {!showForm && <button type="button" className="btn btn--primary" onClick={() => setShowForm(true)}>+ Book Visit</button>}
      </div>

      {!loading && upcoming && !showForm && (
        <div className="dashboard-appointment-upcoming">
          <strong>Upcoming visit:</strong> {new Date(`${upcoming.preferredDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} at {upcoming.preferredTime}
          <span className="dashboard-appointment-status">{STATUS_LABELS[upcoming.status] || upcoming.status}</span>
        </div>
      )}

      {!loading && !upcoming && !showForm && (
        <p className="dashboard-appointment-empty">Visit our showroom for a hands-on consultation — book a time that works for you.</p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="dashboard-appointment-form">
          <div className="dashboard-appointment-form-row">
            <label>
              Date
              <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} required />
            </label>
            <label>
              Time
              <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
            </label>
            <label>
              Visitors
              <input type="number" min={1} max={20} value={visitorCount} onChange={e => setVisitorCount(Number(e.target.value))} required />
            </label>
          </div>
          <label>
            Notes (optional)
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="What would you like to see or discuss?" />
          </label>
          <div className="dashboard-appointment-form-actions">
            <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Booking…' : 'Request Appointment'}</button>
            <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {msg && <p className="dashboard-appointment-msg">{msg}</p>}
    </div>
  )
}
