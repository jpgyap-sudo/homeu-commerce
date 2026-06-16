import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  // Delete existing incomplete user first via direct DB
  // Then navigate and submit correctly

  await page.goto("https://admin.homeatelier.ph/admin/create-first-user", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Fill all required fields properly
  await page.fill('input[name="email"]', "jpgyap@gmail.com");
  await page.fill('input[name="password"]', "DaVinciOS");
  await page.fill('input[name="confirm-password"]', "DaVinciOS");
  await page.fill('input[name="name"]', "Admin User");
  await page.fill('input[name="phone"]', "+639175550000");

  // Wait and click submit
  await page.click('button[type="submit"]');

  // Wait for API response
  await page.waitForTimeout(10000);
  await page.screenshot({ path: "/tmp/register-final.png" });

  const result = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    errors: [...document.querySelectorAll(".error, .field-error, [class*=error]")].map(e => e.textContent),
    bodyText: document.body?.innerText?.substring(0, 1000) || "",
  }));

  console.log("URL:", result.url);
  console.log("Title:", result.title);
  if (result.errors.length) console.log("Errors:", result.errors);
  console.log("Page text:", result.bodyText);
  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
