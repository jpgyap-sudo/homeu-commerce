#!/usr/bin/env node

/**
 * admin.homeu.ph Diagnostic Check
 * 
 * Crawls admin.homeu.ph with Playwright to diagnose why it might appear blank.
 * - Checks redirect chain
 * - Takes screenshots at each step
 * - Captures console errors, network failures, and page content
 * - Analyzes the HTML structure
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, 'output', 'admin-check');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const ADMIN_URL = 'https://admin.homeu.ph';

function writeReport(data) {
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'report.json'),
    JSON.stringify(data, null, 2)
  );
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].trim() : 'N/A';
}

async function main() {
  console.log('='.repeat(70));
  console.log('  admin.homeu.ph Diagnostic Check');
  console.log('='.repeat(70));
  console.log(`  Target: ${ADMIN_URL}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', msg => {
    const entry = { type: msg.type(), text: msg.text() };
    if (msg.type() === 'error') {
      consoleErrors.push(entry);
    } else {
      consoleLogs.push(entry);
    }
  });

  page.on('requestfailed', request => {
    networkFailures.push({
      url: request.url(),
      failure: request.failure()?.errorText || 'unknown',
      method: request.method(),
      resourceType: request.resourceType(),
    });
  });

  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      networkFailures.push({
        url: response.url(),
        status,
        statusText: response.statusText(),
        method: response.request().method(),
        resourceType: response.request().resourceType(),
      });
    }
  });

  const report = {
    target: ADMIN_URL,
    timestamp: new Date().toISOString(),
    phases: [],
    summary: {},
  };

  try {
    // =====================
    // PHASE 1: Initial request (root /)
    // =====================
    console.log('📡 Phase 1: Loading admin.homeu.ph (root /) ...');
    
    const startTime = Date.now();
    const resp = await page.goto(ADMIN_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    const loadTime = Date.now() - startTime;
    
    await new Promise(r => setTimeout(r, 3000));

    const finalUrl = page.url();
    
    // Get redirect chain
    const redirectChain = [];
    if (resp) {
      redirectChain.push({ url: resp.url(), status: resp.status() });
      for (const r of resp.request().redirectedFrom?.allRedirectedRequests?.() || []) {
        // Just use the response chain
      }
      // Simple approach: just collect from response
      let cur = resp;
      while (cur) {
        redirectChain.unshift({ url: cur.url(), status: cur.status() });
        try { cur = cur.request().redirectedFrom?.response(); } catch { break; }
      }
    }

    // Take screenshot
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '01-initial-load.png'),
      fullPage: true,
    });

    let html = '';
    try { html = await page.content(); } catch {}
    
    const title = await page.title().catch(() => 'N/A');
    console.log(`  Final URL: ${finalUrl}`);
    console.log(`  Load time: ${loadTime}ms`);
    console.log(`  Title: ${title}`);
    console.log(`  HTML size: ${(html.length / 1024).toFixed(1)}KB`);

    const phase1 = {
      phase: 'root-redirect',
      url: ADMIN_URL,
      finalUrl,
      loadTime,
      title,
      htmlLength: html.length,
      htmlPreview: html.substring(0, 8000),
    };
    report.phases.push(phase1);
    fs.writeFileSync(path.join(OUTPUT_DIR, '01-initial.html'), html);

    // =====================
    // Phase 2: Wait for JS rendering
    // =====================
    console.log('\n⏳ Phase 2: Waiting 8s for JS rendering...');
    await new Promise(r => setTimeout(r, 8000));

    let htmlAfterJS = '';
    try { htmlAfterJS = await page.content(); } catch {}

    await page.screenshot({
      path: path.join(OUTPUT_DIR, '02-after-js-render.png'),
      fullPage: true,
    });

    const title2 = await page.title().catch(() => 'N/A');
    console.log(`  Title: ${title2}`);
    console.log(`  HTML size: ${(htmlAfterJS.length / 1024).toFixed(1)}KB`);

    const phase2 = {
      phase: 'after-js-render',
      url: page.url(),
      title: title2,
      htmlLength: htmlAfterJS.length,
      htmlPreview: htmlAfterJS.substring(0, 8000),
    };
    report.phases.push(phase2);
    fs.writeFileSync(path.join(OUTPUT_DIR, '02-after-js.html'), htmlAfterJS);

    // =====================
    // Phase 3: Direct /admin
    // =====================
    console.log('\n🔗 Phase 3: Navigating directly to /admin ...');
    
    await page.goto(`${ADMIN_URL}/admin`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise(r => setTimeout(r, 5000));

    await page.screenshot({
      path: path.join(OUTPUT_DIR, '03-admin-direct.png'),
      fullPage: true,
    });

    let adminHtml = '';
    try { adminHtml = await page.content(); } catch {}

    const title3 = await page.title().catch(() => 'N/A');
    console.log(`  Final URL: ${page.url()}`);
    console.log(`  Title: ${title3}`);
    console.log(`  HTML size: ${(adminHtml.length / 1024).toFixed(1)}KB`);

    const phase3 = {
      phase: 'direct-admin',
      url: page.url(),
      title: title3,
      htmlLength: adminHtml.length,
      htmlPreview: adminHtml.substring(0, 8000),
    };
    report.phases.push(phase3);
    fs.writeFileSync(path.join(OUTPUT_DIR, '03-admin.html'), adminHtml);

    // =====================
    // Phase 4: API probing
    // =====================
    console.log('\n🔍 Phase 4: Probing API endpoints...');
    
    const apiTests = [];
    const endpoints = [
      `${ADMIN_URL}/api/graphql`,
      `${ADMIN_URL}/api`,
      `${ADMIN_URL}/admin/login`,
      `${ADMIN_URL}/admin/api`,
    ];

    for (const endpoint of endpoints) {
      try {
        const apiresp = await page.request.get(endpoint, { timeout: 10000 });
        const body = await apiresp.text();
        apiTests.push({
          endpoint,
          status: apiresp.status(),
          statusText: apiresp.statusText(),
          contentType: apiresp.headers()['content-type'] || 'N/A',
          bodyLength: body.length,
          bodyPreview: body.substring(0, 500),
        });
        console.log(`  ${endpoint} → ${apiresp.status()} ${apiresp.statusText()} (${(body.length / 1024).toFixed(1)}KB)`);
      } catch (err) {
        apiTests.push({ endpoint, error: err.message });
        console.log(`  ${endpoint} → ERROR: ${err.message}`);
      }
    }
    report.apiTests = apiTests;

    // =====================
    // Phase 5: store.homeu.ph comparison
    // =====================
    console.log('\n🏪 Phase 5: Checking store.homeu.ph for comparison...');
    try {
      const storeResp = await page.request.get('https://store.homeu.ph', { timeout: 15000 });
      const storeHtml = await storeResp.text();
      const storeTitle = extractTitle(storeHtml);
      
      console.log(`  store.homeu.ph → ${storeResp.status()}`);
      console.log(`  HTML size: ${(storeHtml.length / 1024).toFixed(1)}KB`);
      console.log(`  Title: ${storeTitle}`);

      const mentionsDaVincios = /DaVinciOS|davincios/i.test(storeHtml);
      const mentionsAdmin = /\/admin/i.test(storeHtml);
      console.log(`  Mentions DaVinciOS: ${mentionsDaVincios}`);
      console.log(`  Mentions /admin: ${mentionsAdmin}`);

      report.storeComparison = {
        url: 'https://store.homeu.ph',
        status: storeResp.status(),
        htmlLength: storeHtml.length,
        title: storeTitle,
        mentionsDaVincios,
        mentionsAdmin,
        htmlPreview: storeHtml.substring(0, 3000),
      };
    } catch (err) {
      console.log(`  store.homeu.ph → ERROR: ${err.message}`);
      report.storeComparison = { error: err.message };
    }

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    report.fatalError = err.message;
  }

  // =====================
  // ANALYSIS
  // =====================
  const allHtml = report.phases.map(p => p.htmlPreview || '').join(' ');
  
  const hasLoginForm = /login|sign.?in/i.test(allHtml) && /form/i.test(allHtml);
  const hasBlankBody = /<body>\s*<\/body>/i.test(allHtml);
  const hasError = /error|failed|cannot|not found|404|internal server/i.test(allHtml);
  const hasNextData = /__NEXT_DATA__/i.test(allHtml);
  const hasDaVinciOS = /DaVinciOS|davincios/i.test(allHtml);
  const hasPayload = /payload|cms/i.test(allHtml);
  const hasWebpack = /webpack/i.test(allHtml);

  // Check if admin loads properly
  const phase3Html = (report.phases.find(p => p.phase === 'direct-admin')?.htmlPreview) || '';
  const adminHasContent = phase3Html.length > 500 && !/error|not found/i.test(phase3Html) && !phase3Html.includes('<body></body>');

  report.summary = {
    consoleErrors: consoleErrors.length,
    consoleLogs: consoleLogs.length,
    networkFailures: networkFailures.length,
    uniqueFailureUrls: [...new Set(networkFailures.map(f => f.url))],
  };

  report.consoleErrors = consoleErrors.slice(0, 50);
  report.networkFailures = [...new Map(
    networkFailures.map(f => [f.url, f])
  ).values()].slice(0, 50);

  report.analysis = {
    hasLoginForm,
    hasBlankBody,
    hasError,
    hasNextData,
    hasDaVinciOS,
    hasPayload,
    hasWebpack,
    adminHasContent,
    consoleErrorCount: consoleErrors.length,
    networkFailureCount: networkFailures.length,
  };

  writeReport(report);

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Console errors:   ${report.summary.consoleErrors}`);
  console.log(`  Network failures: ${report.summary.networkFailures}`);
  console.log(`  Total requests:   ${report.phases.length > 0 ? 'captured' : '0'}`);

  if (report.summary.uniqueFailureUrls?.length > 0) {
    console.log('\n❌ Failed URLs:');
    for (const url of report.summary.uniqueFailureUrls.slice(0, 20)) {
      console.log(`   - ${url}`);
    }
  }

  if (consoleErrors.length > 0) {
    console.log('\n⚠️  Console Errors (first 10):');
    for (const err of consoleErrors.slice(0, 10)) {
      console.log(`   ${err.text.substring(0, 200)}`);
    }
  }

  console.log('\n🔍 PAGE ANALYSIS:');
  console.log(`  Has login form:     ${hasLoginForm ? '✅ Yes' : '❌ No'}`);
  console.log(`  Body is blank:      ${hasBlankBody ? '⚠️  Yes' : '✅ No'}`);
  console.log(`  Has errors:         ${hasError ? '⚠️  Yes' : '✅ No'}`);
  console.log(`  Has Next.js data:   ${hasNextData ? '✅ Yes' : '❌ No'}`);
  console.log(`  Has DaVinciOS:      ${hasDaVinciOS ? '✅ Yes' : '❌ No'}`);
  console.log(`  Admin has content:  ${adminHasContent ? '✅ Yes' : '❌ No'}`);

  // Previews
  for (const p of report.phases) {
    const preview = p.htmlPreview?.substring(0, 600) || '(empty)';
    console.log(`\n── Phase: ${p.phase} (${p.title || 'N/A'}) ──`);
    console.log(preview.substring(0, 500));
  }

  // Final verdict
  console.log('\n' + '='.repeat(70));
  if (adminHasContent && hasDaVinciOS) {
    console.log('✅ VERDICT: DaVinciOS admin panel is loading correctly');
  } else if (adminHasContent && hasLoginForm) {
    console.log('✅ VERDICT: Admin login page appears to be working');
  } else if (hasBlankBody) {
    console.log('🟡 VERDICT: Page appears BLANK (body is empty)');
  } else if (hasNextData && !hasDaVinciOS) {
    console.log('🔴 VERDICT: Next.js is running but DaVinciOS admin is not mounting');
  } else if (hasError) {
    console.log('🔴 VERDICT: Page is showing an ERROR');
  } else if (hasNextData) {
    console.log('✅ VERDICT: Next.js is rendering but admin content may be stripped');
  } else {
    console.log('⚪ VERDICT: Check screenshots for visual confirmation');
  }
  console.log('='.repeat(70));
  console.log(`\n📁 Full report: ${OUTPUT_DIR}\\report.json`);
  console.log(`📷 Screenshots: ${OUTPUT_DIR}\\*.png`);

  await browser.close();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
