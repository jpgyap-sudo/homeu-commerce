'use client'

import { useState } from 'react'

interface FooterNewsletterProps {
  config?: {
    title?: string
    description?: string
    placeholder?: string
    buttonText?: string
    successMessage?: string
  }
}

export function FooterNewsletter({ config = {} }: FooterNewsletterProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const title = config.title || 'Subscribe'
  const description = config.description || 'Get design tips and new arrivals in your inbox.'
  const placeholder = config.placeholder || 'Your email address'
  const buttonText = config.buttonText || 'Subscribe'
  const successMessage = config.successMessage || 'Thanks for subscribing!'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'success' : 'error')
      if (res.ok) setEmail('')
    } catch { setStatus('error') }
  }

  return (
    <div className="footer-section footer-section--newsletter">
      <h3 className="footer-section__title">{title}</h3>
      <p className="footer-section__desc">{description}</p>
      {status === 'success' ? (
        <p className="footer-section__success">{successMessage}</p>
      ) : (
        <form onSubmit={handleSubmit} className="footer-section__form">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={placeholder}
            required
            className="footer-section__input"
          />
          <button type="submit" className="footer-section__btn" disabled={status === 'loading'}>
            {status === 'loading' ? '…' : buttonText}
          </button>
          {status === 'error' && (
            <p className="footer-section__error">Something went wrong. Try again.</p>
          )}
        </form>
      )}
    </div>
  )
}
