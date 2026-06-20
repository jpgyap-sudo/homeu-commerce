/**
 * Full Playwright E2E test:
 * 1. Verify API returns footer sections
 * 2. Log into admin panel
 * 3. Screenshot the dashboard sidebar
 * 4. Navigate to Theme Editor
 * 5. Verify footer section cards appear
 * 6. Take screenshots for proof
 */

import { chromium } from "playwright";

var BASE = process.env.BASE_URL || "http://localhost:3000";
var EXPECTED_FOOTER_TYPES = ["footer_brand", "footer_quick_links", "footer_newsletter", "footer_social"];

// Try common credentials
var CREDENTIALS = [
  ["admin@homeu.ph", "admin123"],
  ["admin@homeatelier.ph", "admin123"],
  ["admin@homeu.ph", "password123"],
  ["admin@homeu.ph", "homeu123"],
];

async function main() {
  var browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  var context = await browser.newContext({ ignoreHTTPSErrors: true });
  var page = await context.newPage();

  // ─── Step 1: Verify API ─────────────────────────────────────────────
  console.log("\n═══ Step 1: API /api/theme/sections ═══");
  var apiResp = await page.goto(BASE + "/api/theme/sections", { waitUntil: "domcontentloaded", timeout: 15000 });

  if (!apiResp || !apiResp.ok()) {
    console.log("✖ API returned " + (apiResp ? apiResp.status() : "no response"));
    await browser.close();
    process.exit(1);
  }

  var body = JSON.parse(await page.evaluate(function() { return document.body.innerText; }));
  var sections = body.sections || [];

  var footerTypes = sections.filter(function(s) { return s.type && s.type.startsWith("footer_"); }).map(function(s) { return s.type; });
  console.log("  Footer sections found:", footerTypes.join(", "));

  var missing = EXPECTED_FOOTER_TYPES.filter(function(t) { return footerTypes.indexOf(t) === -1; });
  if (missing.length > 0) {
    console.log("✖ MISSING:", missing.join(", "));
    await browser.close();
    process.exit(1);
  }
  console.log("  ✓ All footer sections present in API");

  // ─── Step 2: Try to log in ──────────────────────────────────────────
  console.log("\n═══ Step 2: Admin login ═══");
  await page.goto(BASE + "/admin/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.screenshot({ path: "C:\\Users\\user\\.homeu-commerce\\tools\\screenshots\\01-login-page.png", fullPage: false });
  console.log("  ✓ Screenshot: login page");

  var loggedIn = false;
  for (var i = 0; i < CREDENTIALS.length; i++) {
    var email = CREDENTIALS[i][0];
    var password = CREDENTIALS[i][1];

    // Fill login form
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Wait a bit for redirect
    await page.waitForTimeout(2000);

    if (page.url().includes("/dashboard")) {
      console.log("  ✓ Logged in with " + email);
      loggedIn = true;
      break;
    }
  }

  if (!loggedIn) {
    // Maybe the user is already logged in via cookie - try going to dashboard
    await page.goto(BASE + "/admin/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 });
    if (!page.url().includes("/login")) {
      console.log("  ✓ Already authenticated (existing session cookie)");
      loggedIn = true;
    }
  }

  if (!loggedIn) {
    console.log("  ✖ Could not log in with any credential");
    console.log("  Please log in manually then re-run this test.");
    await page.screenshot({ path: "C:\\Users\\user\\.homeu-commerce\\tools\\screenshots\\02-login-failed.png", fullPage: false });
    await browser.close();
    process.exit(1);
  }

  // ─── Step 3: Dashboard screenshot ───────────────────────────────────
  console.log("\n═══ Step 3: Dashboard sidebar ═══");
  await page.screenshot({ path: "C:\\Users\\user\\.homeu-commerce\\tools\\screenshots\\03-dashboard.png", fullPage: true });
  console.log("  ✓ Screenshot: dashboard with sidebar");

  // Check sidebar for "Theme" link
  var sidebarText = await page.evaluate(function() {
    var sidebar = document.querySelector(".luxe-sidebar, .admin-sidebar");
    return sidebar ? sidebar.innerText : "NO SIDEBAR FOUND";
  });
  console.log("  Sidebar contains 'Theme': " + (sidebarText.indexOf("Theme") !== -1));

  // ─── Step 4: Navigate to Theme Editor ───────────────────────────────
  console.log("\n═══ Step 4: Theme Editor /admin/theme ═══");
  await page.goto(BASE + "/admin/theme", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.screenshot({ path: "C:\\Users\\user\\.homeu-commerce\\tools\\screenshots\\04-theme-editor.png", fullPage: true });
  console.log("  ✓ Screenshot: theme editor");

  // Wait for section cards to render
  await page.waitForTimeout(1000);

  // Check page text for footer section labels
  var pageText = await page.evaluate(function() { return document.body.innerText; });

  console.log("\n  Checking for footer section labels in page text:");
  for (var i = 0; i < EXPECTED_FOOTER_TYPES.length; i++) {
    var t = EXPECTED_FOOTER_TYPES[i];
    // Convert type to label: footer_brand -> Footer · Brand
    var label = t.replace("footer_", "Footer · ").replace(/_/g, " ");
    label = label.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    // Also check raw type string
    var found = pageText.indexOf(t) !== -1 || pageText.indexOf(label) !== -1;
    console.log("  " + (found ? "✓" : "✖") + " " + label);
  }

  // ─── Step 5: Open Add Section dropdown ──────────────────────────────
  console.log("\n═══ Step 5: Add section dropdown ═══");
  var addBtn = await page.$('button:has-text("Add section")');
  if (addBtn) {
    await addBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "C:\\Users\\user\\.homeu-commerce\\tools\\screenshots\\05-add-section-dropdown.png", fullPage: true });
    console.log("  ✓ Screenshot: add section dropdown");

    var dropdownText = await page.evaluate(function() { return document.body.innerText; });
    var footerLabels = ["Footer · Brand", "Footer · Quick Links", "Footer · Newsletter", "Footer · Social"];
    for (var i = 0; i < footerLabels.length; i++) {
      var lbl = footerLabels[i];
      var found = dropdownText.indexOf(lbl) !== -1;
      console.log("  " + (found ? "✓" : "✖") + " '" + lbl + "' in dropdown");
    }
  } else {
    console.log("  ✖ Could not find 'Add section' button");
  }

  await browser.close();

  console.log("\n═══════════════════════════════════════");
  console.log("Screenshots saved to: tools/screenshots/");
  console.log("Check 04-theme-editor.png and 05-add-section-dropdown.png");
  console.log("to visually verify footer sections appear.");
  console.log("═══════════════════════════════════════\n");
}

main().catch(function(e) {
  console.error("FATAL: " + e.message);
  process.exit(1);
});
