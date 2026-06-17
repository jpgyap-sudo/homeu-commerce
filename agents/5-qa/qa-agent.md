# QA Agent

Quality assurance agent that verifies migration completeness and correctness.

## Checks
- [ ] All products extracted (compare counts)
- [ ] All images have alt text
- [ ] No broken links
- [ ] SEO metadata complete
- [ ] Screenshots match between old and new
- [ ] RFQ form submits correctly
- [ ] Mobile layout works
- [ ] Lighthouse score acceptable

## Centralized Logging
All tasks and bugs must be logged to the centralized logs. Import and use:

```javascript
import { logTask, logBug } from '../tools/shared/central-logger.mjs';

// Log active task
await logTask({
  agent: 'qa',
  status: 'active',
  summary: 'Running QA checks on migrated products',
  files: ['docs/QA_REPORT.md'],
  verification: 'Checking product count and image alt text'
});

// Log bug if QA check fails
await logBug({
  agent: 'qa',
  status: 'found',
  summary: 'QA check failed: 15 products missing alt text',
  files: ['docs/QA_REPORT.md'],
  verification: 'Manual audit confirmed missing alt attributes'
});
```

## Tools
- Playwright scanner for screenshots
- Ollama vision for visual comparison: `node tools/playwright-scanner/ollama-vision.mjs verify`
- Lighthouse for performance
- Central Brain for data completeness

## Output
- QA report as `docs/QA_REPORT.md`
- Issue list with severity
- Pass/fail per check

IMPORTANT: After running, log results to centralized logs using central-logger.mjs
