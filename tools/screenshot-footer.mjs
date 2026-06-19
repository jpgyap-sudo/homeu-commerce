import { chromium } from "playwright";
var BASE = "http://localhost:3000";

async function main() {
  var browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  var page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Step 1: Log in
  await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);

  var creds = [
    ["admin@homeatelier.ph", "admin123"],
    ["admin@homeu.ph", "admin123"],
  ];
  var loggedIn = false;
  for (var c of creds) {
    await page.fill('input[name="email"]', c[0]);
    await page.fill('input[name="password"]', c[1]);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    if (!page.url().includes("/login")) { loggedIn = true; console.log("Logged in as " + c[0]); break; }
  }

  if (!loggedIn) {
    console.log("Login failed, trying dashboard directly...");
    await page.goto(BASE + "/admin/dashboard", { waitUntil: "domcontentloaded", timeout: 15000 });
    if (!page.url().includes("/login")) { loggedIn = true; console.log("Session exists"); }
  }

  if (!loggedIn) {
    console.log("Could not log in. Taking screenshot of login page.");
    await page.screenshot({ path: "C:\\Users\\user\\.homeu-commerce\\tools\\login-page.png", fullPage: false });
    await browser.close();
    return;
  }

  // Step 2: Navigate to theme editor
  console.log("Navigating to /admin/theme...");
  await page.goto(BASE + "/admin/theme", { waitUntil: "domcontentloaded", timeout: 30000 });
  // Wait for React to hydrate and render section cards
  await page.waitForTimeout(5000);

  // Step 3: Take full page screenshot
  await page.screenshot({ path: "C:\\Users\\user\\.homeu-commerce\\tools\\theme-editor-full.png", fullPage: true });
  console.log("✓ Screenshot saved: theme-editor-full.png");

  // Step 4: Check what sections are visible
  var info = await page.evaluate(function() {
    var text = document.body.innerText;
    var lines = text.split("\n").filter(function(l) { return l.trim().length > 0; });
    // Find footer-related lines
    var footerLines = lines.filter(function(l) { return l.indexOf("Footer") !== -1 || l.indexOf("footer") !== -1 || l.indexOf("Brand") !== -1 || l.indexOf("Quick Link") !== -1 || l.indexOf("Newsletter") !== -1 || l.indexOf("Social") !== -1; });
    return {
      totalLines: lines.length,
      footerRelated: footerLines.slice(0, 20),
    };
  });
  console.log("Page info:");
  console.log("  Total text lines: " + info.totalLines);
  console.log("  Footer-related lines:");
  for (var i = 0; i < info.footerRelated.length; i++) {
    console.log("    " + info.footerRelated[i]);
  }

  await browser.close();
  console.log("\nScreenshot saved to tools/theme-editor-full.png");
}

main().catch(function(e) { console.error("Error: " + e.message); process.exit(1); });
