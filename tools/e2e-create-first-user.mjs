import { chromium } from "playwright";

async function main() {
  console.log("admin.homeatelier.ph — Create First User Check");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  await page.goto("https://admin.homeatelier.ph/admin/create-first-user", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    theme: document.documentElement.getAttribute("data-theme"),
    hasHomeU: document.documentElement.innerHTML.includes("--homeu-"),
    inputs: [...document.querySelectorAll("input")].map(i => i.type || i.name).join(", "),
    buttons: [...document.querySelectorAll("button")].map(b => b.textContent.trim()).join(", "),
    bodyPreview: document.body?.innerHTML?.substring(0, 500) || "",
  }));

  console.log("\nResults:");
  for (const [k, v] of Object.entries(state)) console.log(`  ${k}: ${v}`);

  if (state.inputs.length > 0) {
    console.log("\nREGISTRATION FORM IS WORKING — create your first admin user");
  }
  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
