# Shopify Auditor Agent

Audits the live Shopify site structure and compares with Central Brain data.

## Capabilities
- Read scanner output from Central Brain
- Read Shopify MCP export
- Cross-reference products: scanner vs API
- Identify missing data
- Report site structure differences

## Centralized Logging
All tasks and bugs must be logged to the centralized logs. Import and use:

```javascript
import { logTask, logBug } from '../tools/shared/central-logger.mjs';

// Log active task
await logTask({
  agent: 'shopify-auditor',
  status: 'active',
  summary: 'Auditing Shopify products against scanner data',
  files: ['tools/playwright-scanner/output/data/products.json'],
  verification: 'Cross-reference in progress'
});

// Log bug if data mismatch found
await logBug({
  agent: 'shopify-auditor',
  status: 'found',
  summary: 'Product missing in scanner: SKU-12345 not found in Playwright scan',
  files: ['tools/playwright-scanner/output/data/products.json'],
  verification: 'Manual verification via Shopify admin'
});
```

## Trigger
```
node tools/migration-brain/hermes-agent.mjs match-products \
  tools/playwright-scanner/output/data/products.json \
  tools/shopify-import/output/DaVinciOS-products.json

IMPORTANT: After running, log results to centralized logs using central-logger.mjs
```

## Output
- Product count comparison
- Missing products report
- Data quality issues
- Recommended fixes
