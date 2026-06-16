import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  await page.goto('https://admin.homeu.ph/admin/login', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const cssState = await page.evaluate(() => {
    // Check all stylesheets loaded
    const sheets = [...document.styleSheets].map(s => s.href || 'inline').filter(Boolean);
    return {
      url: location.href,
      title: document.title,
      customCSSLoaded: sheets.some(s => s.includes('admin-theme')),
      homeuCSSVars: getComputedStyle(document.documentElement).getPropertyValue('--homeu-ink').trim(),
      daVinciosCSSLoaded: sheets.some(s => s.includes('davincios')),
      totalStylesheets: sheets.length,
      stylesheetUrls: sheets,
    };
  });

  console.log('\n📊 CSS Loading Check:');
  for (const [k, v] of Object.entries(cssState)) {
    if (Array.isArray(v)) {
      console.log(`  ${k}:`);
      v.forEach(s => console.log(`    - ${s}`));
    } else {
      console.log(`  ${k}: ${v}`);
    }
  }

  if (cssState.homeuCSSVars) {
    console.log('\n✅ HomeU custom theme IS loaded and applied');
  } else {
    console.log('\n⚠️ HomeU custom theme NOT detected');
  }

  await browser.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
