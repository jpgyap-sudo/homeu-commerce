import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from '../../node_modules/typescript/lib/typescript.js'

const root = new URL('../../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

async function importTypeScriptModule(path) {
  const source = await read(path)
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}

test('IMAP sync selects the newest sequence range', async () => {
  const { getLatestSequenceRange } = await importTypeScriptModule('apps/website/src/lib/mail-sync.ts')

  assert.equal(getLatestSequenceRange(100, 50), '51:100')
  assert.equal(getLatestSequenceRange(20, 50), '1:20')
  assert.equal(getLatestSequenceRange(0, 50), null)
})

test('customer deletion consumes a purpose-bound OTP on the server', async () => {
  const [otpRoute, deleteRoute, client, migration] = await Promise.all([
    read('apps/website/src/app/api/admin/otp/route.ts'),
    read('apps/website/src/app/api/admin/customers/route.ts'),
    read('apps/website/src/app/admin/customers/AdminCustomersClient.tsx'),
    read('tools/migrate/migrations/033_secure_admin_otp.sql'),
  ])

  assert.match(otpRoute, /session\.email\.toLowerCase\(\)\.trim\(\)/)
  assert.match(otpRoute, /purpose = \$2/)
  assert.match(deleteRoute, /purpose = 'customer_delete'/)
  assert.match(deleteRoute, /SET used = TRUE/)
  assert.match(deleteRoute, /EXISTS \(SELECT 1 FROM consumed_otp\)/)
  assert.doesNotMatch(client, /ids:\s*\[\]/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS otp_codes/)
  assert.match(migration, /verified_at TIMESTAMPTZ/)
})
