'use client'

import { useState, useEffect } from 'react'

/**
 * Add to Home Screen prompt banner.
 *
 * Shows the install banner after a meaningful user action (RFQ submit,
 * lead capture) rather than on first visit, which dramatically improves
 * conversion rates.
 *
 * Usage: <InstallPrompt trigger={showTrigger} />
 *   Set showTrigger=true after a meaningful action (e.g., RFQ submitted).
 */

interface InstallPromptProps {
  trigger?: boolean
}

export default function InstallPrompt({ trigger = false }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check dismissal preference
    try {
      const pref = localStorage.getItem('homeu-install-dismissed')
      if (pref) {
        setDismissed(true)
        return
      }
    } catch { /* localStorage unavailable */ }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setVisible(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Show banner when trigger fires AND prompt is available
  useEffect(() => {
    if (trigger && deferredPrompt && !isInstalled && !dismissed) {
      setVisible(true)
    }
  }, [trigger, deferredPrompt, isInstalled, dismissed])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    try {
      localStorage.setItem('homeu-install-dismissed', 'true')
    } catch { /* noop */ }
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: '#fff',
      borderTop: '1px solid #eef1ed',
      padding: '16px 20px',
      paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: 'Inter, sans-serif',
    }}>
      <img
        src="/icons/icon-192x192.png"
        alt="HomeU"
        style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#151a17' }}>Install HomeU</div>
        <div style={{ fontSize: 12, color: '#667168', marginTop: 2 }}>
          Get faster access to our catalog & quotations
        </div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          padding: '10px 20px',
          background: 'linear-gradient(180deg, #1e7a47, #0f4f2b)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 14px rgba(26,109,62,0.35)',
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          fontSize: 18,
          color: '#9aa69c',
          cursor: 'pointer',
          padding: '4px 8px',
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  )
}
