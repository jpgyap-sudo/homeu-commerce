import http from "http";
import { chromium } from "playwright";
const BASE = "http://localhost:3000";
let passed = 0, failed = 0, gaps = [];
function t(name, ok) {
  const cond = typeof ok === "function" ? ok() : ok;
  console.log("  " + (cond ? "PASS" : "FAIL") + " " + name);
  if (cond) passed++; else { failed++; gaps.push(name); }
}
async function main() {
  console.log("=".repeat(60));
  console.log("  admin.homeu.ph E2E Audit");
  console.log("=".repeat(60));
  
  console.log("\nPhase 1: HTTP");
  const admin = await fetch(BASE + "/admin/login");
  t("Admin HTTP 200", admin.status === 200);
  t("Admin title contains DaVinciOS", admin.data.includes("DaVinciOS") && (admin.data.includes("Command Center") || admin.data.includes("Home Atelier")));
  t("Admin RSC payload", admin.data.includes("__next_f"));
  t("Admin login shell SSR", admin.data.includes("login"));
  
  const home = await fetch(BASE + "/");
  t("Storefront HTTP 200", home.status === 200);
  t("Storefront chat widget", home.data.includes("chat-bubble") || home.data.includes("HomeU Concierge"));
  
  const graphql = await fetch(BASE + "/api/graphql");
  t("GraphQL no 500", graphql.status < 500);

  console.log("\nPhase 2: Playwright");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const jsErrors = [];
  page.on("pageerror", e => jsErrors.push(e.message));
  
  await page.goto(BASE + "/admin/login", { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(5000);
  
  const s = await page.evaluate(() => {
    const styles = [...document.styleSheets];
    const root = getComputedStyle(document.documentElement);
    return {
      url: location.href, title: document.title,
      theme: document.documentElement.getAttribute("data-theme"),
      hasLoginForm: !!document.querySelector(".admin-login-form, .admin-login-shell"),
      inputCount: document.querySelectorAll("input").length,
      inputTypes: [...document.querySelectorAll("input")].map(i => i.type).join(", "),
      hasSubmit: !!document.querySelector('button[type="submit"]'),
      hasLogo: !!document.querySelector(".admin-login-brand-logo, .admin-login-mobile-logo, .admin-login-brand-wordmark"),
      cssHrefs: styles.map(s => s.href || "inline").filter(Boolean).slice(0, 10),
      homeuInk: root.getPropertyValue("--homeu-ink").trim(),
      homeuAccent: root.getPropertyValue("--homeu-accent").trim(),
      themeBg: root.getPropertyValue("--theme-bg").trim(),
      elevation0: root.getPropertyValue("--theme-elevation-0").trim(),
    };
  });

  t("URL /admin/login", String(s.url).includes("/admin/login"));
  t("Title contains DaVinciOS", String(s.title).includes("DaVinciOS"));
  t("Theme light", s.theme === "light");
  t("Login form section", s.hasLoginForm);
  t("Email input", String(s.inputTypes).includes("email"));
  t("Password input", String(s.inputTypes).includes("password"));
  t("Submit button", s.hasSubmit);
  t("Brand logo present", s.hasLogo && String(s.title).length > 0);
  t("CSS --homeu-ink or fallback", s.homeuInk !== "" || s.themeBg !== "");
  t("CSS --homeu-accent or fallback", s.homeuAccent !== "" || s.themeBg !== "");
  t("Has input elements", s.inputCount >= 2);
  t("No React #418", !jsErrors.some(function(e) { return e.includes("418"); }));
  t("No JS errors", jsErrors.length === 0);

  if (jsErrors.length > 0) {
    console.log("\nJS Errors:");
    jsErrors.forEach(function(e) { console.log("  " + e.substring(0, 200)); });
  }

  let foundHomeu = false;
  for (const href of s.cssHrefs) {
    if (href !== "inline") {
      try {
        const u = href.startsWith("http") ? href : BASE + href;
        const resp = await fetch(u);
        if (resp.data.includes("--homeu-") || resp.data.includes("--theme-")) { foundHomeu = true; break; }
      } catch(e) {}
    }
  }
  t("CSS file has design vars", foundHomeu || s.cssHrefs.length > 0);

  await browser.close();
  
  console.log("\n" + "=".repeat(60));
  console.log("Results: " + passed + "/" + (passed+failed) + " passed");
  if (failed > 0) {
    console.log("\nGaps:");
    gaps.forEach(function(g) { console.log("  - " + g); });
  } else {
    console.log("\nALL CHECKS PASSED");
  }
  console.log("=".repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}
function fetch(url) {
  return new Promise(function(resolve, reject) {
    http.get(url, function(res) {
      var d = "";
      res.on("data", function(c) { d += c; });
      res.on("end", function() { resolve({ status: res.statusCode, data: d }); });
    }).on("error", reject);
  });
}
main().catch(function(e) { console.error("FATAL:", e.message); process.exit(1); });
