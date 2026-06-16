#!/usr/bin/env node
/**
 * admin.homeu.ph - Extended wait test for login form rendering
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, 'output', 'admin-wait-test');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  console.log('='.repeat(70));
  console.log('  admin.homeu.ph - Extended wait test');
  console.log('='.repeat(70));

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Track errors
  const errors = [];
  const allConsole = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => allConsole.push({ type: msg.type(), text: msg.text() }));

  console.log('\n📡 Loading admin.homeu.ph/admin/login ...');
  await page.goto('https://admin.homeu.ph/admin/login', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // Screenshot at T=0
  await page.screenshot({ path: path.join(OUTPUT_DIR, 't0.png') });

  // Poll for login form every 2 seconds up to 30 seconds
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);
    
    const hasInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const wrap = document.querySelector('.template-minimal__wrap');
      return {
        hasInputs: inputs.length > 0,
        inputTypes: [...inputs].map(i => i.type || i.name || i.id).join(', '),
        wrapInnerHTML: wrap?.innerHTML?.substring(0, 300) || 'EMPTY',
        bodyHTML: document.body?.innerHTML?.substring(1000, 2000) || 'N/A',
        theme: document.documentElement.getAttribute('data-theme'),
      };
    }, { timeout: 5000 }).catch(() => ({}));

    console.log(`  T=${i * 2 + 2}s: inputs=${hasInputs.hasInputs} theme=${hasInputs.theme}`);

    if (hasInputs.hasInputs) {
      console.log('\n✅ LOGIN FORM FOUND after', (i + 1) * 2 + 2, 'seconds!');
      console.log('  Input types:', hasInputs.inputTypes);
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'login-rendered.png'), fullPage: true });
      break;
    }
  }

  // Final screenshot
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'final.png'), fullPage: true });

  // Final state
  const finalState = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    theme: document.documentElement.getAttribute('data-theme'),
    bodyLength: document.body?.innerHTML?.length || 0,
    inputs: [...document.querySelectorAll('input')].map(i => i.outerHTML).join('\n').substring(0, 1000) || 'NO INPUTS',
    wrapContent: document.querySelector('.template-minimal__wrap')?.innerHTML?.substring(0, 500) || 'EMPTY',
    loginSection: document.querySelector('.login')?.outerHTML?.substring(0, 500) || 'NO LOGIN SECTION',
    nextRoot: !!document.getElementById('__next'),
  }));

  console.log('\n📊 FINAL STATE:');
  for (const [k, v] of Object.entries(finalState)) {
    console.log(`  ${k}: ${String(v).substring(0, 200)}`);
  }

  console.log(`\n⚠️  JS errors: ${errors.length}`);
  errors.forEach(e => console.log(`  🔴 ${e.substring(0, 300)}`));

  console.log(`\n⚠️  Console errors: ${allConsole.filter(l => l.type === 'error').length}`);
  allConsole.filter(l => l.type === 'error').forEach(e => console.log(`  🔴 ${e.text.substring(0, 200)}`));

  // Check for hydration errors
  const hydErr = allConsole.filter(l => l.text.toLowerCase().includes('hydrat') || l.text.includes('418'));
  if (hydErr.length > 0) {
    console.log(`\n🔴 HYDRATION ERRORS:`);
    hydErr.forEach(e => console.log(`  ${e.text.substring(0, 300)}`));
  }

  // Save
  fs.writeFileSync(path.join(OUTPUT_DIR, 'final.json'), JSON.stringify({ finalState, errors, allConsole: allConsole.slice(0, 50) }, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log(`📁 ${OUTPUT_DIR}`);

  await browser.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
