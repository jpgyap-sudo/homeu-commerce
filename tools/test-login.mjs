import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const allLogs = [];
  page.on("console", m => allLogs.push({ type: m.type(), text: m.text() }));
  page.on("pageerror", e => allLogs.push({ type: "pageerror", text: e.message }));

  await page.goto("https://admin.homeatelier.ph/admin/login", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(3000);

  console.log("Login page loaded:", await page.title());

  // Fill credentials and submit
  await page.fill('input[type="email"]', "jpgyap@gmail.com");
  await page.fill('input[type="password"]', "DaVinciOS");
  await page.click('button[type="submit"]');

  // Wait for redirect to admin dashboard
  await page.waitForTimeout(10000);

  const result = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    bodyText: document.body?.innerText?.substring(0, 500) || "",
  }));

  console.log("\nAfter login:");
  console.log("  URL:", result.url);
  console.log("  Title:", result.title);
  console.log("  Text:", result.bodyText);

  if (result.url.includes("admin") && !result.url.includes("login") && !result.url.includes("create")) {
    console.log("\nLOGGED IN SUCCESSFULLY!");
  } else {
    console.log("\nLogin may have failed. Checking console...");
  }

  // Check for errors
  const errors = allLogs.filter(l => l.type === "error" || l.type === "pageerror");
  if (errors.length > 0) {
    console.log("\nErrors:", errors.map(e => e.text.substring(0, 200)).join("\n  "));
  }

  await page.screenshot({ path: "/tmp/login-result.png" });
  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
