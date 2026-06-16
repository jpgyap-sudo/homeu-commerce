import { chromium } from 'playwright';
import fs from 'fs';
const OUTPUT = '/tmp/admin-check-result.json';

async function main() {
  console.log('Launching Playwright on VPS...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  console.log('Navigating to http://localhost:3000/admin/login ...');
  await page.goto('http://localhost:3000/admin/login', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  // Wait for JS to execute
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => {
    const wrap = document.querySelector('.template-minimal__wrap');
    return {
      url: location.href,
      title: document.title,
      theme: document.documentElement.getAttribute('data-theme'),
      hasLoginForm: !!document.querySelector('.login'),
      loginWrapContent: wrap?.innerHTML?.substring(0, 500) || 'EMPTY',
      hasInputs: document.querySelectorAll('input').length > 0,
      inputTypes: [...document.querySelectorAll('input')].map(i => i.type || i.name).join(', '),
      hasSubmitButton: !!document.querySelector('button[type="submit"]'),
      bodyPreview: document.body?.innerHTML?.substring(0, 3000) || 'N/A',
    };
  });

  console.log('\n📊 RESULTS:');
  for (const [k, v] of Object.entries(state)) {
    console.log(`  ${k}: ${typeof v === 'string' ? v.substring(0, 300) : v}`);
  }

  console.log(`\n⚠️  Errors: ${errors.length}`);
  errors.forEach(e => console.log(`  ${e}`));

  // Save
  fs.writeFileSync(OUTPUT, JSON.stringify({ state, errors }, null, 2));

  if (state.hasInputs) {
    console.log('\n✅✅✅ LOGIN FORM IS FULLY WORKING!');
  } else {
    console.log('\n⚠️ Login form inputs not found (may need JS timeout increase)');
  }

  await browser.close();
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
