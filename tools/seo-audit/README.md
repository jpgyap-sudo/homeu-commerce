# SEO Audit Tool

Audits SEO metadata across the Shopify site and generates comparison reports.

## Usage

```bash
# Check metadata from a page
curl -s "https://www.homeu.ph/products/aalto-modern-sofa" | node check-metadata.mjs

# Generate full SEO report for all products
node audit.mjs --url https://www.homeu.ph --output output/seo-report.json
```

## What It Checks

- Title tags (length, uniqueness, keywords)
- Meta descriptions (length, quality)
- Canonical URLs
- Open Graph tags
- JSON-LD structured data
- Image alt text presence
- Heading hierarchy (h1, h2, etc.)
- URL structure
- Broken links

## Output

Generates `tools/seo-audit/output/seo-report.json` with:
- Per-page SEO score
- Missing metadata warnings
- Recommendations for migration
