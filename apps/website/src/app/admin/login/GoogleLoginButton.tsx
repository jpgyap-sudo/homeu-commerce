'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Google Sign-In Button component.
 *
 * Uses Google Identity Services (GIS) for the One Tap UX and the standard
 * "Sign in with Google" button.
 *
 * Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID to be set in .env
 *
 * Usage: <GoogleLoginButton />
 * Must be inside a <form> or standalone — handles redirection on success.
 */

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export function GoogleLoginButton() {
  const router = useRouter()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const initializedRef = useRef(false)

  // Initialize Google Identity Services
  useEffect(() => {
    // Skip if no client ID configured or already initialized
    if (!GOOGLE_CLIENT_ID || initializedRef.current) return

    // Load the Google GIS script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      initializedRef.current = true

      // Initialize the Google One Tap / Sign-In client
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          cancel_on_tap_outside: false,
          auto_select: false,
        })

        // Render the standard Google Sign-In button
        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            shape: 'pill',
            theme: 'outline',
            text: 'signin_with',
            size: 'large',
            logo_alignment: 'left',
            width: 320,
          })
        }
      }
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel()
      }
    }
  }, [])

  /**
   * Handle the credential response from Google.
   * Sends the ID token to our backend for verification and session creation.
   */
  async function handleGoogleCredential(response: { credential: string }) {
    if (!response?.credential) {
      setError('Google sign-in failed — no credential received')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed')
      }

      // Success — redirect to dashboard
      router.push('/admin/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  // If no Google Client ID is configured, don't render anything
  if (!GOOGLE_CLIENT_ID) {
    return null
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 14,
      }}>
        <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
        <span style={{ fontSize: 12, color: '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          or continue with
        </span>
        <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
      </div>

      {/* Google button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div ref={buttonRef} />
      </div>

      {loading && (
        <div style={{
          textAlign: 'center', marginTop: 10, fontSize: 13, color: '#666',
        }}>
          Signing in with Google...
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 10, padding: '8px 12px', background: '#fef2f2',
          color: '#dc2626', borderRadius: 6, fontSize: 13, textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {/* Hidden iframe for One Tap — renders above the page */}
      <div id="g_id_onload"
        data-client_id={GOOGLE_CLIENT_ID}
        data-callback="handleGoogleCredential"
        data-auto_prompt="false"
        style={{ display: 'none' }}
      />
    </div>
  )
}

// TypeScript declaration for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            cancel_on_tap_outside?: boolean
            auto_select?: boolean
          }) => void
          renderButton: (element: HTMLElement, options: {
            type?: string
            shape?: string
            theme?: string
            text?: string
            size?: string
            logo_alignment?: string
            width?: number
          }) => void
          cancel: () => void
          prompt: () => void
        }
      }
    }
  }
}
