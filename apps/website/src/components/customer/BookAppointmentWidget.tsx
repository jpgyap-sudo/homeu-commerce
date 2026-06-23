'use client'

import { useState, useEffect } from 'react'

interface Appointment {
  id: string
  preferredDate?: string
  preferred_date?: string
  preferredTime?: string
  preferred_time?: string
  visitorCount: number
  status: string
  createdAt: string
}

interface AppointmentSlot {
  time: string
  label: string
  count: number
  capacity: number
  fullyBooked: boolean
}

interface SlotAvailability {
  openTime: string
  closeTime: string
  slots: AppointmentSlot[]
}

const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
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
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability | null>(null)
  const [insistFullyBooked, setInsistFullyBooked] = useState(false)

  function load(slotDate = date) {
    const qs = slotDate ? `?date=${encodeURIComponent(slotDate)}` : ''
    fetch(`/api/customer/appointments${qs}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { appointments: [], slotAvailability: null })
      .then(d => {
        setAppointments(d.appointments || [])
        setSlotAvailability(d.slotAvailability || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load('') }, [])

  useEffect(() => {
    setTime('')
    setInsistFullyBooked(false)
    if (!date) {
      setSlotAvailability(null)
      return
    }
    load(date)
  }, [date])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMsg('')
    try {
      const res = await fetch('/api/customer/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preferredDate: date, preferredTime: time, visitorCount, notes, insistFullyBooked }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment')
      setMsg(data.warning || 'Appointment requested! We will confirm shortly.')
      setShowForm(false)
      setDate('')
      setTime('')
      setVisitorCount(1)
      setNotes('')
      setInsistFullyBooked(false)
      load('')
    } catch (err: any) {
      setMsg(err.message || 'Failed to book appointment')
    } finally {
      setSubmitting(false)
    }
  }

  const upcoming = appointments.find(a => a.status === 'requested' || a.status === 'confirmed')
  const upcomingDate = upcoming?.preferredDate || upcoming?.preferred_date || ''
  const upcomingTime = upcoming?.preferredTime || upcoming?.preferred_time || ''
  const upcomingDateOnly = upcomingDate.includes('T') ? upcomingDate.slice(0, 10) : upcomingDate
  const upcomingDateLabel = upcomingDateOnly
    ? new Date(`${upcomingDateOnly}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Date to be confirmed'
  const selectedSlot = slotAvailability?.slots.find(slot => slot.time === time)

  return (
    <div className="dashboard-appointment-widget">
      <div className="dashboard-section-heading">
        <h2>Book an Appointment</h2>
        {!showForm && <button type="button" className="btn btn--primary" onClick={() => setShowForm(true)}>+ Book Visit</button>}
      </div>

      {!loading && upcoming && !showForm && (
        <div className="dashboard-appointment-upcoming">
          <strong>Upcoming visit:</strong> {upcomingDateLabel}{upcomingTime ? ` at ${upcomingTime}` : ''}
          <span className="dashboard-appointment-status">{STATUS_LABELS[upcoming.status] || upcoming.status}</span>
        </div>
      )}

      {!loading && !upcoming && !showForm && (
        <p className="dashboard-appointment-empty">Visit our showroom for a hands-on consultation - book a time that works for you.</p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="dashboard-appointment-form">
          <div className="dashboard-appointment-form-row">
            <label>
              Date
              <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} required />
            </label>
            <label>
              Visitors
              <input type="number" min={1} max={20} value={visitorCount} onChange={e => setVisitorCount(Number(e.target.value))} required />
            </label>
          </div>

          {date && slotAvailability && (
            <div className="dashboard-appointment-slots">
              <div className="dashboard-appointment-slot-head">
                <strong>Choose a visit time</strong>
                <span>Working hours: {slotAvailability.openTime} - {slotAvailability.closeTime}</span>
              </div>
              <div className="dashboard-appointment-slot-grid">
                {slotAvailability.slots.map(slot => (
                  <button
                    key={slot.time}
                    type="button"
                    className={[
                      'dashboard-appointment-slot',
                      slot.fullyBooked ? 'is-full' : 'is-open',
                      time === slot.time ? 'is-selected' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => {
                      setTime(slot.time)
                      setInsistFullyBooked(false)
                    }}
                    aria-pressed={time === slot.time}
                  >
                    <span>{slot.label}</span>
                    <small>{slot.fullyBooked ? 'Fully booked' : `${slot.capacity - slot.count} slot${slot.capacity - slot.count === 1 ? '' : 's'} left`}</small>
                  </button>
                ))}
              </div>
              {selectedSlot?.fullyBooked && (
                <label className="dashboard-appointment-full-warning">
                  <input
                    type="checkbox"
                    checked={insistFullyBooked}
                    onChange={e => setInsistFullyBooked(e.target.checked)}
                  />
                  <span>This time is fully booked. I still want to request it and understand priority service cannot be assured.</span>
                </label>
              )}
            </div>
          )}

          <label>
            Notes (optional)
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="What would you like to see or discuss?" />
          </label>
          <div className="dashboard-appointment-form-actions">
            <button type="submit" className="btn btn--primary" disabled={submitting || !time || Boolean(selectedSlot?.fullyBooked && !insistFullyBooked)}>{submitting ? 'Booking...' : 'Request Appointment'}</button>
            <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {msg && <p className="dashboard-appointment-msg">{msg}</p>}
    </div>
  )
}
