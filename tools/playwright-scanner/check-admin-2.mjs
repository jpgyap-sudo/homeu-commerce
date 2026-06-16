#!/usr/bin/env node
/**
 * admin.homeu.ph - Deeper JS/Hydration Diagnostics
 * Focuses on JS errors, hydration issues, and rendering state
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, 'output', 'admin-check-deep');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  console.log('='.repeat(70));
  console.log('  admin.homeu.ph - Deep JS Diagnostics');
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
  const allLogs = [];
  const pageErrors = [];

  page.on('console', msg => {
    allLogs.push({ type: msg.type(), text: msg.text(), location: msg.location() });
  });

  page.on('pageerror', err => {
    pageErrors.push({ message: err.message, stack: err.stack });
  });

  page.on('crash', () => {
    console.log('⚠️  PAGE CRASHED!');
  });

  console.log('\n📡 Navigating to admin.homeu.ph/admin ...');
  
  // Navigate with longer timeout
  await page.goto('https://admin.homeu.ph/admin', {
    waitUntil: 'networkidle',
    timeout: 60000,
  }).catch(e => console.log(`  ⚠️  goto warning: ${e.message}`));

  // Extra wait
  await page.waitForTimeout(3000);

  // Screenshot
  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'page-state.png'),
    fullPage: true,
  });

  // Check DOM state
  const state = await page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    htmlLang: document.documentElement.lang,
    htmlTheme: document.documentElement.getAttribute('data-theme'),
    bodyHTML: document.body?.innerHTML?.substring(0, 5000) || 'NO BODY',
    // Check for login form
    hasLoginForm: !!document.querySelector('.login'),
    loginWrapContent: document.querySelector('.template-minimal__wrap')?.innerHTML?.substring(0, 500) || 'EMPTY',
    hasLoginInputs: !!document.querySelector('input[type="email"], input[type="password"], input[name="email"]'),
    // Check for errors
    hasErrorElements: !!document.querySelector('[class*="error"]'),
    scriptCount: document.querySelectorAll('script').length,
    // React check
    hasReactRoot: !!(document.getElementById('__next') || document.querySelector('[data-reactroot]')),
    nextData: !!(window.__NEXT_DATA__ || document.getElementById('__NEXT_DATA__')),
    nextVersion: window.next?.version || 'N/A',
  }));

  // Log the state
  console.log('\n📊 PAGE STATE:');
  for (const [key, value] of Object.entries(state)) {
    const val = typeof value === 'string' ? value.substring(0, 200) : value;
    console.log(`  ${key}: ${JSON.stringify(val)}`);
  }

  // Check for hydration errors in console
  const hydrationErrors = allLogs.filter(l => 
    l.text.includes('hydrat') || l.text.includes('Hydrat') ||
    l.text.includes('text content did not match') ||
    l.text.includes('did not match') ||
    l.text.includes('Cannot read properties') ||
    l.text.includes('is not a function') ||
    l.text.includes('Failed') && l.text.includes('resource') 
  );

  const jsErrors = allLogs.filter(l => l.type === 'error');

  console.log(`\n⚠️  Console errors: ${jsErrors.length}`);
  console.log(`⚠️  Hydration/React errors: ${hydrationErrors.length}`);
  console.log(`⚠️  Page errors: ${pageErrors.length}`);

  if (hydrationErrors.length > 0) {
    console.log('\n🔴 HYDRATION/TEXT ERRORS:');
    hydrationErrors.forEach(e => console.log(`  [${e.type}] ${e.text.substring(0, 300)}`));
  }

  if (jsErrors.length > 0) {
    console.log('\n🔴 JS ERRORS:');
    jsErrors.forEach(e => console.log(`  [${e.type}] ${e.text.substring(0, 300)}`));
  }

  if (pageErrors.length > 0) {
    console.log('\n🔴 PAGE ERRORS:');
    pageErrors.forEach(e => console.log(`  ${e.message.substring(0, 300)}`));
  }

  // Check theme resolution
  const themeIssue = state.htmlTheme === '[object Object]';
  if (themeIssue) {
    console.log('\n🚩 THEME BUG: data-theme is "[object Object]" instead of "light"/"dark"');
    console.log('   This is caused by defaultTheme={"colors":{}} in @davincios/ui');
    console.log('   Fix: Set admin: { theme: "light" } in daVinciOS.config.ts');
  }

  // Save results
  const report = {
    state,
    allLogs: allLogs.slice(0, 100),
    pageErrors: pageErrors.slice(0, 20),
    hydrationErrors: hydrationErrors.slice(0, 20),
    hasThemeBug: themeIssue,
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  // Summary
  console.log('\n' + '='.repeat(70));
  if (state.hasLoginInputs) {
    console.log('✅ VERDICT: Login form IS rendering with form inputs after JS hydration');
  } else if (state.loginWrapContent !== 'EMPTY') {
    console.log('✅ VERDICT: Login wrap has content (but not inputs)');
  } else if (themeIssue) {
    console.log('📛 VERDICT: Theme bug detected - this causes hydration failure');
    console.log('   The login form is empty because React hydration bails out due to');
    console.log('   data-theme="[object Object]" mismatch. The fix is to set');
    console.log('   admin: { theme: "light" } in daVinciOS.config.ts on the VPS.');
  } else {
    console.log('⚪ VERDICT: Check full report for details');
  }
  console.log('='.repeat(70));
  console.log(`\n📁 Report: ${OUTPUT_DIR}`);

  await browser.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
