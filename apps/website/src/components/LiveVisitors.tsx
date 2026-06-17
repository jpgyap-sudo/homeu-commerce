'use client'

import { useEffect, useRef, useState } from 'react'

interface LiveData {
  active: number
  now: number
  recent: number
  admins: number
}

/**
 * LiveVisitors — real-time visitor counter with pulse animation.
 *
 * Polls /api/analytics/live every 8 seconds and sends a heartbeat
 * every 30 seconds to keep the visitor session active.
 *
 * Props:
 * - variant: 'badge' (compact counter) | 'card' (full breakdown)
 */
export default function LiveVisitors({ variant = 'badge' }: { variant?: 'badge' | 'card' }) {
  const [data, setData] = useState<LiveData>({ active: 0, now: 0, recent: 0, admins: 0 })
  const [pulse, setPulse] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const visitorId = useRef('')

  useEffect(() => {
    // Generate persistent visitor fingerprint
    try {
      let vid = localStorage.getItem('_hv')
      if (!vid) {
        vid = 'v_' + Math.random().toString(36).slice(2, 14) + '_' + Date.now().toString(36)
        localStorage.setItem('_hv', vid)
      }
      visitorId.current = vid
    } catch {
      visitorId.current = 'anon_' + Math.random().toString(36).slice(2, 10)
    }

    const fetchLive = async () => {
      try {
        const res = await fetch('/api/analytics/live')
        if (res.ok) {
          const json = await res.json()
          setData(json)
          if (json.now > 0) setPulse(true)
        }
      } catch { /* ignore */ }
    }

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/analytics/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId: visitorId.current,
            path: window.location.pathname,
            isAdmin: window.location.pathname.startsWith('/admin'),
          }),
          keepalive: true,
        })
      } catch { /* ignore */ }
    }

    // Initial fetch + heartbeat
    fetchLive()
    sendHeartbeat()

    // Poll every 8s for live data
    intervalRef.current = setInterval(fetchLive, 8000)
    // Heartbeat every 30s
    heartbeatRef.current = setInterval(sendHeartbeat, 30000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [])

  if (variant === 'badge') {
    return (
      <div
        title={`${data.active} active visitor${data.active !== 1 ? 's' : ''} (${data.now} now)\n${data.admins} admin(s) online`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 14px',
          background: data.now > 0 ? '#f0faf3' : '#f7f9f6',
          border: `1.5px solid ${data.now > 0 ? '#b7d4c2' : '#d9e0d7'}`,
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600,
          color: '#151a17',
          cursor: 'default',
          transition: 'all 0.3s',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Pulsing dot */}
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: data.now > 0 ? '#1a6d3e' : '#a09c96',
            animation: pulse ? 'live-pulse 2s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }}
        />
        <span>{data.active}</span>
        <span style={{ fontSize: 11, color: '#667168', fontWeight: 400 }}>
          live
        </span>
      </div>
    )
  }

  // Card variant — full breakdown
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #d9e0d7',
        borderRadius: 12,
        padding: 18,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#667168', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        👁️ Live Visitors
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <LiveStat label="Active Now" value={data.now} color="#1a6d3e" pulse />
        <LiveStat label="Last 5 min" value={data.active} color="#1a5bb5" />
        <LiveStat label="Last 15 min" value={data.recent} color="#667168" />
        <LiveStat label="Admins Online" value={data.admins} color="#d4a017" />
      </div>
    </div>
  )
}

function LiveStat({ label, value, color, pulse }: { label: string; value: number; color: string; pulse?: boolean }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '10px 8px',
      background: '#f7f9f6',
      borderRadius: 8,
      border: '1px solid #eef1ed',
      position: 'relative',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {pulse && value > 0 && (
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: color,
            animation: 'live-pulse 2s ease-in-out infinite',
            display: 'inline-block',
          }} />
        )}
        {value}
      </div>
      <div style={{ fontSize: 10, color: '#667168', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

// Inject keyframes once
if (typeof document !== 'undefined') {
  const styleId = 'live-visitors-keyframes'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes live-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.3); }
      }
    `
    document.head.appendChild(style)
  }
}
