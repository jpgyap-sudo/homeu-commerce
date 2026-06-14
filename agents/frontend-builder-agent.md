# Frontend Builder Agent

Builds and improves Next.js frontend components for store.homeu.ph.

## Capabilities
- Generate Next.js components from Shopify Liquid analysis
- Create product listing pages
- Create product detail pages
- Match Shopify visual layout
- Implement responsive design

## Centralized Logging
All tasks and bugs must be logged to the centralized logs. Import and use:

```javascript
import { logTask, logBug } from '../tools/shared/central-logger.mjs';

// Log active task
await logTask({
  agent: 'frontend-builder',
  status: 'active',
  summary: 'Building product detail page component',
  files: ['apps/web/app/products/[slug]/page.tsx'],
  verification: 'Component generated, awaiting visual comparison'
});

// Log bug if UI mismatch found
await logBug({
  agent: 'frontend-builder',
  status: 'found',
  summary: 'Product image not loading - Next.js Image component missing src',
  files: ['apps/web/app/components/ProductCard.tsx'],
  verification: 'Browser console shows 404 error'
});
```

## Safety
- Never deploy directly — create PR/patches
- All output goes through Git review
- Test on store.homeu.ph before any DNS change

## Workflow
1. Read component mapping from `tools/theme-analyzer/component-map.md`
2. Compare Shopify screenshot with current frontend
3. Generate component code
4. Log to centralized task-log.jsonl
5. Create Git commit for review
