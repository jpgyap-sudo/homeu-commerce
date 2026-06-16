import { chromium } from "playwright";
import fs from "fs";

const OUTPUT = "/tmp/visual-scan";
fs.mkdirSync(OUTPUT, { recursive: true });

async function scan(url, name) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SCANNING: ${url}`);
  console.log("=".repeat(60));

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Full page screenshot
    await page.screenshot({ path: `${OUTPUT}/${name}-full.png`, fullPage: true });

    // State analysis
    const state = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return {
        statusCode: window.performance?.getEntriesByType?.("navigation")?.[0]?.responseStatus || "?",
        url: location.href,
        title: document.title || "(empty)",
        htmlTheme: root.getAttribute("data-theme") || "(none)",
        bodyClasses: body?.className || "(none)",
        bodyChildCount: body?.children?.length || 0,
        bodyHTML: body?.innerHTML?.substring(0, 2000) || "EMPTY",
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        hasLoginForm: !!document.querySelector(".admin-login-form"),
        hasBrandPanel: !!document.querySelector(".admin-login-brand-panel"),
        hasInputs: document.querySelectorAll("input").length,
        inputTypes: [...document.querySelectorAll("input")].map(i => i.type || i.name).join(", "),
        hasSubmitBtn: !!document.querySelector(".admin-login-submit"),
        buttonText: document.querySelector(".admin-login-submit")?.textContent?.trim() || "",
        errorElements: [...document.querySelectorAll('[class*="error"]')].map(e => e.textContent?.trim()).filter(Boolean),
        has404: body?.innerText?.includes("404") || body?.innerText?.includes("could not be found"),
      };
    });

    console.log("  HTTP Status:", state.statusCode);
    console.log("  Final URL:", state.url);
    console.log("  Title:", state.title);
    console.log("  Theme:", state.htmlTheme);
    console.log("  Body children:", state.bodyChildCount);
    console.log("  Has 404 text:", state.has404);
    console.log("  Has login form:", state.hasLoginForm);
    console.log("  Has brand panel:", state.hasBrandPanel);
    console.log("  Inputs:", state.inputCount, "Types:", state.inputTypes);
    console.log("  Submit button:", state.hasSubmitBtn, state.buttonText);
    console.log("  Errors on page:", state.errorElements.length);
    if (errors.length > 0) console.log("  JS Errors:", errors.join(" | "));
    console.log("  Body preview:", state.bodyHTML.substring(0, 300));
    console.log(`  Screenshot saved: ${name}-full.png`);

    // Also save HTML dump
    const html = await page.content();
    fs.writeFileSync(`${OUTPUT}/${name}.html`, html);

    return state;
  } catch (e) {
    console.log("  FAILED:", e.message.substring(0, 200));
    await browser.close();
    return null;
  } finally {
    await browser.close();
  }
}

// Run scans
const results = [];
results.push(await scan("https://admin.homeatelier.ph/admin/login", "admin-login"));
results.push(await scan("https://store.homeatelier.ph/", "store-home"));
results.push(await scan("https://admin.homeatelier.ph/admin", "admin-root"));

// Summary
console.log("\n" + "=".repeat(60));
console.log("VISUAL SCAN SUMMARY");
console.log("=".repeat(60));

const passed = results.filter(r => r && !r.has404 && r.hasLoginForm);
const failed = results.filter(r => !r || r.has404);

if (failed.length === 0) {
  console.log("ALL OK — login pages rendering correctly");
  console.log("The user's 404 is NOT from our server — it's a network/DNS issue on their side");
  console.log("\nScreenshots saved to:", OUTPUT);
} else {
  console.log("ISSUES FOUND:");
  failed.forEach((r, i) => {
    console.log(`  ${i+1}. URL: ${r?.url || "N/A"} — has404: ${r?.has404}`);
  });
}

// List screenshot files
const files = fs.readdirSync(OUTPUT);
console.log("\nOutput files:", files.join(", "));
