/**
 * quotation-versions.ts
 * ======================
 * Quotation Version Engine — THE GENIUS.
 *
 * Every time a quotation is edited (admin) OR the customer requests a revision,
 * a snapshot is stored. The customer sees a clean "Request Revision" button on
 * their quotation view. Admin sees version history with diffs.
 *
 * Flow:
 *   Customer views quotation → clicks "Request Revision"
 *     → POST /api/quotations/[id]/revision-request { message: "..." }
 *     → sets pending_revision=true, stores revision_request
 *   Admin edits quotation → PATCH /api/quotations/[id]
 *     → auto-creates version snapshot BEFORE applying changes
 *   Admin resolves revision → PATCH with { resolveRevision: true }
 *     → creates version with changelog, clears pending_revision
 *
 * Database: quotation_versions table (see migration 004)
 */

import { query } from '@/lib/db'

/** Minimal type for a DB result row — same shape as pg QueryResultRow */
interface QueryResultRow {
  [key: string]: any
}

export interface QuotationSnapshot {
  customerName: string
  email: string
  phone: string
  deliveryLocation: string
  projectType: string
  notes: string
  items: QuotationSnapshotItem[]
  terms: Record<string, string>
  subtotal: number
  shippingCost: number
  grandTotal: number
}

interface QuotationSnapshotItem {
  title: string
  sku: string
  description: string
  quantity: number
  unitCost: number
  discountPercent: number
  discountedCost: number
  total: number
  notes?: string
}

interface ChangeLogEntry {
  field: string
  label: string
  from: string
  to: string
}

/**
 * Build a snapshot of the current quotation state from DB row.
 */
export function buildSnapshot(row: QueryResultRow): QuotationSnapshot {
  const items: QuotationSnapshotItem[] = []
  if (row.items && Array.isArray(row.items)) {
    for (const item of row.items) {
      items.push({
        title: item.title || item.productTitleSnapshot || '',
        sku: item.sku || item.skuSnapshot || '',
        description: item.description || '',
        quantity: Number(item.quantity) || 1,
        unitCost: Number(item.unitCost) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        discountedCost: Number(item.discountedCost) || 0,
        total: Number(item.total) || 0,
        notes: item.notes || '',
      })
    }
  }

  return {
    customerName: row.customer_name || '',
    email: row.email || '',
    phone: row.phone || '',
    deliveryLocation: row.delivery_location || '',
    projectType: row.project_type || '',
    notes: row.notes || '',
    items,
    terms: {
      deliveryLeadtime: row.terms_delivery_leadtime || '',
      paymentTerms: row.terms_payment_terms || '',
      warranty: row.terms_warranty || '',
      bankDetails: row.terms_bank_details || '',
      cancellationPolicy: row.terms_cancellation_policy || '',
      returnPolicy: row.terms_return_policy || '',
      rejectionOfItems: row.terms_rejection_of_items || '',
      refundPolicy: row.terms_refund_policy || '',
    },
    subtotal: Number(row.subtotal) || 0,
    shippingCost: Number(row.shipping_cost) || 0,
    grandTotal: Number(row.grand_total) || 0,
  }
}

/**
 * Compute a changelog between two snapshots.
 */
export function computeChangelog(
  previous: QuotationSnapshot | null,
  current: QuotationSnapshot
): ChangeLogEntry[] {
  if (!previous) return [{ field: 'version', label: 'Version created', from: '—', to: 'Initial' }]

  const changes: ChangeLogEntry[] = []

  const textFields: [keyof QuotationSnapshot, string][] = [
    ['customerName', 'Customer Name'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['deliveryLocation', 'Delivery Location'],
    ['projectType', 'Project Type'],
    ['notes', 'Notes'],
  ]
  for (const [key, label] of textFields) {
    const from = String(previous[key] ?? '')
    const to = String(current[key] ?? '')
    if (from !== to) changes.push({ field: key, label, from, to })
  }

  // Check items
  const prevItemTitles = previous.items.map(i => i.title).sort().join(', ')
  const currItemTitles = current.items.map(i => i.title).sort().join(', ')
  if (prevItemTitles !== currItemTitles) {
    changes.push({
      field: 'items', label: 'Items',
      from: `${previous.items.length} item(s)`,
      to: `${current.items.length} item(s)`,
    })
  }

  // Check pricing
  if (previous.subtotal !== current.subtotal) {
    changes.push({
      field: 'subtotal', label: 'Subtotal',
      from: `₱${previous.subtotal.toLocaleString()}`,
      to: `₱${current.subtotal.toLocaleString()}`,
    })
  }
  if (previous.grandTotal !== current.grandTotal) {
    changes.push({
      field: 'grandTotal', label: 'Grand Total',
      from: `₱${previous.grandTotal.toLocaleString()}`,
      to: `₱${current.grandTotal.toLocaleString()}`,
    })
  }

  return changes
}

/**
 * Create a version snapshot for a quotation.
 * Call this BEFORE updating the quotation on every PATCH.
 */
export async function createVersion(
  quotationId: number | string,
  revisionType: 'initial' | 'admin_edit' | 'customer_revision' | 'reverted' = 'admin_edit',
  revisionMessage: string = '',
  createdBy: string = 'system'
): Promise<number> {
  const row = await query('SELECT * FROM quotations WHERE id = $1', [quotationId])
  if (row.rows.length === 0) throw new Error('Quotation not found')

  const currentSnapshot = buildSnapshot(row.rows[0])
  const currentVersion = row.rows[0].current_version || 0

  // Load previous snapshot for changelog
  let previousSnapshot: QuotationSnapshot | null = null
  const prev = await query(
    `SELECT snapshot FROM quotation_versions WHERE quotation_id = $1 AND version_number = $2 LIMIT 1`,
    [quotationId, currentVersion]
  )
  if (prev.rows.length > 0) {
    previousSnapshot = prev.rows[0].snapshot as QuotationSnapshot
  }

  const changelog = computeChangelog(previousSnapshot, currentSnapshot)
  const newVersion = currentVersion + 1

  await query(
    `INSERT INTO quotation_versions (quotation_id, version_number, status, revision_type, snapshot, changelog, revision_message, created_by)
     VALUES ($1, $2, 'active', $3, $4::jsonb, $5::jsonb, $6, $7)`,
    [
      quotationId, newVersion, revisionType,
      JSON.stringify(currentSnapshot),
      JSON.stringify(changelog),
      revisionMessage, createdBy,
    ]
  )

  await query(
    `UPDATE quotations SET current_version = $1, updated_at = NOW() WHERE id = $2`,
    [newVersion, quotationId]
  )

  // ── Fire RFQ chat event ────────────────────────────────────
  try {
    // Determine event type based on revision_type
    const eventTypeMap: Record<string, string> = {
      initial: 'quotation_created',
      admin_edit: 'quotation_updated',
      customer_revision: 'revision_resolved',
      reverted: 'quotation_updated',
    }
    const eventType = eventTypeMap[revisionType] || 'quotation_updated'
    const eventLabelMap: Record<string, string> = {
      initial: 'Quotation created',
      admin_edit: 'Quotation updated',
      customer_revision: 'Revision resolved',
      reverted: 'Quotation reverted',
    }
    const eventLabel = eventLabelMap[revisionType] || 'Quotation updated'

    // Fetch the rfq_id from the quotation
    const qResult = await query('SELECT rfq_id FROM quotations WHERE id = $1', [quotationId])
    const rfqId = qResult.rows[0]?.rfq_id

    if (rfqId) {
      // Fire and forget — don't block version creation if event fails
      fetch(
        `${process.env.APP_URL || 'http://localhost:3000'}/api/system/rfq-chat/quotation-event`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rfqRequestId: rfqId,
            quotationId: Number(quotationId),
            versionNumber: newVersion,
            eventType,
            eventLabel,
            message: revisionMessage || undefined,
          }),
        }
      ).catch((err: Error) => {
        console.warn('[quotation-versions] Failed to fire RFQ chat event:', err.message)
      })
    }
  } catch (err) {
    // Non-blocking — don't fail version creation if event fails
    console.warn('[quotation-versions] Failed to prepare RFQ chat event:', err)
  }

  return newVersion
}

/**
 * Get version history for a quotation.
 */
export async function getVersionHistory(quotationId: number | string) {
  const { rows } = await query(
    `SELECT id, version_number, revision_type, revision_message, changelog, created_by, created_at
     FROM quotation_versions
     WHERE quotation_id = $1
     ORDER BY version_number DESC`,
    [quotationId]
  )
  return rows
}

/**
 * Get a specific version's snapshot.
 */
export async function getVersion(quotationId: number | string, versionNumber: number) {
  const { rows } = await query(
    `SELECT * FROM quotation_versions WHERE quotation_id = $1 AND version_number = $2 LIMIT 1`,
    [quotationId, versionNumber]
  )
  return rows[0] || null
}
