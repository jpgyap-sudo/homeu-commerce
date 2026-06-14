# 🧠 Migration Central Brain

Persistent PostgreSQL memory + Hermes3 reasoning engine for the HomeU Shopify migration.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     HERMES3 REASONER                       │
│              (Ollama - local intelligence)                   │
│  URL matching │ Product validation │ Nav analysis          │
│  Component mapping │ SEO validation │ Error triage         │
└──────────┬─────────────────────────────────────┬───────────┘
           │                                     │
    ┌──────▼──────┐                      ┌───────▼──────────┐
    │  Scanner    │                      │  PostgreSQL      │
    │  Agent      │◄────────────────────►│  Brain Memory    │
    │ (Playwright)│                      │  - Pages         │
    └─────────────┘                      │  - Products      │
    ┌─────────────┐                      │  - Collections   │
    │  Parser     │◄────────────────────►│  - Images        │
    │  Agent      │                      │  - URL Mappings  │
    │ (Shopify)   │                      │  - Navigation    │
    └─────────────┘                      │  - Visual Anal.  │
    ┌─────────────┐                      │  - Errors        │
    │  Visual     │◄────────────────────►│  - Lessons       │
    │  Agent      │                      │  - Phase Progress │
    │ (llava:7b)  │                      └───────────────────┘
    └─────────────┘
```

## Why This is Genius

| Feature | Flat JSON | Central Brain |
|---------|-----------|---------------|
| **Queryability** | grep/find | SQL queries, joins, aggregations |
| **Relationships** | Manual linking | Foreign keys, product↔collection↔image |
| **Resumability** | Start over | Knows exactly where you left off |
| **Intelligence** | None | Hermes3 reasons about data |
| **Cross-session** | Lost | Persistent in PostgreSQL |
| **Error tracking** | Log files | Structured with hermes3 analysis |
| **Progress tracking** | Manual | Automatic phase tracking |
| **Memory** | None | Lessons learned persist forever |

## Quick Start

```bash
# 1. Initialize Central Brain database
node tools/migration-brain/brain.mjs init

# 2. Check status
node tools/migration-brain/brain.mjs status

# 3. Scan site (automatically stores to brain)
cd tools/playwright-scanner
node scan.mjs --screenshots --brain

# 4. Ask Hermes3 for next steps
node tools/migration-brain/brain.mjs next-steps

# 5. Generate full report
node tools/migration-brain/brain.mjs report

# 6. Store a lesson
node tools/migration-brain/brain.mjs remember "URL mapping pattern" "Products with same handle but different case should use lowercase" "seo,urls,mapping"

# 7. Recall knowledge
node tools/migration-brain/brain.mjs recall "product mapping"
```

## Hermes3 Reasoning Commands

```bash
# URL matching (does this URL map correctly?)
node tools/migration-brain/hermes-agent.mjs analyze-url \
  "https://www.homeu.ph/products/aalto-modern-sofa" \
  "/products/aalto-modern-sofa"

# Cross-reference scanner vs export data
node tools/migration-brain/hermes-agent.mjs match-products \
  tools/playwright-scanner/output/data/products.json \
  tools/shopify-import/output/DaVinciOS-products.json

# Analyze navigation structure
node tools/migration-brain/hermes-agent.mjs analyze-nav \
  "$(cat output/data/links.json)"

# Suggest Next.js component for a Liquid section
node tools/migration-brain/hermes-agent.mjs suggest-component \
  "Slideshow section with hero banner, full-width images, text overlay, and navigation dots"

# Triage a migration error
node tools/migration-brain/hermes-agent.mjs triage-error \
  '{"phase":"import","error_type":"missing_relation","message":"Product references non-existent category"}'

# Validate SEO metadata
node tools/migration-brain/hermes-agent.mjs validate-seo \
  '{"title":"Aalto │ Modern Sofa","metaDescription":"Discover the Aalto Modern Sofa..."}'

# Interactive chat with Hermes3
node tools/migration-brain/hermes-agent.mjs chat
```

## Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `scanned_pages` | Every URL discovered | url, page_type, title, meta_description, json_ld |
| `products` | Shopify products | shopify_id, handle, title, price, dimensions, materials |
| `collections` | Categories/collections | shopify_id, handle, title, parent_id |
| `product_collections` | Product-category relations | product_id, collection_id |
| `images` | Product images | product_id, original_url, checksum, status |
| `url_mappings` | 301 redirect map | shopify_url, new_url, redirect_type |
| `navigation` | Menu structure | parent_id, title, url, depth |
| `visual_analysis` | Ollama vision results | page_url, layout_description, components_detected |
| `component_mappings` | Liquid → Next.js | liquid_section, nextjs_component, confidence |
| `migration_phases` | Phase tracking | phase, status, items_processed |
| `migration_errors` | Error log with hermes3 analysis | error_type, severity, hermes_analysis, suggested_fix |
| `brain_memories` | Cross-session lessons | title, content, tags, confidence |

## Integration with Codex Brain MCP

The Migration Central Brain complements the existing Codex Brain MCP:

```
Codex Brain MCP (global, cross-project)
  └── Migration Central Brain (project-specific, detailed)
        ├── Scanner data (pages, products, collections)
        ├── Hermes3 decisions (URL matches, nav, components)
        ├── Visual analysis (llava:7b screenshot results)
        └── Migration lessons (patterns, pitfalls, solutions)
```

Use `brain_search_memory` / `brain_store_lesson` from Codex Brain MCP
for lessons that should persist beyond this project.
Use `tools/migration-brain/brain.mjs` for project-level migration state.
