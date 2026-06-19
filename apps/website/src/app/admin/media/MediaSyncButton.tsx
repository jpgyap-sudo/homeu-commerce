'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MediaSyncButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function sync() {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/admin/media/sync', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Sync failed')
      setMsg(`Synced ${d.indexed} · ${d.orphaned} unused`)
      router.refresh()
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {msg && <span style={{ fontSize: 12, color: '#667168' }}>{msg}</span>}
      <button
        onClick={sync}
        disabled={busy}
        title="Re-scan every product, article, theme & brand reference and rebuild the media index"
        style={{
          padding: '10px 18px', background: '#fff', color: '#1e7a47',
          border: '1.5px solid #cfe3d6', borderRadius: 10, fontSize: 14, fontWeight: 600,
          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Syncing…' : '↻ Re-sync'}
      </button>
    </span>
  )
}
