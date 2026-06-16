import { chromium } from "playwright";
import fs from "fs";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

  // DESKTOP viewport (logo panel visible)
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("https://admin.homeatelier.ph/admin/login", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "/tmp/logo-desktop.png", fullPage: true });

  const logo = await page.evaluate(() => {
    const svg = document.querySelector(".admin-login-daVinci-logo");
    const brand = document.querySelector(".admin-login-brand-panel");
    const mobile = document.querySelector(".admin-login-mobile-brand");
    return {
      daVinciLogoSVG: !!svg,
      svgWidth: svg?.getAttribute("width"),
      svgHeight: svg?.getAttribute("height"),
      svgHTML: svg?.outerHTML?.substring(0, 300),
      brandPanelVisible: brand ? window.getComputedStyle(brand).display !== "none" : false,
      mobileBrandVisible: mobile ? window.getComputedStyle(mobile).display !== "none" : false,
      viewportWidth: window.innerWidth,
    };
  });

  console.log("=== DESKTOP (1440px) ===");
  for (const [k, v] of Object.entries(logo)) console.log(`  ${k}: ${v}`);

  // Check mobile
  const mobile2 = await browser.newPage({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
  await mobile2.goto("https://admin.homeatelier.ph/admin/login", { waitUntil: "networkidle", timeout: 30000 });
  await mobile2.waitForTimeout(3000);
  await mobile2.screenshot({ path: "/tmp/logo-mobile.png", fullPage: true });
  
  const logoM = await mobile2.evaluate(() => {
    const svg = document.querySelector(".admin-login-daVinci-logo");
    const brand = document.querySelector(".admin-login-brand-panel");
    const mobile = document.querySelector(".admin-login-mobile-brand");
    return {
      daVinciLogoSVG: !!svg,
      brandPanelVisible: brand ? window.getComputedStyle(brand).display !== "none" : false,
      mobileBrandVisible: mobile ? window.getComputedStyle(mobile).display !== "none" : false,
      mobileBrandHTML: mobile?.innerHTML?.substring(0, 300),
    };
  });

  console.log("\n=== MOBILE (390px) ===");
  for (const [k, v] of Object.entries(logoM)) console.log(`  ${k}: ${v}`);

  console.log("\nScreenshots saved:");
  console.log("  Desktop: /tmp/logo-desktop.png");
  console.log("  Mobile:  /tmp/logo-mobile.png");
  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
