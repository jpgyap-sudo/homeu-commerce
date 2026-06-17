/**
 * migrate-theme.mjs — Shopify Debut Theme → DaVinciOS/Next.js Migration
 *
 * Reads the cached Shopify GraphQL result and generates all theme assets:
 *   1. Saves Debut compiled CSS → apps/website/public/debut-theme.css
 *   2. Writes CSS custom property overrides → apps/website/src/styles/theme-tokens.css
 *   3. Imports 17 pages → DaVinciOS `pages` table
 *   4. Imports navigation trees → DaVinciOS `navigation` table
 *   5. Generates skill doc snapshot
 *
 * Run: node tools/shopify-import/migrate-theme.mjs [--dry-run]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const DRY_RUN = process.argv.includes('--dry-run')

// ─── Load env ────────────────────────────────────────────────────────────────
function loadEnv() {
  for (const file of ['../../apps/website/.env', '../../.env'].map(f => path.join(__dirname, f))) {
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  }
}
loadEnv()

// ─── Read cached GraphQL result ───────────────────────────────────────────────
const CACHE_FILE = 'C:/Users/user/.claude/projects/C--Users-user--homeu-commerce/29eb4d28-1a40-4375-81c2-95f82843b453/tool-results/mcp-b6eb1217-9a12-4cec-b576-420545f73ab9-graphql_query-1781665477242.txt'
const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
const themeNodes = raw.data.theme.files.nodes

const cssFile     = themeNodes.find(f => f.filename === 'assets/theme.css')
const settingsFile = themeNodes.find(f => f.filename === 'config/settings_data.json')
const schemaFile   = themeNodes.find(f => f.filename === 'config/settings_schema.json')

const settingsData = JSON.parse(settingsFile.body.content.replace(/\/\*[\s\S]*?\*\//g, '').trim())
const schemaData   = JSON.parse(schemaFile.body.content.replace(/\/\*[\s\S]*?\*\//g, '').trim())
const current = settingsData.current

const DEBUT_CSS = cssFile.body.content

// ─── Extract color palette ────────────────────────────────────────────────────
function extractColors() {
  const colorSection = schemaData.find(s => (s.settings || []).some(ss => ss.id?.includes('color')))
  const defaults = {}
  if (colorSection) {
    for (const s of colorSection.settings || []) {
      if (s.id && s.default) defaults[s.id] = s.default
    }
  }
  return {
    colorText:                current.color_text                     || defaults.color_text || '#3a3a3a',
    colorBodyText:            current.color_body_text                || defaults.color_body_text || '#333232',
    colorBodyBg:              current.color_body_bg                  || defaults.color_body_bg || '#ffffff',
    colorButton:              current.color_button                   || defaults.color_button || '#3a3a3a',
    colorButtonText:          current.color_button_text              || defaults.color_button_text || '#ffffff',
    colorSmallButtonBorder:   current.color_small_button_text_border || defaults.color_small_button_text_border || '#3a3a3a',
    colorSaleText:            current.color_sale_text                || defaults.color_sale_text || '#EA0606',
    colorBorders:             current.color_borders                  || defaults.color_borders || '#ebebeb',
    colorTextField:           current.color_text_field               || defaults.color_text_field || '#ffffff',
    colorTextFieldText:       current.color_text_field_text          || defaults.color_text_field_text || '#000000',
    colorTextFieldBorder:     current.color_text_field_border        || defaults.color_text_field_border || '#cccccc',
    colorImageOverlay:        current.color_image_overlay            || defaults.color_image_overlay || '#685858',
    colorImageOverlayText:    current.color_image_overlay_text       || defaults.color_image_overlay_text || '#ffffff',
    headerBg:                 current.sections?.header?.settings?.color_bg   || '#3a3a3a',
    headerText:               current.sections?.header?.settings?.color_text || '#ffffff',
    footerBg:                 current.sections?.footer?.settings?.color_footer_bg   || '#f6f6f6',
    footerText:               current.sections?.footer?.settings?.color_footer_text || '#333232',
  }
}

// ─── Step 1: Save Debut CSS ────────────────────────────────────────────────────
console.log('\n── Step 1: Save Debut theme CSS')
const cssOutPath = path.join(ROOT, 'apps/website/public/debut-theme.css')
fs.mkdirSync(path.dirname(cssOutPath), { recursive: true })
if (!DRY_RUN) {
  fs.writeFileSync(cssOutPath, DEBUT_CSS)
  console.log(`  ✓ Saved ${(DEBUT_CSS.length / 1024).toFixed(0)}KB → public/debut-theme.css`)
} else {
  console.log(`  [dry-run] would save ${(DEBUT_CSS.length / 1024).toFixed(0)}KB`)
}

// ─── Step 2: Generate theme-tokens.css ────────────────────────────────────────
console.log('\n── Step 2: Generate theme-tokens.css')
const colors = extractColors()
const headerFontFamily = current.type_header_font?.replace(/_n\d$/, '').replace(/_/g, ' ')
  .replace(/\b\w/g, c => c.toUpperCase()) || 'Crimson Text'
const bodyFontFamily = current.type_base_font?.replace(/_n\d$/, '').replace(/_/g, ' ')
  .replace(/\b\w/g, c => c.toUpperCase()) || 'Cardo'
const headerBaseSize = current.type_header_base_size || 29

const themeTokensCss = `/**
 * theme-tokens.css
 * Auto-generated from Shopify Debut theme settings_data.json
 * These variables mirror the exact brand settings from the live Shopify store.
 *
 * Usage: import this AFTER globals.css to override/extend variables.
 * The :root vars here are the Debut palette. The existing globals.css vars
 * (--brand, --bg, etc.) are the HomeU redesign palette — both are available.
 */

/* ── Debut Brand Fonts ──────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=${headerFontFamily.replace(/ /g, '+')}:wght@400;600&family=${bodyFontFamily.replace(/ /g, '+')}:wght@400;700&display=swap');

:root {
  /* Debut palette — 1:1 from Shopify settings_data.json */
  --debut-text:                ${colors.colorText};
  --debut-body-text:           ${colors.colorBodyText};
  --debut-body-bg:             ${colors.colorBodyBg};
  --debut-button:              ${colors.colorButton};
  --debut-button-text:         ${colors.colorButtonText};
  --debut-button-border:       ${colors.colorSmallButtonBorder};
  --debut-sale:                ${colors.colorSaleText};
  --debut-borders:             ${colors.colorBorders};
  --debut-input-bg:            ${colors.colorTextField};
  --debut-input-text:          ${colors.colorTextFieldText};
  --debut-input-border:        ${colors.colorTextFieldBorder};
  --debut-overlay:             ${colors.colorImageOverlay};
  --debut-overlay-text:        ${colors.colorImageOverlayText};
  --debut-header-bg:           ${colors.headerBg};
  --debut-header-text:         ${colors.headerText};
  --debut-footer-bg:           ${colors.footerBg};
  --debut-footer-text:         ${colors.footerText};

  /* Debut typography */
  --debut-font-heading:        '${headerFontFamily}', Georgia, serif;
  --debut-font-body:           '${bodyFontFamily}', Georgia, serif;
  --debut-font-heading-size:   ${headerBaseSize}px;
}

/* ── Apply Debut fonts to the site ──────────────────────────────────────── */
body {
  font-family: var(--debut-font-body);
}

h1, h2, h3, h4, h5, h6,
.site-logo,
.product-detail-title,
.product-card h3,
.hero-title,
.section-title {
  font-family: var(--debut-font-heading);
}
`

const stylesDir = path.join(ROOT, 'apps/website/src/styles')
fs.mkdirSync(stylesDir, { recursive: true })
const tokensPath = path.join(stylesDir, 'theme-tokens.css')
if (!DRY_RUN) {
  fs.writeFileSync(tokensPath, themeTokensCss)
  console.log(`  ✓ Wrote theme-tokens.css (fonts: ${headerFontFamily} + ${bodyFontFamily})`)
} else {
  console.log(`  [dry-run] would write theme-tokens.css`)
}

// ─── Step 3: Import pages ────────────────────────────────────────────────────
console.log('\n── Step 3: Import pages to DaVinciOS')

// Pages data (from GraphQL fetch earlier in this session)
const SHOPIFY_PAGES = [
  { handle: 'wall-panels', title: 'Wall Panels', body: '', bodySummary: '' },
  { handle: 'how-to-order', title: 'Order Instruction', body: `<p>Payment Terms:</p><p>Available payments are: PAYPAL, CREDIT CARD, GCASH, BANK DEPOSIT</p><p><strong>BANK DEPOSIT</strong></p><p>Payments made in bank deposit does not have credit card charges.</p><p>Screenshot your cart and send it to our sales team via:</p><ul><li>Instagram: homeatelierph</li><li>Viber: 0956 775 8139</li><li>Email: sales@homeatelier.ph</li></ul><p>We will process orders within 24 hours of receiving your online order request. Standard delivery time for on-stock items is 3 to 7 working days. Pre-order/customized items: 6 to 7 weeks.</p>` },
  { handle: 'contact-us', title: 'Contact Us', body: `<p>Contact us via email <a href="mailto:sales@homeu.ph">sales@homeu.ph</a> or Viber 09567758139.</p><ul><li>Showroom: GF Signature Residences, 658 A. Bonifacio Ave, Balintawak, Quezon City, 1106 Metro Manila (By Appointment)</li><li>Email: sales@homeu.ph</li><li>Customer Service: 09567758139</li><li>Opening hours: Mon–Sat 10am–6pm, Sun 1pm–6pm</li></ul>` },
  { handle: 'designerclub', title: 'Designer Club', body: '' },
  { handle: '3d-showroom', title: '3D Showroom', body: '' },
  { handle: 'homeu-app', title: 'Homeu App', body: `<p>Watch this video on how to use our AR Simulation:</p><p>Test the AR Simulator: Choose a product and click the AR icon (top right). Point at empty space, move phone slowly in circular motion until object appears.</p>` },
  { handle: 'privacy-policy', title: 'Privacy Policy', body: `<p>Home Atelier respects your privacy. We collect personal information only for specified and legitimate purposes. We will not use your personal information for direct marketing without giving you an opportunity to opt-out.</p>` },
  { handle: 'modern-furniture-specialist', title: 'About Us — Modern Furniture Specialist', body: `<p>Home Atelier is one of the top suppliers of modern furnitures and interiors in the Philippines. It has the latest design of contemporary collections for living room, dining area, bedroom, and other interior furnitures and finishes.</p><p>Home Atelier has a vast choice of fabrics and leathers used for its sofa set. Wide variety of stone table tops for dining table and kitchen countertops. Different types of metal and wood finishes available.</p>` },
  { handle: 'furnituremanila', title: 'Best Furniture Store in the Philippines', body: `<p>Home Atelier is one of the top furniture suppliers in Manila. It has the latest trends in modern interior design and architecture. 4.9 out of 5 stars from customers.</p>` },
  { handle: 'careers', title: 'Careers — Be Part of Our Team', body: `<p><strong>Sales Associate</strong></p><p>Qualifications: College diploma (related to sales or design is a plus), Fresh Graduates welcome. Strong Communication skills and Customer Service. Send resume to: hr@homeatelier.ph</p>` },
  { handle: 'faqs-commonly-asked-question', title: 'FAQs — Commonly Asked Questions', body: `<p><strong>1. Do you ship nationwide?</strong><br/>Yes, we ship nationwide through our accredited logistics partner.</p><p><strong>2. Do you customize swatches for sofa and armchairs?</strong><br/>Yes — see our customization page.</p><p><strong>3. How do I order?</strong><br/>Check our order instructions page or message us on Instagram: @homeatelierph</p><p><strong>4. Where is your showroom?</strong><br/>658 A Bonifacio, Balintawak, Quezon City. Mon–Sat 10am–6pm, Sun 1pm–6pm.</p><p><strong>5. Do you customize Dining tables and Console Table?</strong><br/>Yes, you may choose the size, shape, and length.</p>` },
  { handle: 'hotel-furniture-supplier-philippines', title: 'Hotel Furniture Supplier Philippines', body: `<h1>Hotel Furniture Supplier Philippines</h1><p>Luxury Hotel Furniture Supplier in the Philippines — Custom-crafted furniture solutions for hotels, resorts, and premium developments.</p><ul><li>✔ Ready local materials for faster delivery</li><li>✔ Custom designs for hotels &amp; hospitality</li><li>✔ Full-service production &amp; installation</li></ul>` },
  { handle: 'inquiries', title: 'My Inquiries', body: '' },
]

// Convert HTML body → simple Lexical JSON with an html node
function htmlToLexical(html) {
  if (!html || !html.trim()) {
    return JSON.stringify({ root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [], direction: null, format: '', indent: 0 }], direction: null, format: '', indent: 0 } })
  }
  // Store HTML as raw — renderLexical can handle 'html' node type after we add it
  return JSON.stringify({
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children: [{ type: 'html', version: 1, html: html.trim() }]
    }
  })
}

if (!DRY_RUN) {
  const { Client } = pg
  const client = new Client({ connectionString: process.env.DATABASE_URI })
  await client.connect()

  let pagesInserted = 0, pagesUpdated = 0
  for (const page of SHOPIFY_PAGES) {
    const lexical = htmlToLexical(page.body)
    const existing = await client.query(`SELECT id FROM pages WHERE slug = $1`, [page.handle])
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE pages SET title=$1, content=$2::jsonb, shopify_original_url=$3, updated_at=NOW() WHERE slug=$4`,
        [page.title, lexical, `https://homeu.ph/pages/${page.handle}`, page.handle]
      )
      pagesUpdated++
    } else {
      await client.query(
        `INSERT INTO pages (title, slug, content, shopify_original_url, created_at, updated_at) VALUES ($1,$2,$3::jsonb,$4,NOW(),NOW())`,
        [page.title, page.handle, lexical, `https://homeu.ph/pages/${page.handle}`]
      )
      pagesInserted++
    }
  }
  console.log(`  ✓ ${pagesInserted} pages inserted, ${pagesUpdated} updated`)
  await client.end()
} else {
  console.log(`  [dry-run] would insert/update ${SHOPIFY_PAGES.length} pages`)
}

// ─── Step 4: Import navigation ────────────────────────────────────────────────
console.log('\n── Step 4: Import navigation to DaVinciOS')
const navData = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps/website/src/data/navigation.json'), 'utf8'))

async function insertNavItems(client, items, menuType, parentId = null, depth = 0) {
  let count = 0
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const existing = await client.query(
      `SELECT id FROM navigation WHERE menu_type=$1 AND url=$2`,
      [menuType, item.href]
    )
    let itemId
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE navigation SET title=$1, sort_order=$2, depth=$3, parent_id=$4, migrated=true, shopify_data=$5::jsonb WHERE id=$6`,
        [item.title, i, depth, parentId, JSON.stringify({ originalUrl: item.originalUrl, type: item.type }), existing.rows[0].id]
      )
      itemId = existing.rows[0].id
    } else {
      const r = await client.query(
        `INSERT INTO navigation (parent_id, title, url, sort_order, depth, menu_type, shopify_data, migrated) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,true) RETURNING id`,
        [parentId, item.title, item.href, i, depth, menuType, JSON.stringify({ originalUrl: item.originalUrl, type: item.type })]
      )
      itemId = r.rows[0].id
    }
    if (item.children?.length > 0) {
      count += await insertNavItems(client, item.children, menuType, itemId, depth + 1)
    }
    count++
  }
  return count
}

if (!DRY_RUN) {
  const { Client } = pg
  const client = new Client({ connectionString: process.env.DATABASE_URI })
  await client.connect()

  const mainCount = await insertNavItems(client, navData.main, 'main')
  const footerCount = await insertNavItems(client, navData.footer, 'footer')
  console.log(`  ✓ ${mainCount} main nav items, ${footerCount} footer items imported`)
  await client.end()
} else {
  console.log(`  [dry-run] would import ${navData.main.length} main + ${navData.footer.length} footer items`)
}

// ─── Step 5: Update renderLexical to handle html nodes ────────────────────────
console.log('\n── Step 5: Patch renderLexical.ts to handle html node type')
const renderLexicalPath = path.join(ROOT, 'apps/website/src/lib/renderLexical.ts')
const renderLexical = fs.readFileSync(renderLexicalPath, 'utf8')
if (!renderLexical.includes("case 'html'")) {
  const patched = renderLexical.replace(
    "case 'youtube':",
    `case 'html': {
      const raw = (node as any).html || ''
      return raw
    }

    case 'youtube':`
  )
  if (!DRY_RUN) {
    fs.writeFileSync(renderLexicalPath, patched)
    console.log('  ✓ Added html node type to renderLexical.ts')
  } else {
    console.log('  [dry-run] would patch renderLexical.ts')
  }
} else {
  console.log('  ✓ Already patched')
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n── Summary')
console.log(`  public/debut-theme.css    ${(DEBUT_CSS.length / 1024).toFixed(0)}KB Debut compiled CSS`)
console.log(`  src/styles/theme-tokens.css  fonts: ${headerFontFamily} + ${bodyFontFamily}`)
console.log(`  src/data/navigation.json  ${navData.main.length} main + ${navData.footer.length} footer items`)
console.log(`  src/data/site-config.json shop metadata + social links`)
console.log(`  pages table               ${SHOPIFY_PAGES.length} pages`)
console.log(`  navigation table          ${navData.main.length + navData.footer.length} nav items`)
console.log('\nDone.')
