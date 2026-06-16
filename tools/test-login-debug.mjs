import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  // Intercept all requests
  page.on("request", req => {
    if (req.url().includes("login")) {
      console.log("Login request:", req.method(), req.url());
      console.log("  Headers:", JSON.stringify(req.headers()));
      console.log("  Body:", req.postData());
    }
  });
  page.on("response", resp => {
    if (resp.url().includes("login")) {
      resp.text().then(t => console.log("Login response:", t)).catch(() => {});
    }
  });

  await page.goto("https://admin.homeatelier.ph/admin/login", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Fill form
  await page.fill('input[type="email"]', "jpgyap@gmail.com");
  await page.fill('input[type="password"]', "DaVinciOS");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: "/tmp/login-debug.png" });
  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
