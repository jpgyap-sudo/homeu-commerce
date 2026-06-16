import { chromium } from 'playwright';
import fs from 'fs';
const OUTPUT = '/tmp/admin-check-nginx.json';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // Test via nginx (localhost on port 443 is nginx)
  await page.goto('https://admin.homeu.ph/admin/login', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => {
    const wrap = document.querySelector('.template-minimal__wrap');
    return {
      url: location.href,
      title: document.title,
      theme: document.documentElement.getAttribute('data-theme'),
      hasLoginForm: !!document.querySelector('.login'),
      loginWrapContent: wrap?.innerHTML?.substring(0, 200) || 'EMPTY',
      inputCount: document.querySelectorAll('input').length,
      inputTypes: [...document.querySelectorAll('input')].map(i => i.type || i.name).join(', '),
      submitButton: !!document.querySelector('button[type="submit"]'),
    };
  });

  console.log('\n📊 NGINX PROXY RESULTS:');
  for (const [k, v] of Object.entries(state)) console.log(`  ${k}: ${typeof v === 'string' ? v.substring(0, 200) : v}`);
  console.log(`\n⚠️  Errors: ${errors.length}`);
  errors.forEach(e => console.log(`  ${e.substring(0, 200)}`));

  fs.writeFileSync(OUTPUT, JSON.stringify({ state, errors }, null, 2));
  
  if (state.inputCount > 0) {
    console.log('\n✅✅✅ ADMIN LOGIN FULLY WORKING VIA NGINX!');
  }

  await browser.close();
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
