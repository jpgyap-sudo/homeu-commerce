'use client'

import { useState, FormEvent } from 'react'
import { LEAD_FORM_FIELDS, CONSENT_TEXT } from '@/lib/chatbot/prompts'

interface LeadFormData {
  name: string
  email: string
  mobile: string
  buyerType: string
  companyName: string
}

interface LeadGateFormProps {
  onSubmit: (data: LeadFormData) => Promise<void>
  sourcePage?: string
}

export function LeadGateForm({ onSubmit, sourcePage }: LeadGateFormProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    name: '', email: '', mobile: '', buyerType: '', companyName: '',
  })
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [returningLookup, setReturningLookup] = useState(false)
  const [returningFound, setReturningFound] = useState(false)

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!formData.name.trim()) errs.name = 'Name is required'
    if (!formData.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email format'
    if (!returningFound && !formData.mobile.trim()) errs.mobile = 'Mobile number is required'
    else if (formData.mobile.trim() && formData.mobile.replace(/\s/g, '').length < 7) errs.mobile = 'Enter a valid mobile number (min 7 digits)'
    if (!consent) errs.consent = 'You must agree to be contacted'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setServerError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function updateField(field: keyof LeadFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'email') setReturningFound(false)
    if (errors[field]) setErrors(prev => { const { [field]: _, ...rest } = prev; return rest })
  }

  async function lookupReturningVisitor() {
    const email = formData.email.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return

    setReturningLookup(true)
    try {
      const res = await fetch(`/api/chat/visitor?email=${encodeURIComponent(email)}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.found) return

      setReturningFound(true)
      setFormData(prev => ({
        ...prev,
        name: prev.name.trim() ? prev.name : data.lead?.name || '',
        mobile: prev.mobile.trim() ? prev.mobile : data.lead?.mobile || '',
      }))
    } catch {
      // Lookup is best-effort; the normal lead form still works.
    } finally {
      setReturningLookup(false)
    }
  }

  return (
    <div className="chat-lead-gate">
      <h3>Welcome to HomeU Concierge</h3>
      <p>Please enter your contact details so our team can respond to your inquiry.</p>

      <form onSubmit={handleSubmit}>
        {LEAD_FORM_FIELDS.map(field => (
          <div className="chat-form-group" key={field.name}>
            <label htmlFor={`lead-${field.name}`}>
              {field.label}{field.required ? ' *' : ''}
            </label>
            {field.type === 'select' ? (
              <select
                id={`lead-${field.name}`}
                value={String(formData[field.name as keyof LeadFormData])}
                onChange={e => updateField(field.name as keyof LeadFormData, e.target.value)}
              >
                <option value="">Select...</option>
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                id={`lead-${field.name}`}
                type={field.type}
                value={String(formData[field.name as keyof LeadFormData])}
                onChange={e => updateField(field.name as keyof LeadFormData, e.target.value)}
                onBlur={field.name === 'email' ? lookupReturningVisitor : undefined}
                placeholder={field.placeholder}
                required={field.name === 'mobile' && returningFound ? false : field.required}
              />
            )}
            {errors[field.name] && <p className="chat-error">{errors[field.name]}</p>}
          </div>
        ))}

        <div className="chat-checkbox-group">
          <input
            type="checkbox"
            id="lead-consent"
            checked={consent}
            onChange={e => {
              setConsent(e.target.checked)
              if (errors.consent) setErrors(prev => { const { consent: _, ...rest } = prev; return rest })
            }}
          />
          <label htmlFor="lead-consent">{CONSENT_TEXT}</label>
        </div>
        {errors.consent && <p className="chat-error">{errors.consent}</p>}

        {serverError && <p className="chat-error">{serverError}</p>}

        <button className="chat-submit-btn" type="submit" disabled={submitting || returningLookup}>
          {submitting ? 'Please wait...' : returningLookup ? 'Checking...' : returningFound ? 'Continue Chat' : 'Start Chat'}
        </button>
      </form>
    </div>
  )
}
