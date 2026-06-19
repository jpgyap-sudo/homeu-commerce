import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

// Login
await page.goto('http://localhost:3000/admin/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(2000);
console.log('LOGIN URL:', page.url());

const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]');
const passInput = await page.$('input[type="password"]') || await page.$('input[name="password"]');

if (emailInput) console.log('EMAIL INPUT FOUND');
if (passInput) console.log('PASS INPUT FOUND');

if (emailInput && passInput) {
  await emailInput.fill('kilo@xx.com');
  await passInput.fill('kilo');
  
  // Try clicking the submit button
  const submitBtn = await page.$('button[type="submit"]') || await page.$('button:has-text("Login")');
  if (submitBtn) {
    console.log('SUBMIT BUTTON FOUND');
    await submitBtn.click();
    await page.waitForTimeout(3000);
    console.log('AFTER LOGIN URL:', page.url());
  }
}

// Navigate to theme
await page.goto('http://localhost:3000/admin/theme', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000);
console.log('THEME URL:', page.url());
console.log('THEME TITLE:', await page.title());

// Check body text
const bodyText = await page.textContent('body');
console.log('BODY (first 800 chars):', bodyText.substring(0, 800));

// Check if we got redirected
if (page.url().includes('login')) {
  console.log('❌ Redirected to login — not authenticated');
  
  // Check if there's a message
  const msg = await page.textContent('body');
  console.log('LOGIN PAGE:', msg.substring(0, 400));
}

// Look for any section-related elements
const sections = await page.$$('[data-section-id]');
console.log('sections found:', sections.length);

// Look for buttons
const buttons = await page.$$('button');
console.log('buttons found:', buttons.length);
for (const btn of buttons.slice(0, 10)) {
  const text = await btn.textContent();
  console.log('  button:', text.trim().substring(0, 60));
}

// Check all links
const links = await page.$$('a');
console.log('links found:', links.length);
for (const lnk of links.slice(0, 5)) {
  const text = await lnk.textContent();
  const href = await lnk.getAttribute('href');
  console.log('  link:', (text||'').trim().substring(0, 40), '->', href);
}

await browser.close();
