import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  // Intercept the API response
  page.on("response", resp => {
    if (resp.url().includes("first-register")) {
      resp.json().then(j => {
        console.log("API Response:", JSON.stringify(j, null, 2));
      }).catch(() => {});
    }
  });

  await page.goto("https://admin.homeatelier.ph/admin/create-first-user", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Only fill email + password (user's requirement)
  await page.fill('input[name="email"]', "jpgyap@gmail.com");
  await page.fill('input[name="password"]', "DaVinciOS");
  await page.fill('input[name="confirm-password"]', "DaVinciOS");
  // Fill required fields
  await page.fill('input[name="name"]', "Admin User");
  await page.fill('input[name="phone"]', "+639175550000");

  // Submit
  await page.click('button[type="submit"]');
  await page.waitForTimeout(8000);

  const result = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    text: document.body?.innerText?.substring(0, 1000) || "",
  }));

  console.log("\nFinal URL:", result.url);
  console.log("Title:", result.title);
  console.log("Page text:", result.text);
  await page.screenshot({ path: "/tmp/register-result.png" });
  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
