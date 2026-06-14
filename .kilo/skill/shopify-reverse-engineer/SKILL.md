# Shopify Reverse Engineer Skill

Reverse engineer the live HomeU Shopify store at **www.homeu.ph** and generate complete migration data for the Payload CMS + Next.js storefront.

## Tools Available

| Tool | Purpose |
|------|---------|
| `tools/playwright-scanner/scan.mjs` | Playwright + Chromium site crawler with screenshots |
| `tools/playwright-scanner/ollama-vision.mjs` | 🧠 Ollama vision analysis (llava:7b) |
| `tools/shopify-import/parser.mjs` | Shopify CSV/theme/image export parser |
| `tools/shopify-import/import-payload.mjs` | Payload CMS import validator |
| `tools/crawler/` | Basic URL crawler |
| `tools/url-mapper/` | 301 redirect URL mapper |

## Ollama Vision Models (Local)

| Model | Size | Purpose |
|-------|------|---------|
| `llava:7b` | 4.7 GB | ✅ Primary vision model for screenshot analysis |
| `moondream:latest` | 1.7 GB | Lighter alternative for quick scans |

## Site Profile

| Property | Value |
|----------|-------|
| Live site | https://www.homeu.ph |
| Shopify store ID | 0559/7377/3476 |
| Total products | ~661 (across 21 pages) |
| Collections | 30+ categories |
| Navigation | Multi-level mega menu |
| Reviews | Judge.me integration |
| Tracking | Facebook Pixel (IDs: 722065817172199, 1353745891687218) |
| Payment | PayPal only |
| Languages | English, Korean, Italian |
| Images | Shopify CDN (cdn.shopify.com) |
| Pages | About, FAQ, Contact, Designer Club, 3D Showroom, Careers, Order Instructions, Moodboard, Reviews |
| Blog | Design Trends |
| Special | 3D Model downloads, Custom swatches, Made-to-order |
| Social | Facebook, Pinterest, Instagram, YouTube |

## Phase 1: Playwright Scan

### 1A. Run Playwright Scanner
```bash
# Install dependencies first
cd tools/playwright-scanner
npm install

# Full scan with screenshots + Ollama vision
node scan.mjs --screenshots --ollama --delay 1000

# Fast scan (no screenshots, just data)
node scan.mjs --no-screenshots --delay 200

# Scan with page limit
node scan.mjs --max-pages 200 --delay 500
```

The scanner will:
- Launch Chromium via Playwright
- BFS crawl starting from https://www.homeu.ph
- Discover all internal URLs
- Extract SEO metadata from every page
- Screenshot every page (full-page)
- Analyze screenshots with llava:7b (if --ollama flag)
- Save raw HTML of every page
- Detect broken links

### 1B. Output from Scanner
```
tools/playwright-scanner/output/
├── data/
│   ├── scan-summary.json        # Overall results
│   ├── all-pages.json           # All pages with SEO + images
│   ├── products.json            # Only product pages
│   ├── collections.json         # Only collection pages
│   ├── seo-metadata.json        # All SEO data
│   ├── all-images.json          # Image URLs from Shopify CDN
│   └── broken-links.json        # 404s and errors
├── screenshots/
│   ├── www.homeu.ph_products_*.png
│   ├── www.homeu.ph_products_*.analysis.txt  (Ollama output)
│   └── ...
└── raw/
    └── *.html                    # Raw page HTML
```

### 1C. Visual Analysis with Ollama
```bash
# Analyze a single screenshot
node ollama-vision.mjs analyze output/screenshots/www.homeu.ph_products_aalto-modern-sofa.png

# Batch analyze all screenshots
node ollama-vision.mjs batch output/screenshots/

# Compare Shopify vs new site
node ollama-vision.mjs verify screenshots/old-product.png screenshots/new-product.png

# List available vision models
node ollama-vision.mjs list-models
```

## Phase 2: Shopify Export Parsing

Place your Shopify exports in:
```
tools/shopify-import/input/
├── products.csv          # Shopify product export CSV
├── theme.zip             # Shopify theme (.zip with Liquid files)
└── images/               # Product images folder
```

### 2A. Run Parser
```bash
node tools/shopify-import/parser.mjs
```

This will:
- Parse products CSV → Payload CMS format
- Extract theme info (Liquid templates, settings, assets)
- Map image filenames to product handles/slugs
- Handle common patterns:
  - `product-handle.jpg` → product
  - `SKU123.jpg` → product with matching SKU
  - `product-name-1.jpg` → product name match
- Generate images-manifest.json with matched pairs

### 2B. Cross-Reference Scanner vs Export
Compare scanner output with Shopify export to find:
- Products in CSV but not found on live site
- Products on live site but missing from export
- Image mismatches
- SEO metadata differences

## Phase 3: Data Extraction (from Scanner Output)

### 3A. Product Extraction
From scanner `data/products.json`, each product contains:
```json
{
  "url": "https://www.homeu.ph/products/aalto-modern-sofa",
  "type": "product",
  "productHandle": "aalto-modern-sofa",
  "seo": {
    "title": "Aalto │ Modern Sofa – HOMEU.PH",
    "metaDescription": "...",
    "canonical": "https://www.homeu.ph/products/aalto-modern-sofa",
    "ogTitle": "Aalto │ Modern Sofa",
    "ogDescription": "...",
    "ogImage": "https://cdn.shopify.com/...",
    "h1": "Aalto │ Modern Sofa"
  },
  "images": [
    { "src": "https://cdn.shopify.com/...", "alt": "Aalto Modern Sofa" }
  ]
}
```

### 3B. SEO Data Extraction
From `data/seo-metadata.json` — all pages' SEO preserved.

### 3C. Image Mapping
From `data/all-images.json`:
- All Shopify CDN image URLs per product
- Alt text preserved
- Organized by product handle

### 3D. Navigation Structure
From scanner-captured HTML, extract mega menu:
```json
{
  "main": [
    {
      "title": "Home",
      "url": "/",
      "children": []
    },
    {
      "title": "Quick Delivery",
      "url": "#",
      "children": [
        { "title": "Lighting", "url": "/collections/lighting-on-stock" },
        { "title": "Furniture", "url": "/collections/furniture-onsticj" }
      ]
    }
  ]
}
```

## Phase 4: Data Mapping & Generation

### 4A. Shopify → Payload CMS Mapping
Run `tools/url-mapper/` to generate 301 redirect maps.

### 4B. Generate Import Scripts
```bash
node tools/shopify-import/import-payload.mjs
```

## Phase 5: Theme Analysis

### 5A. Ollama Visual Analysis
Use `ollama-vision.mjs batch` on all screenshots to get:
- Layout descriptions per page type
- Color scheme identification
- Component structure mapping
- Mobile vs desktop differences

### 5B. Component Mapping
From theme export (theme.zip):
- `layout/theme.liquid` → Global layout
- `templates/product.liquid` → Product page structure
- `templates/collection.liquid` → Collection page structure
- `sections/*.liquid` → Reusable section components
- `config/settings_schema.json` → Theme settings/colors/fonts

### 5C. Visual Verification
```bash
# After building a new page, compare with original
node tools/playwright-scanner/ollama-vision.mjs verify \
  output/screenshots/www.homeu.ph_products_aalto-modern-sofa.png \
  ../new-site-screenshots/products-aalto-modern-sofa.png
```

## Output Directory Structure

```
tools/
├── playwright-scanner/
│   └── output/
│       ├── data/
│       ├── screenshots/
│       │   ├── *.png              (full-page screenshots)
│       │   └── *.analysis.txt     (Ollama vision analysis)
│       └── raw/                   (HTML)
├── shopify-import/
│   ├── input/
│   │   ├── products.csv           (YOU PROVIDE)
│   │   ├── theme.zip              (YOU PROVIDE)
│   │   └── images/                (YOU PROVIDE)
│   ├── output/
│   │   ├── payload-products.json
│   │   ├── payload-categories.json
│   │   ├── payload-pages.json
│   │   ├── payload-media.json
│   │   ├── navigation.json
│   │   ├── seo-metadata.csv
│   │   ├── 301-redirect-map.csv
│   │   ├── images-manifest.json
│   │   └── raw/
│   └── parser.mjs
├── theme-analyzer/
│   ├── component-map.md
│   └── theme-data.json
├── url-mapper/
│   └── README.md
└── crawler/
    └── README.md
```

## Execution Order

### Option A: Full Pipeline (Live Site + Export)
```bash
# 1. Scan live site with Playwright
cd tools/playwright-scanner
npm install
node scan.mjs --screenshots --ollama --delay 1000

# 2. Place Shopify exports in tools/shopify-import/input/
#    (products.csv, theme.zip, images/)

# 3. Parse Shopify exports
cd ../shopify-import
node parser.mjs

# 4. Cross-reference and validate
node import-payload.mjs

# 5. Visual analysis
cd ../playwright-scanner
node ollama-vision.mjs batch output/screenshots/
```

### Option B: Export-Only (No Live Site)
```bash
# 1. Place exports in tools/shopify-import/input/
# 2. Run parser
node tools/shopify-import/parser.mjs
# 3. Validate
node tools/shopify-import/import-payload.mjs
```

### Option C: Scan-Only (No Export Files)
```bash
# 1. Scan live site
cd tools/playwright-scanner
npm install
node scan.mjs --screenshots --ollama

# 2. Results in output/data/ are ready for review
```

## Validation Checklist

- [ ] Scanner discovered all 661+ products
- [ ] All product images captured from Shopify CDN
- [ ] SEO metadata extracted for every page
- [ ] URL slugs match between scanner and export
- [ ] Navigation hierarchy correctly mapped
- [ ] Screenshots captured for all page types
- [ ] Ollama analyses saved for visual reference
- [ ] Images correctly mapped to products (from export)
- [ ] Payload CMS JSON validated
- [ ] 301 redirect map generated
- [ ] Component map created from theme analysis
- [ ] Color scheme and fonts documented
