#!/usr/bin/env node
/**
 * Direct test - admin via localhost on VPS proxy
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // Try with longer timeout and different wait strategy
  console.log('Loading admin.homeu.ph/admin...');
  try {
    await page.goto('https://admin.homeu.ph/admin', {
      timeout: 120000,
      waitUntil: 'commit',
    });
    console.log('Page loaded (commit)');
  } catch (e) {
    console.log(`First attempt failed: ${e.message}`);
    // Try again with longer timeout
    try {
      await page.goto('https://admin.homeu.ph/admin/login', {
        timeout: 120000,
        waitUntil: 'domcontentloaded',
      });
      console.log('Page loaded (second attempt)');
    } catch (e2) {
      console.log(`Second attempt failed: ${e2.message}`);
      await browser.close();
      return;
    }
  }

  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    theme: document.documentElement.getAttribute('data-theme'),
    hasLogin: !!document.querySelector('.login'),
    inputs: [...document.querySelectorAll('input')].map(i => `${i.type || i.name}`).join(', ') || 'NONE',
    wrapContent: document.querySelector('.template-minimal__wrap')?.innerHTML?.substring(0, 300) || 'EMPTY',
  }));

  console.log('\n📊 STATE:');
  for (const [k, v] of Object.entries(state)) console.log(`  ${k}: ${v}`);

  console.log(`\n⚠️  Errors: ${errors.length}`);
  errors.forEach(e => console.log(`  ${e}`));

  if (state.inputs !== 'NONE') {
    console.log('\n✅ LOGIN FORM IS WORKING - form inputs found!');
  } else {
    console.log('\n⚠️  No form inputs found');
  }

  await browser.close();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
