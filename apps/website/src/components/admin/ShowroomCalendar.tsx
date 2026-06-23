'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CalendarEvent {
  id: string
  type: 'appointment' | 'quotation'
  date: string // YYYY-MM-DD
  title: string
  time: string
  status: string
  color: string
  href: string
}

interface ShowroomCalendarProps {
  initialEvents?: CalendarEvent[]
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

export default function ShowroomCalendar({ initialEvents }: ShowroomCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents || [])
  const [loading, setLoading] = useState(!initialEvents)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(getLocalYYYYMMDD())

  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents)
      setLoading(false)
      return
    }

    let active = true
    async function loadEvents() {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/dashboard/tasks', { credentials: 'include' })
        if (res.ok && active) {
          const data = await res.json()
          setEvents(data.calendarEvents || [])
        }
      } catch (err) {
        console.error('[ShowroomCalendar] Failed to load events:', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadEvents()
    return () => {
      active = false
    }
  }, [initialEvents])

  // Calendar calculations
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const prevMonthDays = new Date(year, month, 0).getDate()
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(getLocalYYYYMMDD(today))
  }

  // Days grid generation
  const daysGrid = []
  
  // 1. Previous month buffer days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    daysGrid.push({ day: d, dateStr, isCurrentMonth: false })
  }

  // 2. Active month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    daysGrid.push({ day: d, dateStr, isCurrentMonth: true })
  }

  // 3. Next month buffer days
  const remainingSlots = 42 - daysGrid.length
  for (let d = 1; d <= remainingSlots; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    daysGrid.push({ day: d, dateStr, isCurrentMonth: false })
  }

  // Group events by YYYY-MM-DD
  const eventsByDate = events.reduce((acc: Record<string, CalendarEvent[]>, event) => {
    if (!event.date) return acc
    if (!acc[event.date]) acc[event.date] = []
    acc[event.date].push(event)
    return acc
  }, {})

  const selectedDayEvents = eventsByDate[selectedDate] || []

  if (loading) {
    return (
      <div style={{ padding: '24px', background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, textAlign: 'center', color: '#667168' }}>
        Loading calendar schedule...
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #d9e0d7', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
      {/* Calendar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--luxe-navy-900)', fontFamily: 'var(--font-display)' }}>
            Showroom Schedule &amp; Activity
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#667168' }}>
            Quotations sent (green/slate) &amp; showroom visits (blue)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={handlePrevMonth} style={navBtnStyle}>&larr;</button>
          <span style={{ fontSize: 15, fontWeight: 700, minWidth: 120, textAlign: 'center', color: 'var(--luxe-navy-900)' }}>
            {monthNames[month]} {year}
          </span>
          <button onClick={handleNextMonth} style={navBtnStyle}>&rarr;</button>
          <button onClick={handleToday} style={{ ...navBtnStyle, marginLeft: 8, padding: '6px 12px', fontSize: 12, background: 'var(--luxe-warm-50)' }}>Today</button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {/* Days of week */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ background: '#f8fafc', padding: '10px 4px', textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}

        {/* Days slots */}
        {daysGrid.map((slot, index) => {
          const dayEvents = eventsByDate[slot.dateStr] || []
          const isSelected = selectedDate === slot.dateStr
          const isToday = getLocalYYYYMMDD() === slot.dateStr

          return (
            <div
              key={index}
              onClick={() => setSelectedDate(slot.dateStr)}
              style={{
                background: slot.isCurrentMonth ? (isSelected ? '#f0fdf4' : '#fff') : '#f8fafc',
                minHeight: 80,
                padding: '8px 6px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                position: 'relative',
                boxShadow: isSelected ? 'inset 0 0 0 2px #22c55e' : 'none',
              }}
            >
              {/* Day Number */}
              <div style={{ 
                fontSize: 12, 
                fontWeight: isToday ? 800 : 500, 
                color: slot.isCurrentMonth ? (isToday ? '#22c55e' : '#1e293b') : '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: isToday ? '#e8f5e9' : 'transparent',
              }}>
                {slot.day}
              </div>

              {/* Day Events Indicators */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, overflow: 'hidden' }}>
                {dayEvents.slice(0, 3).map((evt, eIdx) => (
                  <div
                    key={eIdx}
                    style={{
                      background: evt.color + '15',
                      color: evt.color,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 4px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                    title={evt.title}
                  >
                    {evt.type === 'quotation' ? '📄 ' : '📅 '}
                    {evt.title.split(': ')[1] || evt.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textAlign: 'center', padding: '1px 0' }}>
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Day Detail List */}
      <div style={{ marginTop: 20, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--luxe-navy-900)' }}>
          Events on {formatSelectedDayHeader(selectedDate)}
        </h4>

        {selectedDayEvents.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
            No appointments or quotations scheduled on this date.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedDayEvents.map((evt, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fff',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{evt.type === 'quotation' ? '📄' : '📅'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{evt.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {evt.time && <span style={{ marginRight: 8 }}>⏰ {evt.time}</span>}
                      <span style={{ textTransform: 'capitalize', fontWeight: 600, color: evt.color }}>
                        {evt.status}
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href={evt.href}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#22c55e',
                    border: '1px solid #22c55e',
                    borderRadius: 6,
                    textDecoration: 'none',
                    background: 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  View Details &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
