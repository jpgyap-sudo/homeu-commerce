import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  // Capture all responses
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      console.log("ERROR:", resp.status(), resp.url());
    }
  });
  page.on("pageerror", (e) => console.log("PAGE_ERROR:", e.message));

  const urls = [
    "https://admin.homeatelier.ph/admin/login",
    "https://store.homeatelier.ph/",
    "https://admin.homeu.ph/admin/login",
    "https://store.homeu.ph/",
  ];

  for (const url of urls) {
    console.log("\n=== Testing:", url, "===");
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      console.log("Status:", resp?.status());
      console.log("Final URL:", page.url());
      const title = await page.title();
      console.log("Title:", title);
      const text = await page.evaluate(() => document.body?.innerText?.substring(0, 300) || "EMPTY BODY");
      console.log("Body text:", text);
    } catch (e) {
      console.log("Error:", e.message.substring(0, 100));
    }
  }

  await browser.close();
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
