import { chromium } from "playwright";
import fs from "fs";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  await page.goto("https://admin.homeu.ph/admin/login", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);

  const html = await page.evaluate(() => {
    // Get the minimal template wrapper structure
    const wrap = document.querySelector(".template-minimal__wrap");
    const login = document.querySelector(".login");
    return {
      outerHTML: login ? login.outerHTML.substring(0, 5000) : "NO LOGIN",
      wrapInner: wrap ? wrap.innerHTML.substring(0, 3000) : "NO WRAP",
      computedStyles: login ? {
        loginBg: getComputedStyle(login).background,
        wrapBg: wrap ? getComputedStyle(wrap).background : "N/A",
        wrapShadow: wrap ? getComputedStyle(wrap).boxShadow : "N/A",
        wrapRadius: wrap ? getComputedStyle(wrap).borderRadius : "N/A",
      } : "N/A",
      // Check the login form structure
      loginForm: document.querySelector(".login__form") ? document.querySelector(".login__form").outerHTML.substring(0, 3000) : "NO FORM",
      loginBrand: document.querySelector(".login__brand") ? document.querySelector(".login__brand").outerHTML.substring(0, 1000) : "NO BRAND",
      // All class names on the page
      allClasses: [...document.querySelectorAll("[class]")].map(el => el.className).filter(Boolean),
    };
  });

  console.log("=== LOGIN SECTION HTML ===");
  console.log(html.outerHTML);
  console.log("\n=== WRAP INNER HTML ===");
  console.log(html.wrapInner);
  console.log("\n=== LOGIN FORM HTML ===");
  console.log(html.loginForm);
  console.log("\n=== LOGIN BRAND HTML ===");
  console.log(html.loginBrand);
  console.log("\n=== COMPUTED STYLES ===");
  console.log(JSON.stringify(html.computedStyles, null, 2));
  console.log("\n=== ALL CLASSES ===");
  html.allClasses.slice(0, 40).forEach(c => console.log("  " + c));

  fs.writeFileSync("/tmp/login-inspect.json", JSON.stringify(html, null, 2));
  await browser.close();
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
