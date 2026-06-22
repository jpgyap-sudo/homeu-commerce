import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from '../../apps/website/node_modules/typescript/lib/typescript.js'

const root = new URL('../../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

async function importTypeScriptModule(path) {
  const source = await read(path)
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}

test('customer RFQ access is bound to the session and staff access is explicit', async () => {
  const { resolveRfqAccess } = await importTypeScriptModule(
    'apps/website/src/lib/rfq-access.ts',
  )

  assert.deepEqual(resolveRfqAccess({ id: 42, role: 'customer' }, '99'), {
    ok: true,
    customerId: 42,
  })
  assert.deepEqual(resolveRfqAccess({ id: 7, role: 'editor' }, null), {
    ok: true,
    customerId: null,
  })
  assert.deepEqual(resolveRfqAccess({ id: 7, role: 'sales' }, '12'), {
    ok: true,
    customerId: 12,
  })
  assert.equal(resolveRfqAccess({ id: 7, role: 'unknown' }, null).ok, false)
  assert.equal(resolveRfqAccess({ id: 7, role: 'admin' }, 'not-a-number').ok, false)
})

test('service worker excludes authenticated and Next.js runtime traffic from Cache Storage', async () => {
  const worker = await read('apps/website/public/sw.js')

  assert.match(worker, /homeu-static-v3/)
  assert.match(worker, /url\.pathname\.startsWith\('\/_next\/static\/'\)/)
  assert.match(worker, /url\.pathname\.startsWith\('\/api\/'\)/)
  assert.match(worker, /url\.pathname\.startsWith\('\/customer\/'\)/)
  assert.doesNotMatch(worker, /cacheFirst\(request, CACHE\.STATIC\)/)
  assert.doesNotMatch(worker, /return caches\.match\('\/'\)/)
})

test('service worker script is never served with immutable caching', async () => {
  const [nextConfig, nginxConfig] = await Promise.all([
    read('apps/website/next.config.mjs'),
    read('homeu.conf'),
  ])

  assert.match(nextConfig, /source: '\/sw\.js'[\s\S]*?no-store/)
  assert.equal((nginxConfig.match(/location = \/sw\.js/g) || []).length, 2)
  assert.match(nginxConfig, /location = \/sw\.js[\s\S]*?no-store/)
})

test('dashboard profile and RFQ clients use server-owned customer scope', async () => {
  const [meRoute, dashboard, orders] = await Promise.all([
    read('apps/website/src/app/api/customers/me/route.ts'),
    read('apps/website/src/app/customer/dashboard/page.tsx'),
    read('apps/website/src/app/customer/orders/page.tsx'),
  ])

  assert.match(meRoute, /SELECT id, name, email, phone, address, company/)
  assert.doesNotMatch(dashboard, /customerId=\$\{user\.id\}/)
  assert.doesNotMatch(orders, /where\[customer\]\[equals\]/)
  assert.match(dashboard, /Failed to load quotation requests/)
  assert.match(orders, /Failed to load order history/)
})
