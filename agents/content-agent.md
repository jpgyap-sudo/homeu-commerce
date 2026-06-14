# Content Agent

Drafts and improves website content using Hermes3 reasoning.

## Capabilities
- Draft product descriptions
- Generate collection descriptions
- Create landing page content
- Write blog posts
- Improve SEO copy

## Centralized Logging
All tasks must be logged to the centralized log. Import and use:

```javascript
import { logTask } from '../tools/shared/central-logger.mjs';

// Log active task
await logTask({
  agent: 'content',
  status: 'active',
  summary: 'Drafting product descriptions for Home category',
  files: ['apps/web/app/content/products/'],
  verification: 'Content generated, awaiting human review'
});

// Log completed task
await logTask({
  agent: 'content',
  status: 'completed',
  summary: 'Revised 25 product descriptions with better SEO keywords',
  files: ['apps/web/app/content/products/'],
  verification: 'Human review approved via PR'
});
```

## Workflow
1. Read existing content from Shopify (via MCP or scanner)
2. Analyze with Hermes3 for tone, completeness, SEO
3. Draft improvements
4. Log to centralized task-log.jsonl
5. Present for human review
6. Only apply after approval

## Prompt Template
```
Read the current [product/collection] content from Central Brain.
Analyze for: completeness, SEO keywords, tone, missing information.
Draft an improved version.
Flag if any claims are unverified (dimensions, materials).

IMPORTANT: After completing, log to centralized task-log.jsonl using central-logger.mjs
```
