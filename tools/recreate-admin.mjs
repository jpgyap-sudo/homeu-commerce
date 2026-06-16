import { chromium } from "playwright";

async function main() {
  // First, delete existing user via SQL
  const { execSync } = await import("child_process");
  try {
    execSync("docker exec -i homeu-commerce-postgres-1 psql -U homeu -d homeu", {
      input: "DELETE FROM customers WHERE email='jpgyap@gmail.com';\n",
      encoding: "utf-8",
    });
    console.log("User deleted");
  } catch (e) {
    console.log("Delete result:", e.message.substring(0, 100));
  }

  // Now create via Playwright form
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const logs = [];
  page.on("console", m => logs.push({ t: m.type(), msg: m.text() }));
  page.on("pageerror", e => logs.push({ t: "error", msg: e.message }));

  await page.goto("https://admin.homeatelier.ph/admin/login", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(3000);

  console.log("Page:", await page.title());
  console.log("URL:", page.url());

  // Check if we're on create-first-user or login page
  const isCreateForm = await page.evaluate(() => !!document.querySelector('input[name="confirm-password"]'));

  if (isCreateForm) {
    console.log("Create-first-user form detected");
    await page.fill('input[name="email"]', "jpgyap@gmail.com");
    await page.fill('input[name="password"]', "DaVinciOS");
    await page.fill('input[name="confirm-password"]', "DaVinciOS");
    await page.fill('input[name="name"]', "Admin User");
    await page.fill('input[name="phone"]', "+639175550000");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(10000);
    console.log("After submit URL:", page.url());
    const errs = await page.evaluate(() => {
      return [...document.querySelectorAll(".error, [class*=error]")].map(e => e.textContent);
    });
    console.log("Errors:", errs);
  } else {
    console.log("Login page — user still exists or create flow not triggered");
  }

  await page.screenshot({ path: "/tmp/recreate-result.png" });
  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
