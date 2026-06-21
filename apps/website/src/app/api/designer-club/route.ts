/**
 * POST /api/designer-club — public Designer Club trade signup submission.
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

    const result = await query(
      `INSERT INTO designer_club_applications
        (first_name, last_name, position, email, company_name, company_address, contact_number, company_socials)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        firstName.trim(), lastName.trim(), position?.trim() || null, email.trim().toLowerCase(),
        companyName.trim(), companyAddress?.trim() || null, contactNumber?.trim() || null, companySocials?.trim() || null,
      ]
    )

    return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 })
  } catch (err: any) {
    console.error('[designer-club] POST error:', err.message)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
