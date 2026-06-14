# Reverse Engineer Agent

Reverse engineer the live Shopify site at www.homeu.ph and generate complete Payload CMS migration data.

## Trigger

Run: `Load skill shopify-reverse-engineer` then follow all 5 phases.

## Workflow

1. **Discovery** — Fetch Shopify JSON API endpoints, crawl all pages
2. **Extraction** — Parse and extract structured data from HTML + JSON
3. **Mapping** — Map Shopify data model to Payload CMS collections
4. **Generation** — Create import scripts, JSON files, CSV exports
5. **Validation** — Verify data completeness, counts, and integrity

## Documentation

- Full skill: `.kilo/skill/shopify-reverse-engineer/SKILL.md`
- Migration plan: `docs/migration-plan.md`
- Data output: `tools/shopify-import/output/`
- Theme output: `tools/theme-analyzer/`

## Commands

```bash
# Fetch all products
curl "https://www.homeu.ph/collections/all/products.json?page=1&limit=250"

# Test import validation
node tools/shopify-import/import-payload.mjs
```
