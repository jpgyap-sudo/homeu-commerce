#!/usr/bin/env node
/**
 * Tests the IMAP connection using whatever credentials are currently saved
 * in DaVinciOS_kv (smtp_config or app_config_email), without ever printing
 * the password. Usage: DATABASE_URI=... node tools/test-imap-connection.mjs
 */
import pg from 'pg'
import { ImapFlow } from 'imapflow'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URI, max: 1 })

async function main() {
  const result = await pool.query(`SELECT key, data FROM "DaVinciOS_kv" WHERE key IN ('app_config_email', 'smtp_config')`)
  const rows = Object.fromEntries(result.rows.map(r => [r.key, r.data]))

  const unified = rows.app_config_email
  const legacy = rows.smtp_config

  let host, port, secure, user, pass, source
  if (unified?.imapHost && unified?.salesEmail) {
    host = unified.imapHost
    port = parseInt(unified.imapPort || '993', 10)
    secure = (unified.imapSecure ?? 'true') !== 'false'
    user = unified.salesEmail || unified.smtpUser
    pass = unified.salesEmailPass || unified.smtpPass
    source = 'app_config_email'
  } else if (legacy?.imap_host && legacy?.sales_email) {
    host = legacy.imap_host
    port = parseInt(legacy.imap_port || '993', 10)
    secure = (legacy.imap_secure ?? 'true') !== 'false'
    user = legacy.sales_email || legacy.smtp_user
    pass = legacy.sales_email_pass || legacy.smtp_pass
    source = 'smtp_config (legacy)'
  } else {
    console.log('No usable IMAP config found in either app_config_email or smtp_config.')
    await pool.end()
    return
  }

  console.log(`Config source: ${source}`)
  console.log(`Host: ${host}:${port} (secure: ${secure})`)
  console.log(`User: ${user}`)
  console.log(`Pass: ${pass ? `${pass.length} chars, starts with "${pass.slice(0, 3)}..."` : 'MISSING'}`)
  if (pass?.startsWith('enc:')) {
    console.log('⚠️  Password looks ENCRYPTED ("enc:v1:...") — this is the SMTP-send encryption format.')
    console.log('   If this is being passed raw to ImapFlow without decryption first, auth will fail.')
  }

  console.log('\nAttempting IMAP connection...')
  const client = new ImapFlow({ host, port, secure, auth: { user, pass }, logger: false })
  try {
    await client.connect()
    console.log('✅ CONNECTED successfully')
    const lock = await client.getMailboxLock('INBOX')
    console.log(`✅ INBOX opened — ${client.mailbox.exists} messages`)
    lock.release()
    await client.logout()
  } catch (err) {
    console.log('❌ CONNECTION FAILED')
    console.log('Error message:', err.message)
    console.log('Error code:', err.code || err.responseStatus || '(none)')
    if (err.response) console.log('Server response:', err.response)
  }

  await pool.end()
}

main().catch(err => {
  console.error('Script error:', err.message)
  process.exit(1)
})
