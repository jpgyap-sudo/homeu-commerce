#!/usr/bin/env node
/**
 * Verify admin.homeu.ph fix
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, 'output', 'admin-fixed');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  console.log('='.repeat(70));
  console.log('  admin.homeu.ph - VERIFY FIX');
  console.log('='.repeat(70));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', err => errors.push(err.message));

  // Navigate to admin
  await page.goto('https://admin.homeu.ph/admin', {
    waitUntil: 'networkidle',
    timeout: 60000,
  }).catch(e => console.log(`  ⚠️  ${e.message}`));

  await page.waitForTimeout(5000);

  // Screenshot
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'admin-page.png'), fullPage: true });

  // Get state
  const state = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    htmlTheme: document.documentElement.getAttribute('data-theme'),
    bodyHTML: document.body?.innerHTML?.substring(0, 8000),
    hasLoginForm: !!document.querySelector('.login'),
    loginWrapContent: document.querySelector('.template-minimal__wrap')?.innerHTML?.substring(0, 500) || 'EMPTY',
    hasLoginInputs: !!document.querySelector('input[type="email"], input[type="password"], input[name="email"]'),
    hasReactErrors: !!document.querySelector('[data-nextjs-toast]'),
    noStorefrontHeader: !document.querySelector('.site-header'),
    errorCount: document.querySelectorAll('[class*="error"]').length,
  }));

  // Report
  console.log(`\n📊 Results:`);
  console.log(`  URL: ${state.url}`);
  console.log(`  Title: ${state.title}`);
  console.log(`  Theme: ${state.htmlTheme}`);
  console.log(`  Login form section: ${state.hasLoginForm ? '✅' : '❌'}`);
  console.log(`  Login wrap has content: ${state.loginWrapContent !== 'EMPTY' ? '✅' : '⚠️  Empty'}`);
  console.log(`  Email/password inputs: ${state.hasLoginInputs ? '✅' : '❌'}`);
  console.log(`  Storefront header hidden: ${state.noStorefrontHeader ? '✅' : '⚠️  Still visible'}`);
  console.log(`  React errors on screen: ${state.hasReactErrors ? '⚠️  Yes' : '✅ No'}`);
  console.log(`  JS page errors: ${errors.length > 0 ? `🔴 ${errors[0].substring(0, 200)}` : '✅ None'}`);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(state, null, 2));

  // Final verdict
  console.log('\n' + '='.repeat(70));
  if (!state.hasReactErrors && errors.length === 0 && state.hasLoginForm) {
    if (state.hasLoginInputs) {
      console.log('✅ FIX VERIFIED: Admin login form is fully working with inputs');
    } else if (state.loginWrapContent !== 'EMPTY') {
      console.log('✅ FIX VERIFIED: Admin login form has content (JS still loading)');
    } else {
      console.log('⚠️  PARTIAL FIX: No JS errors but form fields still not rendered');
    }
  } else if (errors.length > 0 && errors[0].includes('418')) {
    console.log('🔴 FIX FAILED: React Error #418 still occurring');
  } else {
    console.log('⚪ Check report for details');
  }
  console.log('='.repeat(70));

  await browser.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
