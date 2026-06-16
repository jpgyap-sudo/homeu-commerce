/**
 * E2E Audit v2 — Fixes regex issues and adds Playwright checks
 */
import http from 'http';
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
let passed = 0, failed = 0;
const gaps = [];

function test(name, ok) {
  console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  if (ok) passed++; else { failed++; gaps.push(name); }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  admin.homeu.ph — E2E Audit v2');
  console.log('='.repeat(60));

  // PHASE 1: HTTP checks
  console.log('\n📡 Phase 1: HTTP responses');
  const admin = await fetch(`${BASE}/admin/login`);
  test('Admin login HTTP 200', admin.status === 200);
  test('Admin page title present', admin.data.includes('HomeU Admin'));

  const home = await fetch(`${BASE}/`);
  test('Storefront HTTP 200', home.status === 200);
  test('Storefront has ChatWidget', home.data.includes('chat-bubble') || home.data.includes('HomeU Concierge'));

  // PHASE 2: Playwright browser checks
  console.log('\n🌐 Phase 2: Browser rendering');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => {
    const styles = [...document.styleSheets];
    const cssHrefs = styles.map(s => s.href || 'inline').filter(Boolean);
    const root = getComputedStyle(document.documentElement);
    return {
      url: location.href,
      title: document.title,
      theme: document.documentElement.getAttribute('data-theme'),
      hasLoginForm: !!document.querySelector('.login'),
      inputCount: document.querySelectorAll('input').length,
      inputTypes: [...document.querySelectorAll('input')].map(i => i.type).join(', '),
      hasSubmitButton: !!document.querySelector('button[type="submit"]'),
      hasLogo: !!document.querySelector('.graphic-logo, .login__brand svg'),
      // CSS checks
      styleSheetCount: styles.length,
      cssFileCount: cssHrefs.length,
      cssFiles: cssHrefs.slice(0, 10),
      // Check if custom CSS vars are loaded
      homeuInk: root.getPropertyValue('--homeu-ink').trim(),
      homeuAccent: root.getPropertyValue('--homeu-accent').trim(),
      themeBg: root.getPropertyValue('--theme-bg').trim(),
      elevation0: root.getPropertyValue('--theme-elevation-0').trim(),
    };
  });

  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  await page.waitForTimeout(1000);

  test('URL is /admin/login', state.url.includes('/admin/login'));
  test('Page title is HomeU Admin', state.title.includes('HomeU Admin'));
  test('Theme is "light"', state.theme === 'light');
  test('Login form section renders', state.hasLoginForm);
  test('Email input present', state.inputTypes.includes('email'));
  test('Password input present', state.inputTypes.includes('password'));
  test('Submit button present', state.hasSubmitButton);
  test('Brand logo renders', state.hasLogo);

  // CSS checks
  test('Custom CSS --homeu-ink is loaded', state.homeuInk !== '');
  test('Custom CSS --homeu-accent is loaded', state.homeuAccent !== '');
  test('--theme-bg is set (CSS vars work)', state.themeBg !== '');
  test('--theme-elevation-0 is set', state.elevation0 !== '');

  // Check the CSS files for admin-theme content
  let hasAdminThemeCSS = false;
  for (const href of state.cssFiles) {
    if (href !== 'inline') {
      try {
        const resp = await fetch(href.startsWith('http') ? href : `http://localhost:3000${href}`);
        if (resp.data.includes('--homeu-') || resp.data.includes('.login {')) {
          hasAdminThemeCSS = true;
        }
      } catch {}
    }
  }
  test('admin-theme.css CSS rules applied to page', hasAdminThemeCSS);

  // JS errors
  test('No React Error #418 (nested html/body)', () => 
    !jsErrors.some(e => e.includes('418') || e.includes('Minified React error #418'))
  );
  test('No fatal JS errors', () => jsErrors.length === 0);

  if (jsErrors.length > 0) {
    console.log('\n⚠️  JS Errors detected:');
    jsErrors.forEach(e => console.log(`  🔴 ${e.substring(0, 200)}`));
    gaps.push(`${jsErrors.length} JS errors on page`);
  }

  await browser.close();

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Results: ${passed}/${passed + failed} passed`);
  if (failed > 0) {
    console.log(`\n❌ ${failed} gaps found:`);
    gaps.forEach(g => console.log(`  - ${g}`));
  } else {
    console.log('\n✅ ALL CHECKS PASSED');
  }
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

// Utility for lazy test evaluation
function test(name, condition) {
  const ok = typeof condition === 'function' ? condition() : condition;
  console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  if (ok) passed++; else { failed++; gaps.push(name); }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
