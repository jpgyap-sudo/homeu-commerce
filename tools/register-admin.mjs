import { chromium } from "playwright";

async function main() {
  console.log("Creating first admin user...");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  await page.goto("https://admin.homeatelier.ph/admin/create-first-user", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Fill in the form
  await page.fill('input[name="email"]', "jpgyap@gmail.com");
  await page.fill('input[name="password"]', "DaVinciOS");
  await page.fill('input[name="confirm-password"]', "DaVinciOS");
  await page.fill('input[name="name"]', "Admin User");
  await page.fill('input[name="phone"]', "+639175550000");

  // Take screenshot before submit
  await page.screenshot({ path: "/tmp/before-submit.png" });

  // Click the create button
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  // Wait for navigation/response
  await page.waitForTimeout(8000);

  // Check result
  const result = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    bodySnippet: document.body?.innerText?.substring(0, 500) || "",
    hasError: !!document.querySelector('[class*="error"]'),
    errorText: document.querySelector('[class*="error"]')?.textContent || "",
  }));

  console.log("\nResult:");
  console.log("  URL:", result.url);
  console.log("  Title:", result.title);
  console.log("  Errors on page:", result.hasError);

  if (result.url.includes("admin/login") || result.url.includes("admin")) {
    console.log("\n✅ ADMIN USER CREATED! Redirected to:", result.url);
  } else if (result.hasError) {
    console.log("\n❌ Error:", result.errorText);
  } else {
    console.log("\n⚠️  Unexpected state. Body:", result.bodySnippet);
  }

  await page.screenshot({ path: "/tmp/after-submit.png" });

  console.log("\nJS Errors:", errors.length);
  errors.forEach(e => console.log("  -", e.substring(0, 200)));

  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
