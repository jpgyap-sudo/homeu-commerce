/**
 * Customer Sync Engine
 *
 * Bridges the gap between chatbot leads (chatbot.leads) and
 * registered customer accounts (customers table).
 *
 * Sync flows:
 *   1. Visitor chats → lead created → email checked against customers → link if match
 *   2. Lead registers → customer account created → link back to lead
 *   3. Logged-in customer chats → lead auto-linked on creation
 *   4. Lead status promoted to "converted" on registration
 *
 * This ensures admin sees the full customer journey:
 *   Anonymous visitor → Chat Lead → Lead + Customer (linked) → RFQ → Quotation
 *
 * Dependencies:
 *   - DB helpers (query, findOne, find) from lib/db
 *   - Auth session from lib/auth
 *   - chatbot.leads and customers tables
 */

import { query, findOne, find } from '../db'
import { getSession } from '../auth'

export interface CustomerProfile {
  id: string
  name?: string
  email?: string
  phone?: string
  address?: string
  status?: string
}

// ── 1. Find existing customer by email ─────────────────────────

export async function findCustomerByEmail(email: string): Promise<CustomerProfile | null> {
  if (!email?.trim()) return null
  try {
    const row = await findOne('customers', { email: email.trim().toLowerCase() })
    if (!row) return null
    return { id: String(row.id), name: row.name, email: row.email, phone: row.phone, status: row.status }
  } catch (err) {
    console.error('[customer-sync] findCustomerByEmail error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ── 2. Find lead by email in chatbot.leads ───────────────────

export async function findLeadByEmail(email: string): Promise<{ id: string; name: string } | null> {
  if (!email?.trim()) return null
  try {
    const row = await findOne('chatbot.leads', { email: email.trim().toLowerCase() })
    if (!row) return null
    return { id: String(row.id), name: row.name || '' }
  } catch (err) {
    console.error('[customer-sync] findLeadByEmail error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ── 3. Link lead to customer via DB update ────────────────────

export async function linkLeadToCustomer(leadId: string, customerId: string): Promise<boolean> {
  if (!leadId || !customerId) return false
  try {
    await query(
      'UPDATE chatbot.leads SET daVincios_customer_id = $1, status = $2, updated_at = NOW() WHERE id = $3',
      [customerId, 'linked', leadId]
    )
    return true
  } catch (err) {
    console.error('[customer-sync] linkLeadToCustomer error:', err instanceof Error ? err.message : err)
    return false
  }
}

// ── 4. Sync chat session with customer registration ─────────

export async function syncChatSessionWithCustomer(leadId: string, email: string): Promise<{
  linked: boolean
  customer?: CustomerProfile
  customerId?: string
}> {
  if (!leadId || !email) return { linked: false }

  try {
    const customer = await findCustomerByEmail(email)
    if (customer?.id) {
      const linked = await linkLeadToCustomer(leadId, customer.id)
      return { linked, customer, customerId: customer.id }
    }
    return { linked: false }
  } catch (err) {
    console.error('[customer-sync] syncChatSessionWithCustomer error:', err instanceof Error ? err.message : err)
    return { linked: false }
  }
}

// ── 5. Check if user is currently logged in (from cookie/session) ──

export async function getLoggedInCustomer(): Promise<CustomerProfile | null> {
  try {
    const session = await getSession()
    if (!session?.id) return null

    const row = await findOne('customers', { id: Number(session.id) })
    if (!row) return null
    return { id: String(row.id), name: row.name, email: row.email, phone: row.phone, status: row.status }
  } catch (err) {
    console.error('[customer-sync] getLoggedInCustomer error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ── 6. Create customer account from lead data ─────────────────

export async function promoteLeadToCustomer(leadData: {
  name: string
  email: string
  mobile: string
  buyerType?: string
  companyName?: string
}): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    const { rows } = await query(
      `INSERT INTO customers (name, email, phone, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [
        leadData.name,
        leadData.email.trim().toLowerCase(),
        leadData.mobile,
        'lead',
        leadData.buyerType
          ? `Lead from chatbot. Buyer type: ${leadData.buyerType}${leadData.companyName ? `, Company: ${leadData.companyName}` : ''}`
          : 'Lead from chatbot',
      ]
    )
    return { success: true, customerId: String(rows[0]?.id) }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── 7. Merge lead + customer data for unified profile ───────

export function mergeLeadWithCustomer(lead: Record<string, unknown>, customer: CustomerProfile): Record<string, unknown> {
  return {
    ...lead,
    customerId: customer.id,
    customerName: customer.name || lead.name,
    customerEmail: customer.email || lead.email,
    customerPhone: customer.phone || lead.mobile,
    isRegistered: true,
    status: lead.status === 'new' ? 'converted' : lead.status,
  }
}

// ── 8. Get customer RFQ history ──────────────────────────────

export async function getCustomerRFQHistory(customerId: string): Promise<any[]> {
  if (!customerId) return []
  try {
    return await find('rfq_requests', { customer: customerId }, { limit: 20, orderBy: 'created_at DESC' })
  } catch (err) {
    console.error('[customer-sync] getCustomerRFQHistory error:', err instanceof Error ? err.message : err)
    return []
  }
}
