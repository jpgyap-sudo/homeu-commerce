import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  await page.goto("https://admin.homeatelier.ph/admin/create-first-user", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(5000);

  // Fill ALL required fields with careful typing
  console.log("Filling form...");
  
  // Clear fields first to avoid validation issues
  await page.evaluate(() => {
    document.querySelectorAll("input").forEach(i => i.value = "");
  });

  await page.type('input[name="email"]', "jpgyap@gmail.com");
  await page.type('input[name="password"]', "DaVinciOS");
  await page.type('input[name="confirm-password"]', "DaVinciOS");
  await page.type('input[name="name"]', "Admin User");
  await page.type('input[name="phone"]', "09175550000");

  await page.screenshot({ path: "/tmp/before-submit-v2.png" });
  
  console.log("Clicking submit...");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(10000);

  const result = await page.evaluate(() => {
    const errors = [...document.querySelectorAll(".error, [class*=error], li")].map(e => e.textContent.trim()).filter(Boolean);
    return {
      url: location.href,
      errors: errors.slice(0, 10),
      pageText: document.body?.innerText?.substring(0, 1000) || "",
    };
  });

  console.log("URL:", result.url);
  console.log("Errors:", result.errors);
  console.log("Text:", result.pageText);

  if (result.url.includes("login") && !result.url.includes("create")) {
    console.log("USER CREATED AND REDIRECTED TO LOGIN!");
  }

  await page.screenshot({ path: "/tmp/result-v2.png" });
  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
