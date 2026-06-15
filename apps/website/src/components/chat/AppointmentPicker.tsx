'use client'

import { useState, FormEvent } from 'react'

interface AppointmentPickerProps {
  leadId: string
  conversationId: string
  onSuccess: () => void
  onError: (error: string) => void
  onCancel: () => void
}

export function AppointmentPicker({ leadId, conversationId, onSuccess, onError, onCancel }: AppointmentPickerProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [visitors, setVisitors] = useState(1)
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!date || !time) {
      onError('Please select both date and time')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/appointments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          conversationId,
          preferredDate: date,
          preferredTime: time,
          visitorCount: visitors,
          categoriesOfInterest: category ? [category] : [],
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to book')
      }
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="chat-appointment" onSubmit={handleSubmit}>
      <label>
        Preferred Date
        <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} required />
      </label>

      <label>
        Preferred Time
        <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
      </label>

      <label>
        Number of Visitors
        <input type="number" min={1} max={20} value={visitors} onChange={e => setVisitors(parseInt(e.target.value) || 1)} />
      </label>

      <label>
        Categories of Interest (optional)
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          <option value="Dining Chairs">Dining Chairs</option>
          <option value="Sofas">Sofas</option>
          <option value="Tables">Tables</option>
          <option value="Lighting">Lighting</option>
          <option value="Bedroom">Bedroom</option>
          <option value="Storage">Storage</option>
          <option value="Rugs">Rugs</option>
          <option value="Ceiling Fans">Ceiling Fans</option>
          <option value="Wall Panels">Wall Panels</option>
        </select>
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="chat-submit-btn" type="submit" disabled={submitting} style={{ flex: 1 }}>
          {submitting ? 'Booking...' : 'Request Visit'}
        </button>
        <button type="button" className="chat-submit-btn" onClick={onCancel}
          style={{ flex: 1, background: 'transparent', color: '#173f2f', border: '1px solid #dfd8ce' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}
