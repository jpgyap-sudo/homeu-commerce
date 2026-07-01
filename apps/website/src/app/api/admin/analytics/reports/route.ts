import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

const SETTINGS_KEY = 'analytics_report_settings'

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0])
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  return [columns.map(escape).join(','), ...rows.map(row => columns.map(column => escape(row[column])).join(','))].join('\n')
}

function download(rows: Record<string, unknown>[], filename: string, format: string) {
  if (format === 'json') {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${filename}.json"` },
    })
  }
  return new NextResponse(csv(rows), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}.csv"` },
  })
}

export async function GET(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = request.nextUrl.searchParams.get('type') || 'snapshot'
  const format = request.nextUrl.searchParams.get('format') || 'csv'
  const from = request.nextUrl.searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const to = request.nextUrl.searchParams.get('to') || new Date().toISOString().slice(0, 10)

  try {
    if (type === 'settings') {
      const result = await query(`SELECT value FROM site_settings WHERE key = $1`, [SETTINGS_KEY])
      return NextResponse.json(result.rows[0]?.value || { recipient: '', daily: false, weekly: false, monthly: false })
    }

    let rows: Record<string, unknown>[] = []
    if (type === 'page_views') {
      rows = (await query(`SELECT created_at, path, title, referrer, source, source_category, visitor_id FROM page_views WHERE is_admin = FALSE AND created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to])).rows
    } else if (type === 'leads') {
      rows = (await query(`SELECT id, name, email, mobile, buyer_type, company_name, project_location, source_page, status, score, created_at FROM chatbot.leads WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to])).rows
    } else if (type === 'rfq') {
      rows = (await query(`SELECT id, customer_name, email, phone, status, delivery_location, project_type, notes, estimated_total, created_at FROM rfq_requests WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to])).rows
    } else if (type === 'messages') {
      rows = (await query(`SELECT id, conversation_id, sender_type, message_type, content, created_at FROM chatbot.messages WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to])).rows
    } else if (type === 'quotations') {
      rows = (await query(`SELECT id, quotation_number, customer_name, customer_email, phone, status, subtotal, grand_total, delivery_location, project_type, created_at FROM quotations WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to])).rows
    } else if (type === 'appointments') {
      rows = (await query(`SELECT a.id, a.preferred_date::text as preferred_date, a.preferred_time, a.visitor_count, a.categories_of_interest, a.status, a.notes, a.created_at, l.name as lead_name, l.email as lead_email FROM chatbot.appointments a LEFT JOIN chatbot.leads l ON l.id = a.lead_id WHERE a.created_at::date BETWEEN $1 AND $2 ORDER BY a.created_at DESC`, [from, to])).rows
    } else if (type === 'all') {
      const [views, leads, rfqs, messages, quotes, appts] = await Promise.all([
        query(`SELECT * FROM page_views WHERE is_admin = FALSE AND created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to]),
        query(`SELECT * FROM chatbot.leads WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to]),
        query(`SELECT * FROM rfq_requests WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to]),
        query(`SELECT * FROM chatbot.messages WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to]),
        query(`SELECT * FROM quotations WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to]),
        query(`SELECT * FROM chatbot.appointments WHERE created_at::date BETWEEN $1 AND $2 ORDER BY created_at DESC`, [from, to]),
      ])
      return download([{ pageViews: views.rows, leads: leads.rows, rfqs: rfqs.rows, messages: messages.rows, quotations: quotes.rows, appointments: appts.rows }], 'homeu-all-analytics', 'json')
    } else {
      const summary = await query(`
        SELECT
          $1::date AS date_from, $2::date AS date_to,
          (SELECT COUNT(*) FROM page_views WHERE is_admin = FALSE AND created_at::date BETWEEN $1 AND $2) AS page_views,
          (SELECT COUNT(DISTINCT visitor_id) FROM page_views WHERE is_admin = FALSE AND visitor_id IS NOT NULL AND created_at::date BETWEEN $1 AND $2) AS unique_visitors,
          (SELECT COUNT(*) FROM chatbot.leads WHERE created_at::date BETWEEN $1 AND $2) AS new_leads,
          (SELECT COALESCE(ROUND(AVG(score), 1), 0) FROM chatbot.leads WHERE created_at::date BETWEEN $1 AND $2) AS average_lead_score,
          (SELECT COUNT(*) FROM rfq_requests WHERE created_at::date BETWEEN $1 AND $2) AS rfq_submissions,
          (SELECT COUNT(*) FROM quotations WHERE created_at::date BETWEEN $1 AND $2) AS quotations,
          (SELECT COUNT(*) FROM chatbot.appointments WHERE created_at::date BETWEEN $1 AND $2) AS appointments,
          (SELECT COUNT(*) FROM chatbot.messages WHERE created_at::date BETWEEN $1 AND $2) AS chat_messages
      `, [from, to])
      rows = summary.rows
    }

    return download(rows, `homeu-${type}-${from}-to-${to}`, format)
  } catch (error) {
    console.error('[analytics/reports] Export failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Report generation failed' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const settings = {
      recipient: String(body.recipient || '').trim().slice(0, 320),
      daily: Boolean(body.daily), weekly: Boolean(body.weekly), monthly: Boolean(body.monthly),
    }
    await query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [SETTINGS_KEY, JSON.stringify(settings)]
    )
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save report preferences' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { from, to, recipient } = body
    if (!recipient) return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })

    const summary = await query(`
      SELECT
        $1::date AS date_from, $2::date AS date_to,
        (SELECT COUNT(*) FROM page_views WHERE is_admin = FALSE AND created_at::date BETWEEN $1 AND $2) AS page_views,
        (SELECT COUNT(DISTINCT visitor_id) FROM page_views WHERE is_admin = FALSE AND visitor_id IS NOT NULL AND created_at::date BETWEEN $1 AND $2) AS unique_visitors,
        (SELECT COUNT(*) FROM chatbot.leads WHERE created_at::date BETWEEN $1 AND $2) AS new_leads,
        (SELECT COALESCE(ROUND(AVG(score), 1), 0) FROM chatbot.leads WHERE created_at::date BETWEEN $1 AND $2) AS average_lead_score,
        (SELECT COUNT(*) FROM rfq_requests WHERE created_at::date BETWEEN $1 AND $2) AS rfq_submissions,
        (SELECT COUNT(*) FROM quotations WHERE created_at::date BETWEEN $1 AND $2) AS quotations,
        (SELECT COUNT(*) FROM chatbot.appointments WHERE created_at::date BETWEEN $1 AND $2) AS appointments,
        (SELECT COUNT(*) FROM chatbot.messages WHERE created_at::date BETWEEN $1 AND $2) AS chat_messages
    `, [from, to])

    const data = summary.rows[0] || {}

    const { createMailTransporter, loadSmtpConfig } = await import('@/lib/smtp-config')
    const transporter = await createMailTransporter()
    const config = await loadSmtpConfig()

    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #151a17; max-width: 600px; margin: 0 auto; border: 1px solid #d9e0d7; border-radius: 8px;">
        <h2 style="color: #1a6d3e; border-bottom: 2px solid #1a6d3e; padding-bottom: 8px; margin-top: 0;">Home Atelier — Performance Summary Report</h2>
        <p><strong>Reporting Period:</strong> ${from} to ${to}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: #f4f6f4;">
              <th style="text-align: left; padding: 10px; border: 1px solid #d9e0d7;">Metric</th>
              <th style="text-align: right; padding: 10px; border: 1px solid #d9e0d7;">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding: 10px; border: 1px solid #d9e0d7;">Page Views</td><td style="text-align: right; padding: 10px; border: 1px solid #d9e0d7; font-weight: bold;">${(data.page_views || 0).toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #d9e0d7;">Unique Visitors</td><td style="text-align: right; padding: 10px; border: 1px solid #d9e0d7; font-weight: bold;">${(data.unique_visitors || 0).toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #d9e0d7;">New Leads</td><td style="text-align: right; padding: 10px; border: 1px solid #d9e0d7; font-weight: bold;">${(data.new_leads || 0).toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #d9e0d7;">Average Lead Score</td><td style="text-align: right; padding: 10px; border: 1px solid #d9e0d7; font-weight: bold;">${data.average_lead_score || 0}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #d9e0d7;">RFQ Submissions</td><td style="text-align: right; padding: 10px; border: 1px solid #d9e0d7; font-weight: bold;">${(data.rfq_submissions || 0).toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #d9e0d7;">Quotations Generated</td><td style="text-align: right; padding: 10px; border: 1px solid #d9e0d7; font-weight: bold;">${(data.quotations || 0).toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #d9e0d7;">Showroom Appointments</td><td style="text-align: right; padding: 10px; border: 1px solid #d9e0d7; font-weight: bold;">${(data.appointments || 0).toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #d9e0d7;">Chat Messages</td><td style="text-align: right; padding: 10px; border: 1px solid #d9e0d7; font-weight: bold;">${(data.chat_messages || 0).toLocaleString()}</td></tr>
          </tbody>
        </table>
        <p style="margin-top: 25px; font-size: 11px; color: #667168; border-top: 1px dashed #d9e0d7; padding-top: 10px;">This report was triggered on-demand via the DaVinciOS Command Center.</p>
      </div>
    `

    await transporter.sendMail({
      from: config.from,
      to: recipient,
      subject: `Home Atelier Summary Report (${from} to ${to})`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[analytics/reports] Send email report failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
