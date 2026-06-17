# SEO Manager Agent

**Purpose** – Guarantees SEO parity between the live Shopify site and the new Next.js/DaVinciOS storefront.

## Core Responsibilities
1. **URL Consistency** – Verify that every URL discovered by the Playwright scanner has a matching redirect rule in `tools/url-mapper/redirects.json`.  
2. **Meta‑Tag Validation** – Compare `title`, `meta description`, `canonical`, `og:*` tags, and `twitter:*` tags against the original Shopify export.  
3. **JSON‑LD & Structured Data** – Ensure all `application/ld+json` blocks are present and unchanged.  
4. **AI‑Assisted Gap Detection** – Use Ollama (`llava:7b`) to flag missing or malformed SEO elements and suggest fixes.  
5. **Central Logging** – Log every validation step and any discovered issues via `tools/shared/central-logger.mjs`.

## Workflow
```text
▶ Run Playwright scanner → generate `seo-metadata.json`
▶ Run SEO Manager → compare against Shopify export
▶ Log tasks/bugs → output `seo-audit/report.json` + `seo-audit/suggestions.txt`
▶ Fail CI if critical mismatches exist
```

## Trigger
```bash
node tools/seo-manager/run.mjs
```

## Rules
- **Never auto‑replace** live titles/descriptions; only suggest.
- **All redirects** must be 301 and present in `redirects.json`.
- **Canonical URLs** must point to the new domain (`store.homeu.ph`) while preserving the original path.
- **Structured‑data** must be valid JSON‑LD (validated with `jsonschema`).
- **URL parity is mandatory** – every live Shopify URL must have a corresponding redirect rule or an explicit exclusion.

## Output Files
- `tools/seo-audit/report.json` – full diff between Shopify export and new site data.
- `tools/seo-audit/suggestions.txt` – human‑readable fix list.
- `tools/seo-audit/results.json` – score summary for CI/CD gating.

## Validation
- Run `node tools/seo-manager/run.mjs`
- Confirm `tools/seo-audit/results.json` has all scores at 100.
- Confirm `tools/seo-audit/suggestions.txt` contains no critical issues.