'use client'

import { useState, useEffect } from 'react'

interface RfqChatDeleteModalProps {
  open: boolean
  messageCount: number
  deletionRequestId: string | null
  onClose: () => void
  onConfirm: (otpCode: string) => Promise<boolean>
}

export default function RfqChatDeleteModal({
  open,
  messageCount,
  deletionRequestId,
  onClose,
  onConfirm,
}: RfqChatDeleteModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(300) // 5 minutes in seconds

  // Countdown timer
  useEffect(() => {
    if (!open) {
      setCountdown(300)
      setOtp(['', '', '', '', '', ''])
      setError('')
      return
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [open])

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return // only digits
    const newOtp = [...otp]
    newOtp[index] = value.slice(0, 1)
    setOtp(newOtp)

    // Auto-advance to next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }
    if (!deletionRequestId) {
      setError('Deletion session expired. Please try again.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const success = await onConfirm(otpCode)
      if (success) {
        onClose()
      } else {
        setError('Invalid or expired OTP code. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 28,
        maxWidth: 420,
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>
          🔐 Confirm Message Deletion
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#555' }}>
          You are about to delete <strong>{messageCount}</strong> message(s). An OTP code has been sent to <strong>jpgyap@gmail.com</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>
              Enter 6-digit OTP code:
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  style={{
                    width: 42,
                    height: 48,
                    textAlign: 'center',
                    fontSize: 20,
                    fontWeight: 600,
                    border: '2px solid #d9e0d7',
                    borderRadius: 8,
                    outline: 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <div style={{
              padding: '8px 12px',
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          <div style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 16 }}>
            Code expires in {minutes}:{String(seconds).padStart(2, '0')}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: '#f5f5f5',
                color: '#555',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: loading ? '#999' : '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Verifying...' : 'Confirm Deletion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
