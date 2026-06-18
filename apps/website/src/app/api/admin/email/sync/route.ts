import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { syncEmails, linkEmailsToCustomers, categorizeEmail } from '@/lib/mail-client'
import { query } from '@/lib/db'

/**
 * POST /api/admin/email/sync
 * Manually trigger an IMAP sync from Zoho.
 * Optionally link emails to customers and auto-categorize.
 */
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await syncEmails(50)

    if (!result.error) {
      const linked = await linkEmailsToCustomers()

      // Auto-categorize uncategorized emails
      const { rows: uncategorized } = await query(
        "SELECT id, subject, body_text FROM emails WHERE category = 'inbox'"
      )
      for (const row of uncategorized) {
        const cat = categorizeEmail(row.subject || '', row.body_text || '')
        if (cat !== 'inbox') {
          await query('UPDATE emails SET category = $1 WHERE id = $2', [cat, row.id])
        }
      }

      return NextResponse.json({
        ...result,
        linked,
        auto_categorized: uncategorized.length,
      })
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
