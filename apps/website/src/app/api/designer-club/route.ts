/**
 * POST /api/designer-club — public Designer Club trade signup submission.
 *
 * On success:
 *  - Inserts application into designer_club_applications table
 *  - Auto-links to customer account by email (if exists)
 *  - Sends Telegram alert to sales team
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      firstName, lastName, position, email,
      companyName, companyAddress, contactNumber, companySocials,
    } = body

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !companyName?.trim()) {
      return NextResponse.json({ error: 'First name, last name, email, and company name are required' }, { status: 400 })
    }

    // Check for duplicate email
    const existing = await query(
      `SELECT id, status, created_at FROM designer_club_applications WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'You already have an application on file. Our team will follow up shortly.',
        existing: true,
      }, { status: 200 })
    }

    // Auto-link to customer account by email
    const customerLink = await query(
      `SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    )
    const customerId = customerLink.rows[0]?.id || null

    const result = await query(
      `INSERT INTO designer_club_applications
        (first_name, last_name, position, email, company_name, company_address, contact_number, company_socials, customer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        firstName.trim(), lastName.trim(), position?.trim() || null, email.trim().toLowerCase(),
        companyName.trim(), companyAddress?.trim() || null, contactNumber?.trim() || null,
        companySocials?.trim() || null, customerId,
      ]
    )

    const appId = result.rows[0].id

    // Send Telegram alert
    try {
      const { sendTelegramAlert } = await import('@/lib/chatbot/telegram-client')
      await sendTelegramAlert({
        type: 'NEW_DESIGNER_APPLICATION' as any,
        leadName: `${firstName.trim()} ${lastName.trim()}`,
        company: companyName.trim(),
        email: email.trim(),
        phone: contactNumber?.trim() || undefined,
        details: `${position?.trim() || 'Designer'} — ${companyName.trim()} ${companyAddress ? `\n📍 ${companyAddress}` : ''} ${companySocials ? `\n🔗 ${companySocials}` : ''}`,
        adminUrl: `${process.env.DAVINCIOS_PUBLIC_SERVER_URL || 'https://admin.homeu.ph'}/admin/designer-club?id=${appId}`,
      })
    } catch { /* Telegram alert is best-effort */ }

    return NextResponse.json({ success: true, id: appId }, { status: 201 })
  } catch (err: any) {
    console.error('[designer-club] POST error:', err.message)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
