# Lighthouse Audit Tool

Performance, accessibility, and SEO auditing for the HomeU project.

## Install

```bash
# Lighthouse is available via Chrome or CLI
npm install -g lighthouse
# Or use npx
npx lighthouse https://store.homeu.ph --view
```

## Commands

### Full audit
```bash
npx lighthouse https://store.homeu.ph \
  --output json \
  --output html \
  --output-path tools/lighthouse-tool/reports/store-homeu \
  --chrome-flags="--headless"
```

### Audit both domains
```bash
npx lighthouse https://store.homeu.ph --output json --output-path reports/store.json
npx lighthouse https://admin.homeu.ph --output json --output-path reports/admin.json
```

### Compare with Shopify
```bash
npx lighthouse https://www.homeu.ph --output json --output-path reports/shopify.json
npx lighthouse https://store.homeu.ph --output json --output-path reports/new-site.json
```

## Score Targets

| Category | Target | Minimum |
|----------|--------|---------|
| Performance | 80+ | 60 |
| Accessibility | 90+ | 80 |
| Best Practices | 90+ | 80 |
| SEO | 95+ | 85 |

## Output
Reports saved to `tools/lighthouse-tool/reports/` with timestamps.
Compare scores between Shopify baseline and new site.

## Continuous Monitoring
Run after every major frontend change to catch regressions.
