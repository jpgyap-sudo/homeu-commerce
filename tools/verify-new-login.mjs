import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  await page.goto("https://admin.homeatelier.ph/admin/login", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      url: location.href,
      title: document.title,
      shell: !!document.querySelector(".admin-login-shell"),
      brandPanel: !!document.querySelector(".admin-login-brand-panel"),
      brandLogo: !!document.querySelector(".admin-login-daVinci-logo"),
      brandMessage: document.querySelector(".admin-login-brand-message h2")?.textContent || "",
      formPanel: !!document.querySelector(".admin-login-form-panel"),
      card: !!document.querySelector(".admin-login-card"),
      inputTypes: [...document.querySelectorAll("input")].map(i => i.type || i.name).join(", "),
      hasPasswordToggle: !!document.querySelector(".admin-login-password-toggle"),
      forgotLink: !!document.querySelector(".admin-login-forgot-link"),
      submitBtn: document.querySelector(".admin-login-submit")?.textContent?.trim() || "",
      errorAlert: !!document.querySelector(".admin-login-error"),
    };
  });

  console.log("\n=== NEW LOGIN PAGE VERIFICATION ===");
  for (const [k, v] of Object.entries(state)) {
    console.log(`  ${k}: ${JSON.stringify(v)}`);
  }

  const checks = [
    ["Two-column layout", state.shell && state.brandPanel && state.formPanel],
    ["DaVinciOS logo", state.brandLogo],
    ["Brand message", state.brandMessage.length > 0],
    ["Login card", state.card],
    ["Email input", state.inputTypes.includes("email")],
    ["Password input", state.inputTypes.includes("password")],
    ["Password toggle button", state.hasPasswordToggle],
    ["Forgot password link", state.forgotLink],
    ["Submit button", state.submitBtn.length > 0],
  ];

  console.log("\n--- Checks ---");
  const passed = checks.filter(([, v]) => v).length;
  checks.forEach(([name, ok]) => console.log(`  ${ok ? "PASS" : "FAIL"}: ${name}`));
  console.log(`\n${passed}/${checks.length} checks passed`);

  await page.screenshot({ path: "/tmp/new-login-design.png", fullPage: true });
  console.log("Screenshot saved to /tmp/new-login-design.png");
  await browser.close();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
