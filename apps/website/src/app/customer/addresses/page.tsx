'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Address {
  id: number
  label: string
  address_line1: string
  address_line2: string | null
  city: string
  province: string
  postal_code: string
  country: string
  is_default: boolean
}

const BLANK: Omit<Address, 'id' | 'is_default'> = {
  label: 'Home', address_line1: '', address_line2: '', city: '', province: '', postal_code: '', country: 'Philippines',
}

export default function CustomerAddressesPage() {
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [form, setForm] = useState({ ...BLANK, is_default: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/customers/me', { credentials: 'include' })
      .then(r => { if (!r.ok) router.push('/login') })
    loadAddresses()
  }, [router])

  async function loadAddresses() {
    setLoading(true)
    try {
      const res = await fetch('/api/customers/addresses', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAddresses(data.docs || [])
      }
    } finally { setLoading(false) }
  }

  function openNew() { setEditing(null); setForm({ ...BLANK, is_default: false }); setShowForm(true) }
  function openEdit(addr: Address) { setEditing(addr); setForm({ ...addr }); setShowForm(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const url = editing ? `/api/customers/addresses/${editing.id}` : '/api/customers/addresses'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save address')
      setShowForm(false)
      loadAddresses()
    } catch (err: any) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this address?')) return
    await fetch(`/api/customers/addresses/${id}`, { method: 'DELETE', credentials: 'include' })
    loadAddresses()
  }

  return (
    <div className="account-page page-width">
      <nav className="account-nav">
        <Link href="/customer/dashboard" className="account-nav__link">My Requests</Link>
        <Link href="/customer/account" className="account-nav__link">Account Details</Link>
        <Link href="/customer/addresses" className="account-nav__link account-nav__link--active">Addresses</Link>
        <Link href="/customer/orders" className="account-nav__link">Order History</Link>
      </nav>

      <div className="account-content">
        <div className="account-title-row">
          <h1 className="account-title">Addresses</h1>
          <button onClick={openNew} className="btn btn--primary">+ Add Address</button>
        </div>

        {loading ? <p className="account-loading">Loading…</p> : (
          addresses.length === 0 ? (
            <p className="account-empty">No addresses saved yet.</p>
          ) : (
            <div className="address-grid">
              {addresses.map(addr => (
                <div key={addr.id} className={`address-card${addr.is_default ? ' address-card--default' : ''}`}>
                  {addr.is_default && <span className="address-card__badge">Default</span>}
                  <p className="address-card__label">{addr.label}</p>
                  <p>{addr.address_line1}</p>
                  {addr.address_line2 && <p>{addr.address_line2}</p>}
                  <p>{addr.city}{addr.province ? `, ${addr.province}` : ''} {addr.postal_code}</p>
                  <p>{addr.country}</p>
                  <div className="address-card__actions">
                    <button onClick={() => openEdit(addr)} className="address-card__btn">Edit</button>
                    <button onClick={() => handleDelete(addr.id)} className="address-card__btn address-card__btn--danger">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {showForm && (
          <div className="address-form-overlay">
            <div className="address-form-modal">
              <div className="address-form-modal__header">
                <h2>{editing ? 'Edit Address' : 'New Address'}</h2>
                <button onClick={() => setShowForm(false)} className="address-form-modal__close">✕</button>
              </div>
              <form onSubmit={handleSave} className="account-form">
                <div className="account-form__field">
                  <label>Label</label>
                  <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Home, Office…" />
                </div>
                <div className="account-form__field">
                  <label>Address Line 1 *</label>
                  <input value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} required />
                </div>
                <div className="account-form__field">
                  <label>Address Line 2</label>
                  <input value={form.address_line2 || ''} onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))} />
                </div>
                <div className="account-form__row">
                  <div className="account-form__field">
                    <label>City *</label>
                    <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
                  </div>
                  <div className="account-form__field">
                    <label>Province</label>
                    <input value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} />
                  </div>
                </div>
                <div className="account-form__row">
                  <div className="account-form__field">
                    <label>Postal Code</label>
                    <input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} />
                  </div>
                  <div className="account-form__field">
                    <label>Country</label>
                    <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                  </div>
                </div>
                <label className="account-form__checkbox">
                  <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} />
                  Set as default address
                </label>
                {error && <p className="account-form__error">{error}</p>}
                <div className="account-form__actions">
                  <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save Address'}</button>
                  <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
