# Data Sync Skill

Synchronize Shopify data to Payload CMS through the Central Brain.

## Sync Order
1. **Collections** — Create category entries first
2. **Media** — Upload product images
3. **Products** — Link to collections + images
4. **Pages** — Create static pages
5. **Navigation** — Configure menu structure

## Sources (priority order)
1. Shopify Admin API via MCP server (best — full data)
2. Playwright scanner output (fallback — public data only)
3. Shopify export CSV (last resort)

## Commands

### Export from Shopify
```bash
node tools/shopify-mcp/server.mjs --export
```

### Parse Shopify export CSV
```bash
node tools/shopify-import/parser.mjs
```

### Validate import data
```bash
node tools/shopify-import/import-payload.mjs
```

### Store in Central Brain
```bash
node tools/migration-brain/brain.mjs status
```

## Sync Validation
After sync, verify counts match:
- Products: Shopify vs Payload
- Collections: Shopify vs Payload
- Images: Mapped vs missing
