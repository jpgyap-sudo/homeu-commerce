#!/usr/bin/env node
/**
 * Check RSC processing state on admin.homeu.ph
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, 'output', 'rsc-check');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Intercept network requests to check JS loading
  const loadedScripts = [];
  const failedScripts = [];
  page.on('response', resp => {
    if (resp.url().includes('/_next/static/chunks/')) {
      loadedScripts.push({ url: resp.url(), status: resp.status(), ok: resp.ok() });
    }
  });
  page.on('requestfailed', req => {
    if (req.url().includes('chunks')) {
      failedScripts.push({ url: req.url(), error: req.failure()?.errorText });
    }
  });

  await page.goto('https://admin.homeu.ph/admin/login', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForTimeout(5000);

  // Check RPC state
  const state = await page.evaluate(() => {
    const rsc = window.__next_f;
    const rscData = Array.isArray(rsc) ? rsc : null;
    return {
      hasRSC: !!rscData,
      rscLength: rscData?.length || 0,
      has_next_data: !!window.__NEXT_DATA__,
      has_next: !!window.next,
      nextVersion: window.next?.version || 'N/A',
      // Check if React root exists
      rootEl: document.querySelector('[data-nextjs-root]')?.id || 'none',
      // Look for the RSC root marker
      rscRoot: document.querySelector('script#_R_')?.src || 'none',
      // Check if the page has any injected styles
      styleCount: document.querySelectorAll('style[data-next-hide-fouc]').length,
      // All the __next_f entries
      rscEntryCount: rscData?.length || 0,
      rscFirst2Chars: rscData?.[0]?.substring?.(0, 20) || JSON.stringify(rscData?.[0]),
    };
  });

  console.log('\n📊 RSC State:');
  for (const [k, v] of Object.entries(state)) {
    console.log(`  ${k}: ${JSON.stringify(v)}`);
  }

  console.log(`\n📦 Loaded chunks: ${loadedScripts.length}`);
  loadedScripts.forEach(s => console.log(`  ${s.ok ? '✅' : '❌'} ${s.url.split('/').pop()} (${s.status})`));

  console.log(`\n❌ Failed chunks: ${failedScripts.length}`);
  failedScripts.forEach(s => console.log(`  ${s.url} - ${s.error}`));

  // Full raw HTML dump
  let html = await page.content();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'page.html'), html);
  console.log(`\n📄 Page HTML saved: ${(html.length / 1024).toFixed(1)}KB`);

  // Dump __next_f content for analysis
  const rscData = await page.evaluate(() => {
    const f = window.__next_f;
    if (Array.isArray(f)) return f.map((e, i) => ({ idx: i, data: String(e).substring(0, 200) }));
    return null;
  });
  if (rscData) {
    console.log('\n📋 RSC entries:');
    rscData.forEach(e => console.log(`  [${e.idx}] ${e.data}`));
  }

  await browser.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
