import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  await page.goto("https://admin.homeatelier.ph/admin/login", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    theme: document.documentElement.getAttribute("data-theme"),
    hasLoginForm: !!document.querySelector(".login"),
    inputs: [...document.querySelectorAll("input")].map(i => i.type || i.name).join(", "),
    submitButton: !!document.querySelector('button[type="submit"]'),
    bodySnippet: document.body?.innerHTML?.substring(0, 500) || "",
  }));

  console.log("URL:", state.url);
  console.log("Title:", state.title);
  console.log("Theme:", state.theme);
  console.log("Has login form:", state.hasLoginForm);
  console.log("Inputs:", state.inputs);
  console.log("Submit button:", state.submitButton);

  if (state.hasLoginForm && state.inputs.includes("email")) {
    console.log("\nLOGIN PAGE IS WORKING. Try logging in with:");
    console.log("  Email:    jpgyap@gmail.com");
    console.log("  Password: DaVinciOS");
  } else {
    console.log("\nUnexpected state. Body:", state.bodySnippet);
  }

  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
