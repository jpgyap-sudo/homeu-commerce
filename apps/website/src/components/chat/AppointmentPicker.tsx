'use client'

import { useState, useEffect, FormEvent } from 'react'

interface AppointmentPickerProps {
  leadId: string
  conversationId: string
  onSuccess: () => void
  onError: (error: string) => void
  onCancel: () => void
}

const HARDCODED_CATEGORIES = [
  'Dining Chairs',
  'Sofas',
  'Tables',
  'Lighting',
  'Bedroom',
  'Storage',
  'Rugs',
  'Ceiling Fans',
  'Wall Panels',
]

interface CategoryOption {
  id: string
  title: string
}

export function AppointmentPicker({ leadId, conversationId, onSuccess, onError, onCancel }: AppointmentPickerProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [visitors, setVisitors] = useState(1)
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories?limit=100')
        if (!res.ok) throw new Error('Failed to load categories')
        const data = await res.json()
        const docs: { id: string; title: string }[] = data.docs || []
        if (docs.length > 0) {
          setCategories(docs.map(c => ({ id: c.id, title: c.title })))
        } else {
          // API returned empty — use hardcoded fallback
          setCategories(HARDCODED_CATEGORIES.map((title, i) => ({ id: `fallback-${i}`, title })))
        }
      } catch {
        // API unavailable — use hardcoded fallback
        setCategories(HARDCODED_CATEGORIES.map((title, i) => ({ id: `fallback-${i}`, title })))
      } finally {
        setCategoriesLoading(false)
      }
    }
    loadCategories()
  }, [])

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
          {categoriesLoading ? (
            <option value="" disabled>Loading categories...</option>
          ) : (
            categories.map(cat => (
              <option key={cat.id} value={cat.title}>{cat.title}</option>
            ))
          )}
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
