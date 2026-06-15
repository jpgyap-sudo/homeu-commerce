/**
 * Customer Sync Engine
 *
 * Bridges the gap between chatbot leads (chatbot.leads) and
 * registered customer accounts (DaVinciOS customers collection).
 *
 * Sync flows:
 *   1. Visitor chats → lead created → email checked against customers → link if match
 *   2. Lead registers → customer account created → link back to lead
 *   3. Logged-in customer chats → lead auto-linked on creation
 *   4. Lead status promoted to "converted" on registration
 *
 * This ensures admin sees the full customer journey:
 *   Anonymous visitor → Chat Lead → Lead + Customer (linked) → RFQ → Quotation
 */

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export interface CustomerProfile {
  id: string
  name?: string
  email?: string
  phone?: string
  address?: string
  status?: string
}

// ── 1. Find existing customer by email via DaVinciOS API ─────

export async function findCustomerByEmail(email: string): Promise<CustomerProfile | null> {
  if (!email?.trim()) return null
  try {
    const res = await fetch(`${API_BASE}/api/customers?where[email][equals]=${encodeURIComponent(email.trim())}&depth=0&limit=1`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const doc = data?.docs?.[0]
    if (doc?.id) {
      return { id: doc.id, name: doc.name, email: doc.email, phone: doc.phone, status: doc.status }
    }
    return null
  } catch {
    return null
  }
}

// ── 2. Find lead by email in chatbot.leads ───────────────────

export async function findLeadByEmail(email: string): Promise<{ id: string; name: string } | null> {
  if (!email?.trim()) return null
  try {
    // Query the chatbot.leads table via API or direct DB query
    // For MVP, we check via the leads endpoint
    const res = await fetch(`${API_BASE}/api/chat/leads/lookup?email=${encodeURIComponent(email.trim())}`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.lead || null
  } catch {
    return null
  }
}

// ── 3. Link lead to customer via DB update ────────────────────

export async function linkLeadToCustomer(leadId: string, customerId: string): Promise<boolean> {
  if (!leadId || !customerId) return false
  try {
    const res = await fetch(`${API_BASE}/api/chat/leads/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, customerId }),
    })
    return res.ok
  } catch {
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
  } catch {
    return { linked: false }
  }
}

// ── 5. Check if user is currently logged in (from cookie/session) ──

export async function getLoggedInCustomer(): Promise<CustomerProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/api/customers/me`, {
      credentials: 'include',
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const user = (data?.user || data?.customer || data) as CustomerProfile
    if (user?.id) return user
    return null
  } catch {
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
    const res = await fetch(`${API_BASE}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: leadData.name,
        email: leadData.email,
        phone: leadData.mobile,
        status: 'lead',
        notes: leadData.buyerType
          ? `Lead from chatbot. Buyer type: ${leadData.buyerType}${leadData.companyName ? `, Company: ${leadData.companyName}` : ''}`
          : 'Lead from chatbot',
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, error: (err as any).errors?.[0]?.message || 'Failed to create customer' }
    }
    const data = await res.json()
    return { success: true, customerId: data?.doc?.id || data?.id }
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
    const res = await fetch(`${API_BASE}/api/rfq-requests?where[customer][equals]=${customerId}&depth=0&limit=20&sort=-createdAt`, {
      next: { revalidate: 0 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data?.docs || []
  } catch {
    return []
  }
}
