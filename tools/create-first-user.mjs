import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  await page.goto("https://admin.homeatelier.ph/admin/create-first-user", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Inspect the form
  const formInfo = await page.evaluate(() => {
    const form = document.querySelector("form");
    const inputs = [...document.querySelectorAll("input")].map(i => ({
      name: i.name || i.id,
      type: i.type,
      placeholder: i.placeholder || "",
      value: i.value,
      required: i.required,
    }));
    const buttons = [...document.querySelectorAll("button")].map(b => ({
      text: b.textContent.trim(),
      type: b.type,
    }));
    return {
      formAction: form?.action || "N/A",
      formMethod: form?.method || "N/A",
      inputs,
      buttons,
    };
  });

  console.log("Form action:", formInfo.formAction);
  console.log("Form method:", formInfo.formMethod);
  console.log("\nInputs:");
  formInfo.inputs.forEach(i => console.log("  -", i.name, "(" + i.type + ")", i.required ? "required" : "optional"));
  console.log("\nButtons:");
  formInfo.buttons.forEach(b => console.log("  -", b.text, "type=" + b.type));

  console.log("\nErrors:", errors.length);
  errors.forEach(e => console.log("  ", e.substring(0, 200)));

  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
