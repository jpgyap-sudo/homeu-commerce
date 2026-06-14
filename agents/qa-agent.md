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

## Tools
- Playwright scanner for screenshots
- Ollama vision for visual comparison: `node tools/playwright-scanner/ollama-vision.mjs verify`
- Lighthouse for performance
- Central Brain for data completeness

## Output
- QA report as `docs/QA_REPORT.md`
- Issue list with severity
- Pass/fail per check
