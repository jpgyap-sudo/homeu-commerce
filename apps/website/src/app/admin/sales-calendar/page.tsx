'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  dbId: number | string
  type: 'appointment' | 'quotation' | 'rfq' | 'custom'
  eventType?: 'task' | 'site_visit' | 'appointment' | 'note' | 'meeting' | 'presentation'
  date: string // YYYY-MM-DD
  time: string
  title: string
  description?: string
  status: string
  color: string
  href: string
  customer?: { id: number | null; name: string; email?: string; phone?: string } | null
}

interface CustomerRow {
  id: number
  name: string
  email: string
  phone: string | null
  company: string | null
}

interface TimelineEvent {
  id: string
  timestamp: string
  eventType: string
  title: string
  description: string
  notes?: string
  href?: string
}

function getLocalYYYYMMDD(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const date = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${date}`
}

function formatSelectedDayHeader(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const dateObj = new Date(year, month, day)
  return dateObj.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function SalesCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(getLocalYYYYMMDD())
  const [showAddModal, setShowAddModal] = useState(false)

  // Filters state
  const [filterTypes, setFilterTypes] = useState({
    appointment: true,
    quotation: true,
    rfq: true,
    task: true,
    site_visit: true,
    meeting: true,
    presentation: true,
    note: true,
  })

  // Add Event Form State
  const [newType, setNewType] = useState<'task' | 'site_visit' | 'appointment' | 'note' | 'meeting' | 'presentation'>('task')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newDate, setNewDate] = useState('')
  const [searchCustQuery, setSearchCustQuery] = useState('')
  const [custResults, setCustResults] = useState<CustomerRow[]>([])
  const [selectedCust, setSelectedCust] = useState<CustomerRow | null>(null)
  const [showCustDropdown, setShowCustDropdown] = useState(false)
  const [savingEvent, setSavingEvent] = useState(false)

  // Customer Timeline State
  const [timelineCust, setTimelineCust] = useState<CustomerRow | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [searchTimelineQuery, setSearchTimelineQuery] = useState('')
  const [timelineSearchSuggestions, setTimelineSearchSuggestions] = useState<CustomerRow[]>([])
  const [showTimelineSuggestions, setShowTimelineSuggestions] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const timelineDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch all events on mount & changes
  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/sales-calendar')
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch (err) {
      console.error('[SalesCalendar] Error loading events:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load Customer Suggestions for Form Autocomplete
  useEffect(() => {
    if (searchCustQuery.length < 2) {
      setCustResults([])
      return
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(searchCustQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setCustResults(data.customers || [])
        }
      } catch (err) {
        console.error('Customer search error:', err)
      }
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchCustQuery])

  // Load Customer Suggestions for Timeline Sidebar
  useEffect(() => {
    if (searchTimelineQuery.length < 2) {
      setTimelineSearchSuggestions([])
      return
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(searchTimelineQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setTimelineSearchSuggestions(data.customers || [])
        }
      } catch (err) {
        console.error('Customer search error:', err)
      }
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [searchTimelineQuery])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustDropdown(false)
      }
      if (timelineDropdownRef.current && !timelineDropdownRef.current.contains(event.target as Node)) {
        setShowTimelineSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch timeline when customer is selected
  useEffect(() => {
    if (!timelineCust) {
      setTimelineEvents([])
      return
    }
    const custId = timelineCust.id
    async function loadCustomerTimeline() {
      try {
        setLoadingTimeline(true)
        const res = await fetch(`/api/admin/sales-calendar/timeline/${custId}`)
        if (res.ok) {
          const data = await res.json()
          setTimelineEvents(data.timeline || [])
        }
      } catch (err) {
        console.error('Failed to load timeline:', err)
      } finally {
        setLoadingTimeline(false)
      }
    }
    loadCustomerTimeline()
  }, [timelineCust])

  // Calendar Calculations
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(getLocalYYYYMMDD(today))
  }

  // Days Grid Layout
  const daysGrid = []
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    daysGrid.push({ day: d, dateStr, isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    daysGrid.push({ day: d, dateStr, isCurrentMonth: true })
  }
  const remainingSlots = 42 - daysGrid.length
  for (let d = 1; d <= remainingSlots; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    daysGrid.push({ day: d, dateStr, isCurrentMonth: false })
  }

  // Filter and Group Events by YYYY-MM-DD
  const filteredEvents = events.filter(evt => {
    if (evt.type === 'appointment') return filterTypes.appointment
    if (evt.type === 'quotation') return filterTypes.quotation
    if (evt.type === 'rfq') return filterTypes.rfq
    if (evt.type === 'custom') {
      const type = evt.eventType || 'task'
      return filterTypes[type]
    }
    return true
  })

  const eventsByDate = filteredEvents.reduce((acc: Record<string, CalendarEvent[]>, event) => {
    if (!event.date) return acc
    if (!acc[event.date]) acc[event.date] = []
    acc[event.date].push(event)
    return acc
  }, {})

  const selectedDayEvents = eventsByDate[selectedDate] || []

  // Add Event Callback
  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newDate) {
      alert('Title and Date are required')
      return
    }

    setSavingEvent(true)
    try {
      const res = await fetch('/api/admin/sales-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: newType,
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          eventDate: newDate,
          eventTime: newTime || undefined,
          customerId: selectedCust?.id || undefined,
        })
      })

      if (res.ok) {
        setShowAddModal(false)
        setNewTitle('')
        setNewDesc('')
        setNewTime('')
        setSelectedCust(null)
        setSearchCustQuery('')
        // Refresh local events list
        loadEvents()
        
        // If current customer is selected, also reload timeline
        if (selectedCust && timelineCust && selectedCust.id === timelineCust.id) {
          // Trigger timeline reload
          setTimelineCust({ ...timelineCust })
        }
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to save event')
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while saving')
    } finally {
      setSavingEvent(false)
    }
  }

  // Delete Custom Event
  async function handleDeleteEvent(id: string, dbId: number | string) {
    if (!confirm('Are you sure you want to delete this custom event?')) return

    try {
      const res = await fetch(`/api/admin/sales-calendar/${dbId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setEvents(prev => prev.filter(evt => evt.id !== id))
        // If current customer timeline is loaded, refresh it
        if (timelineCust) {
          setTimelineCust({ ...timelineCust })
        }
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to delete event')
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while deleting')
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: '30px auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Sales Calendar</h1>
        <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>
          Interactive schedule, task lists, and visual pipeline customer timelines.
        </p>
      </div>

      {/* Filter Checkboxes */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap', padding: 12, background: '#f8fafc',
        borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20, fontSize: 13, fontWeight: 500
      }}>
        <span style={{ color: '#475569', alignSelf: 'center', marginRight: 8 }}>Filter Calendar:</span>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={filterTypes.appointment} onChange={e => setFilterTypes(p => ({ ...p, appointment: e.target.checked }))} />
          <span style={{ color: '#2563eb' }}>Showroom Visits</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={filterTypes.quotation} onChange={e => setFilterTypes(p => ({ ...p, quotation: e.target.checked }))} />
          <span style={{ color: '#ea580c' }}>Quotations</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={filterTypes.rfq} onChange={e => setFilterTypes(p => ({ ...p, rfq: e.target.checked }))} />
          <span style={{ color: '#06b6d4' }}>RFQs</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={filterTypes.site_visit} onChange={e => setFilterTypes(p => ({ ...p, site_visit: e.target.checked }))} />
          <span style={{ color: '#a855f7' }}>Site Visits</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={filterTypes.meeting} onChange={e => setFilterTypes(p => ({ ...p, meeting: e.target.checked }))} />
          <span style={{ color: '#d946ef' }}>Outside Meetings</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={filterTypes.presentation} onChange={e => setFilterTypes(p => ({ ...p, presentation: e.target.checked }))} />
          <span style={{ color: '#ec4899' }}>Outside Presentations</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={filterTypes.task} onChange={e => setFilterTypes(p => ({ ...p, task: e.target.checked }))} />
          <span style={{ color: '#3b82f6' }}>Tasks</span>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={filterTypes.note} onChange={e => setFilterTypes(p => ({ ...p, note: e.target.checked }))} />
          <span style={{ color: '#6b7280' }}>Notes</span>
        </label>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 24 }}>
        
        {/* Left Column: Calendar */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            
            {/* Nav Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  {monthNames[month]} {year}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={handlePrevMonth} style={navBtnStyle}>&larr;</button>
                <button onClick={handleToday} style={{ ...navBtnStyle, width: 'auto', padding: '0 12px', fontSize: 12 }}>Today</button>
                <button onClick={handleNextMonth} style={navBtnStyle}>&rarr;</button>
              </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#cbd5e1', borderRadius: 6, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              {/* Days of week */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ background: '#f8fafc', padding: '8px 2px', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center' }}>
                  {d}
                </div>
              ))}

              {/* Day cells */}
              {daysGrid.map((slot, idx) => {
                const dayEvents = eventsByDate[slot.dateStr] || []
                const isSelected = selectedDate === slot.dateStr
                const isToday = getLocalYYYYMMDD() === slot.dateStr

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(slot.dateStr)}
                    style={{
                      background: slot.isCurrentMonth ? (isSelected ? '#ecfdf5' : '#fff') : '#f8fafc',
                      minHeight: 90,
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.1s ease',
                      position: 'relative',
                      boxShadow: isSelected ? 'inset 0 0 0 2px #10b981' : 'none',
                    }}
                  >
                    {/* Day Number */}
                    <div style={{
                      fontSize: 11,
                      fontWeight: isToday ? 800 : 500,
                      color: slot.isCurrentMonth ? (isToday ? '#10b981' : '#1e293b') : '#94a3b8',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: isToday ? '#d1fae5' : 'transparent',
                    }}>
                      {slot.day}
                    </div>

                    {/* Event badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, flex: 1, overflow: 'hidden', justifyContent: 'flex-end' }}>
                      {dayEvents.slice(0, 3).map((evt, eIdx) => {
                        let icon = '•'
                        if (evt.type === 'appointment') icon = '📅'
                        else if (evt.type === 'quotation') icon = '📄'
                        else if (evt.type === 'rfq') icon = '📋'
                        else if (evt.type === 'custom') {
                          if (evt.eventType === 'site_visit') icon = '🏠'
                          else if (evt.eventType === 'meeting') icon = '💼'
                          else if (evt.eventType === 'presentation') icon = '📊'
                          else if (evt.eventType === 'note') icon = '📝'
                          else if (evt.eventType === 'task') icon = '✅'
                        }
                        return (
                          <div
                            key={eIdx}
                            style={{
                              background: evt.color + '15',
                              color: evt.color,
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '2px 4px',
                              borderRadius: 4,
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                            }}
                            title={evt.title}
                          >
                            {icon} {evt.title.split(': ')[1] || evt.title}
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textAlign: 'center' }}>
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

          </div>
        </div>

        {/* Right Column: Panel details */}
        <div>
          
          {/* Selected Date Actions */}
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Selected Date</h3>
              <button
                type="button"
                onClick={() => {
                  setNewDate(selectedDate)
                  setShowAddModal(true)
                }}
                style={{
                  padding: '5px 12px', background: '#1e293b', color: '#fff', border: 'none',
                  borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}
              >
                + Add Event
              </button>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 12 }}>
              🗓️ {formatSelectedDayHeader(selectedDate)}
            </div>

            {selectedDayEvents.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                No events scheduled.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedDayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: 10, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8,
                      display: 'flex', flexDirection: 'column', gap: 4, position: 'relative'
                    }}
                  >
                    {evt.type === 'custom' && (
                      <button
                        onClick={() => handleDeleteEvent(evt.id, evt.dbId)}
                        style={{
                          position: 'absolute', top: 6, right: 6, background: 'none', border: 'none',
                          color: '#ef4444', fontSize: 13, cursor: 'pointer', padding: 0
                        }}
                        title="Delete custom event"
                      >
                        ✕
                      </button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: evt.color
                      }} />
                      <strong style={{ fontSize: 12, color: '#1e293b' }}>{evt.title}</strong>
                    </div>
                    {evt.description && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569', lineBreak: 'anywhere' }}>{evt.description}</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: 11 }}>
                      <span style={{ color: '#64748b' }}>
                        {evt.time ? `⏰ ${evt.time}` : '—'}
                      </span>
                      {evt.type !== 'custom' ? (
                        <Link href={evt.href} style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
                          Open &rarr;
                        </Link>
                      ) : evt.customer ? (
                        <button
                          type="button"
                          onClick={() => setTimelineCust(evt.customer ? {
                            id: evt.customer.id || 0,
                            name: evt.customer.name,
                            email: evt.customer.email || '',
                            phone: evt.customer.phone || null,
                            company: null
                          } : null)}
                          style={{
                            background: 'none', border: 'none', padding: 0, color: '#6366f1',
                            fontWeight: 600, fontSize: 11, cursor: 'pointer'
                          }}
                        >
                          View Timeline &rarr;
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Pipeline Timeline Search & Viewer */}
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Customer Timeline</h3>
            
            {/* Search customer box */}
            <div ref={timelineDropdownRef} style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search customer timeline..."
                value={searchTimelineQuery}
                onChange={e => {
                  setSearchTimelineQuery(e.target.value)
                  setShowTimelineSuggestions(true)
                }}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1',
                  borderRadius: 6, fontSize: 13, boxSizing: 'border-box'
                }}
              />
              {showTimelineSuggestions && timelineSearchSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff',
                  border: '1px solid #cbd5e1', borderRadius: 6, boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                  zIndex: 200, maxHeight: 150, overflowY: 'auto', marginTop: 4
                }}>
                  {timelineSearchSuggestions.map(cust => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        setTimelineCust(cust)
                        setSearchTimelineQuery('')
                        setShowTimelineSuggestions(false)
                      }}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eef1ed', fontSize: 13 }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                    >
                      <strong style={{ display: 'block' }}>{cust.name}</strong>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{cust.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline display */}
            {timelineCust ? (
              <div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  paddingBottom: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 12
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{timelineCust.name}</h4>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{timelineCust.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      setTimelineCust(null)
                      setTimelineEvents([])
                    }}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, padding: 0 }}
                  >
                    Clear
                  </button>
                </div>

                {loadingTimeline ? (
                  <p style={{ fontSize: 13, color: '#666', textAlign: 'center' }}>Loading customer timeline...</p>
                ) : timelineEvents.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                    No interactions logged in pipeline.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 12, borderLeft: '2.5px dotted #cbd5e1', gap: 14 }}>
                    {timelineEvents.map((evt, idx) => (
                      <div key={evt.id || idx} style={{ position: 'relative', fontSize: 12 }}>
                        {/* Dot indicator */}
                        <div style={{
                          position: 'absolute', top: 3, left: -18, width: 9, height: 9, borderRadius: '50%',
                          background: evt.eventType.includes('accepted') || evt.eventType.includes('completed') ? '#10b981' :
                                      evt.eventType.includes('revision') || evt.eventType.includes('revised') ? '#f59e0b' :
                                      evt.eventType.includes('submitted') || evt.eventType.includes('rfq') ? '#06b6d4' : '#3b82f6',
                          border: '2px solid #fff',
                        }} />
                        <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{evt.title}</div>
                        <div style={{ color: '#475569', marginBottom: 2 }}>{evt.description}</div>
                        {evt.notes && (
                          <div style={{
                            fontSize: 11, fontStyle: 'italic', background: '#f8fafc', padding: 6,
                            borderRadius: 4, border: '1px solid #eef1ed', color: '#475569', whiteSpace: 'pre-line'
                          }}>
                            {evt.notes}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: 10, color: '#94a3b8' }}>
                          <span>{new Date(evt.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          {evt.href && evt.href !== '#' && (
                            <Link href={evt.href} style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
                              Details &rarr;
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
                Select a customer above to view their sales pipeline history.
              </p>
            )}
          </div>

        </div>

      </div>

      {/* Add Event Modal Dialog */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }}>
          <form
            onSubmit={handleAddEvent}
            style={{
              background: '#fff', borderRadius: 12, padding: 24, maxWidth: 500, width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box'
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Add Calendar Event</h3>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Event Type *</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                >
                  <option value="task">✅ Task / To-Do</option>
                  <option value="site_visit">🏠 Site Visit</option>
                  <option value="appointment">📅 Showroom Visit / Appointment</option>
                  <option value="meeting">💼 Meeting (Outside Office)</option>
                  <option value="presentation">📊 Presentation (Outside Office)</option>
                  <option value="note">📝 Note / Reminder</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Presentation of Design Plans"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Time</label>
                  <input
                    type="text"
                    placeholder="E.g. 10:00 AM"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Link to Customer</label>
                {selectedCust ? (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 6, fontSize: 13
                  }}>
                    <div>
                      <strong>{selectedCust.name}</strong> ({selectedCust.email})
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCust(null)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12, padding: 0 }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Type customer name, email..."
                      value={searchCustQuery}
                      onChange={e => {
                        setSearchCustQuery(e.target.value)
                        setShowCustDropdown(true)
                      }}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                    />
                    {showCustDropdown && custResults.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff',
                        border: '1px solid #cbd5e1', borderRadius: 6, boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                        zIndex: 200, maxHeight: 150, overflowY: 'auto', marginTop: 4
                      }}>
                        {custResults.map(cust => (
                          <div
                            key={cust.id}
                            onClick={() => {
                              setSelectedCust(cust)
                              setSearchCustQuery('')
                              setShowCustDropdown(false)
                            }}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eef1ed', fontSize: 13 }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                          >
                            <strong style={{ display: 'block' }}>{cust.name}</strong>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{cust.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Description / Notes</label>
                <textarea
                  placeholder="Add details, addresses, presentation details, notes..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedCust(null)
                  setSearchCustQuery('')
                }}
                style={{
                  padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1',
                  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEvent}
                style={{
                  padding: '8px 24px', background: '#1e293b', color: '#fff', border: 'none',
                  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: savingEvent ? 'not-allowed' : 'pointer',
                  opacity: savingEvent ? 0.7 : 1
                }}
              >
                {savingEvent ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </form>
        </div>
      )}

    </main>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  width: 32,
  height: 32,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: 14,
  outline: 'none',
}
