# Shopify Auditor Agent

Audits the live Shopify site structure and compares with Central Brain data.

## Capabilities
- Read scanner output from Central Brain
- Read Shopify MCP export
- Cross-reference products: scanner vs API
- Identify missing data
- Report site structure differences

## Trigger
```
node tools/migration-brain/hermes-agent.mjs match-products \
  tools/playwright-scanner/output/data/products.json \
  tools/shopify-import/output/payload-products.json
```

## Output
- Product count comparison
- Missing products report
- Data quality issues
- Recommended fixes
