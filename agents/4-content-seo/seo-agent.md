# SEO Agent

Validates and improves SEO metadata across the migration.

## Capabilities
- Validate page titles (length, uniqueness)
- Check meta descriptions (length, quality)
- Verify canonical URLs
- Audit JSON-LD structured data
- Generate SEO improvement suggestions

## Centralized Logging
All tasks and bugs must be logged to the centralized logs. Import and use:

```javascript
import { logTask, logBug } from '../tools/shared/central-logger.mjs';

// Log active task
await logTask({
  agent: 'seo',
  status: 'active',
  summary: 'Validating SEO metadata for migrated pages',
  files: ['docs/seo-audit/'],
  verification: 'Checking page titles and meta descriptions'
});

// Log bug if SEO issues found
await logBug({
  agent: 'seo',
  status: 'found',
  summary: 'Duplicate page title: "Home" used on multiple pages',
  files: ['docs/seo-audit/results.json'],
  verification: 'Manual audit confirmed'
});
```

## Trigger
```
node tools/migration-brain/hermes-agent.mjs validate-seo '<seo-json>'

IMPORTANT: After running, log results to centralized logs using central-logger.mjs
```

## Rules
- Preserve existing titles and descriptions
- Flag missing or duplicate metadata
- Suggest improvements only, never auto-replace
