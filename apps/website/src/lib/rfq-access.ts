import type { SessionUser } from './auth'

const RFQ_STAFF_ROLES = new Set(['admin', 'editor', 'sales'])

type RfqAccessResult =
  | { ok: true; customerId: number | null }
  | { ok: false; status: 400 | 403; error: string }

function positiveInteger(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Customer sessions are always scoped to their own customer row. Staff may
 * optionally filter by customer, while unknown roles fail closed.
 */
export function resolveRfqAccess(
  session: Pick<SessionUser, 'id' | 'role'>,
  requestedCustomerId: string | null,
): RfqAccessResult {
  if (session.role === 'customer') {
    const sessionCustomerId = positiveInteger(session.id)
    return sessionCustomerId
      ? { ok: true, customerId: sessionCustomerId }
      : { ok: false, status: 403, error: 'Customer account is invalid' }
  }

  if (!RFQ_STAFF_ROLES.has(session.role)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  if (requestedCustomerId === null || requestedCustomerId === '') {
    return { ok: true, customerId: null }
  }

  const customerId = positiveInteger(requestedCustomerId)
  return customerId
    ? { ok: true, customerId }
    : { ok: false, status: 400, error: 'Invalid customer ID' }
}
