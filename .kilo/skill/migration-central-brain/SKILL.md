# Migration Central Brain Skill

PostgreSQL-backed persistent memory + Hermes3 reasoning for the HomeU Shopify migration.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 HERMES3 REASONER                          │
│  (Ollama, local, 4.7GB)                                  │
│  → URL matching    → Product validation                   │
│  → Nav analysis    → Component mapping                    │
│  → SEO validation  → Error triage                        │
│  → Next-step suggestions                                  │
└──────────────────┬───────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────┐
│              POSTGRESQL BRAIN MEMORY                      │
│  → scanned_pages    → products        → collections       │
│  → images           → url_mappings   → navigation         │
│  → visual_analysis  → component_mappings                  │
│  → migration_phases → migration_errors→ brain_memories    │
└──────────────────┬───────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────┐
│              MIGRATION TOOLS                               │
│  Playwright Scanner │ Shopify Parser │ Ollama Vision       │
│  URL Mapper         │ Import Script  │ Theme Analyzer      │
└───────────────────────────────────────────────────────────┘
```

## Why PostgreSQL + Hermes3 > Flat JSON

| Aspect | Flat Files | Central Brain |
|--------|-----------|---------------|
| **Data size** | OK for 100 products | Handles 661+ with relations |
| **Querying** | grep/jq nightmare | `SELECT * FROM products WHERE status='pending'` |
| **Relationships** | Manual linking | Foreign keys, JOINs |
| **Resume after crash** | Lost progress | Knows exact state |
| **Error analysis** | Raw logs | Hermes3 triage + suggested fixes |
| **Intelligence** | None | Reasoning on every decision |
| **Cross-session** | Manual handoff | Persistent memory |
| **Progress tracking** | None | Automatic phase tracking |

## Database Tables

| Table | Purpose |
|-------|---------|
| `scanned_pages` | Every discovered URL with SEO metadata |
| `products` | Product data (shopify_id, handle, price, dimensions) |
| `collections` | Categories with hierarchy (parent_id) |
| `product_collections` | Many-to-many product ↔ collection |
| `images` | Image manifest with product relations |
| `url_mappings` | 301 redirect map (shopify → new) |
| `navigation` | Hierarchical menu structure |
| `visual_analysis` | llava:7b screenshot analysis results |
| `component_mappings` | Liquid → Next.js component suggestions |
| `migration_phases` | Phase tracking with item counts |
| `migration_errors` | Structured error log with Hermes3 analysis |
| `brain_memories` | Cross-session lessons and patterns |

## Quick Start

```bash
# 1. Initialize the database schema
node tools/migration-brain/brain.mjs init

# 2. Check current status
node tools/migration-brain/brain.mjs status

# 3. Scan with brain integration
cd tools/playwright-scanner
node scan.mjs --brain  # stores every page to PostgreSQL

# 4. Ask Hermes3 for intelligent guidance
node ../migration-brain/hermes-agent.mjs reason \
  "What's the best approach for mapping the 30 Shopify collections to our DaVinciOS CMS categories?"

# 5. Store a lesson learned
node ../migration-brain/brain.mjs remember \
  "Product handle normalization" \
  "Shopify handles are case-insensitive but DaVinciOS slugs are lowercase. Always lowercase handles during import." \
  "products,urls,lesson"

# 6. Generate comprehensive report
node ../migration-brain/brain.mjs report
```

## Hermes3 Reasoning Roles

The Hermes3 agent (hermes3:latest, 4.7GB local) fills these roles:

| Role | Command | Purpose |
|------|---------|---------|
| **URL Matcher** | `analyze-url` | Determine if shopify URL == new URL |
| **Product Validator** | `match-products` | Cross-reference scanner vs export data |
| **Nav Analyst** | `analyze-nav` | Reconstruct hierarchy from flat links |
| **Component Mapper** | `suggest-component` | Map Liquid → Next.js components |
| **Error Triage** | `triage-error` | Analyze and suggest migration error fixes |
| **SEO Validator** | `validate-seo` | Score and improve SEO metadata |
| **Strategist** | `reason` | General migration strategy advice |

## Migration Pipeline Flow

```
[Start] → Brain init → Scanner (stores pages/products) 
         → Hermes3 validates → Parser (stores to brain)
         → Hermes3 cross-references → Map URLs
         → Visual analysis (llava:7b) → Import to DaVinciOS
         → Verify → Store lessons → [Done]
                                     ↓
                             Brain remembers everything
```

## Integration with Codex Brain MCP

- **Codex Brain MCP**: Global, cross-project lesson storage
- **Migration Central Brain**: Project-specific, detailed migration state

Use `brain_store_lesson` for universal lessons (e.g., "Shopify handle patterns")
Use `tools/migration-brain/brain.mjs remember` for migration-specific state
