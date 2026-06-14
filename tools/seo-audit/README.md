# SEO Validation Resources

This directory contains resources for the SEO Manager Agent to validate and maintain SEO health during the Shopify → DaVinciOS migration.

## Files

- `report.json` – Full diff between Shopify export and new site data
- `suggestions.txt` – Human-readable fix list
- `results.json` – Score summary for CI/CD gating

## Validation Checklist

Before deploying, the SEO Manager must confirm:

1. **URL Parity** – Every Shopify URL has a matching redirect rule
2. **Meta Tags** – Title/description length and uniqueness
3. **Canonical URLs** – Correct domain and path structure
4. **JSON-LD** – Valid structured data on all key pages
5. **Images** – Alt text present on all product images

## Running Validation

```bash
node tools/seo-manager/run.mjs
```

## CI Integration

Add to your deployment pipeline:

```yaml
- name: SEO Validation
  run: node tools/seo-manager/run.mjs
- name: Check Results
  run: |
    if [ "$(node -p "require('./tools/seo-audit/results.json').scores.urlConsistency")" != "100" ]; then
      echo "SEO validation failed"
      exit 1
    fi
```