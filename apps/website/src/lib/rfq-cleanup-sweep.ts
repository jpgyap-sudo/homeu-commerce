import { query } from '@/lib/db'
import { deleteObjectFromSpaces } from '@/lib/do-spaces'

export interface RfqCleanupResult {
  attachmentsDeleted: number
  rfqsArchived: number
  archivedIds: number[]
}

/**
 * Deletes expired (30-day) RFQ attachments and archives RFQs that got no
 * admin response within their deadline. Shared by the manual/external
 * cron route (/api/cron/rfq-cleanup-sweep) and the in-process daily
 * scheduler in instrumentation.ts.
 */
export async function runRfqCleanupSweep(): Promise<RfqCleanupResult> {
  const expired = await query(
    `SELECT id, storage_key FROM rfq_attachments WHERE deleted_at IS NULL AND expires_at < NOW()`
  )
  let attachmentsDeleted = 0
  for (const row of expired.rows) {
    await deleteObjectFromSpaces(row.storage_key).catch(() => { /* best-effort */ })
    await query(`UPDATE rfq_attachments SET deleted_at = NOW() WHERE id = $1`, [row.id])
    attachmentsDeleted++
  }

  const archived = await query(
    `UPDATE rfq_requests
     SET archived_at = NOW()
     WHERE archived_at IS NULL
       AND status = 'new'
       AND (
         (extension_status = 'approved' AND extension_approved_until IS NOT NULL AND extension_approved_until < NOW())
         OR (extension_status != 'approved' AND auto_archive_deadline < NOW())
       )
     RETURNING id`
  )

  return {
    attachmentsDeleted,
    rfqsArchived: archived.rowCount ?? 0,
    archivedIds: archived.rows.map((r: any) => r.id),
  }
}
