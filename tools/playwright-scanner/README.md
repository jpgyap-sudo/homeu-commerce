# Playwright Site Scanner

Crawls and scans www.homeu.ph using Playwright + Chromium to extract all data for migration.

## Features

- **Full crawl** — Discovers all pages (products, collections, pages, blogs)
- **SEO extraction** — Title, meta description, canonical URL, OG tags, JSON-LD
- **Image mapping** — Extracts all product images from Shopify CDN
- **Screenshots** — Full-page screenshots of every page for visual reference
- **Ollama Vision** — Analyzes screenshots with local `llava:7b` for visual comparison
- **Shopify export validation** — Cross-references scanned data with exported CSV/images
- **Broken link detection** — Identifies 404s and errors

## Usage

```bash
# Quick scan (no screenshots)
node tools/playwright-scanner/scan.mjs --no-screenshots --delay 200

# Full scan with screenshots
node tools/playwright-scanner/scan.mjs --screenshots

# Full scan with Ollama vision analysis
node tools/playwright-scanner/scan.mjs --screenshots --ollama

# Scan with custom limits
node tools/playwright-scanner/scan.mjs --max-pages 100 --delay 500
```

## Ollama Vision Tools

```bash
# Analyze a single screenshot
node tools/playwright-scanner/ollama-vision.mjs analyze output/screenshots/homepage.png

# Batch analyze all screenshots
node tools/playwright-scanner/ollama-vision.mjs batch output/screenshots/

# Compare Shopify vs new site
node tools/playwright-scanner/ollama-vision.mjs verify shopify.png new-site.png

# List available vision models
node tools/playwright-scanner/ollama-vision.mjs list-models
```

## Output Structure

```
output/
├── screenshots/          # Full-page screenshots
│   ├── www.homeu.ph_products_aalto-modern-sofa.png
│   ├── www.homeu.ph_products_aalto-modern-sofa.analysis.txt  (Ollama)
│   └── ...
├── raw/                  # Raw HTML of each page
│   └── *.html
└── data/                 # Structured data
    ├── scan-summary.json      # Overall scan results
    ├── all-pages.json         # All discovered pages
    ├── products.json          # Product pages with SEO + images
    ├── collections.json       # Collection pages
    ├── seo-metadata.json      # All SEO metadata
    ├── all-images.json        # All discovered images
    └── broken-links.json      # Broken link report
```

## Requirements

- Node.js 20+
- Playwright (installed via project, browsers cached locally)
- Ollama with `llava:7b` (optional, for vision analysis)

## Data Flow

```
Live Shopify Site (www.homeu.ph)
       ↓ (Playwright crawl + screenshot)
Playwright Scanner
       ↓
  ┌───────────────────┐
  │ Structured JSON   │──→ DaVinciOS CMS Import
  │ SEO Metadata      │──→ SEO Preservation
  │ Screenshots       │──→ Visual Reference
  │ Image Manifest    │──→ Image Migration
  └───────────────────┘

Shopify Export (products.csv, images/, theme.zip)
       ↓ (Parser)
Shopify Export Parser
       ↓
  ┌───────────────────┐
  │ DaVinciOS Products   │
  │ Image Mapping      │
  │ Theme Analysis     │
  └───────────────────┘

Cross-reference: scanner data vs. export data
       ↓
  ┌───────────────────┐
  │ Final Import Data  │──→ DaVinciOS CMS
  └───────────────────┘
```

## Notes

- Respect the live site: use delays between requests
- Screenshots are full-page for complete visual capture
- Ollama analyses are best-effort — review results manually
- Cross-reference scanner output with Shopify CSV export for completeness
