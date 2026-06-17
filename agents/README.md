# HomeU Migration Agents

All agents registered in `.kilo/kilo.json` with corresponding skills in `.kilo/skill/`.

## Agent Map

| Agent | Type | Skill | Purpose |
|-------|------|-------|---------|
| `reverse-engineer` | Kilo | `shopify-reverse-engineer` | Full migration pipeline |
| `central-brain` | Kilo | `migration-central-brain` | PostgreSQL + Hermes3 memory |
| `deploy` | Kilo | `deploy` | VPS Docker deployment |
| `data-sync` | Kilo | `data-sync` | Shopify → DaVinciOS sync |
| `image-pipeline` | Kilo | `image-pipeline` | Image migration |
| `navigation` | Kilo | `navigation-migration` | Menu migration |
| `theme-migration` | Kilo | `theme-migration` | Liquid → Next.js |
| `security` | Kilo | `security-audit` | Security audit |
| `planner` | Kilo | — | Task prioritization |
| `shopify-auditor` | Kilo | — | Data cross-reference |
| `seo` | Kilo | — | SEO validation |
| `frontend-builder` | Kilo | — | Frontend components |
| `qa` | Kilo | — | Quality assurance |
| `content` | Kilo | — | Content drafting |
| `concierge-builder` | Kilo | — | Chatbot construction |
| `website-designer` | Kilo | — | UI/UX design |
| `deployer` | Kilo | — | Deploy coordination |

## Agent Categories (by migration phase)

| Phase | Directory | Agents |
|-------|-----------|--------|
| 1. Plan | `1-plan/` | `planner-agent.md` |
| 2. Audit | `2-audit/` | `shopify-auditor-agent.md` |
| 3. Build | `3-build/` | `frontend-builder-agent.md`, `frontend-developer-agent.md`, `website-designer-agent.md`, `concierge-builder-agent.md` |
| 4. Content & SEO | `4-content-seo/` | `content-agent.md`, `seo-agent.md`, `seo-manager-agent.md` |
| 5. QA | `5-qa/` | `qa-agent.md` |

## File Locations

```
.kilo/
├── kilo.json              # All agent + skill registrations
├── agent/                 # Agent definitions (registered)
│   ├── reverse-engineer.md
│   ├── central-brain.md
│   ├── deploy-agent.md
│   ├── data-sync-agent.md
│   ├── image-pipeline-agent.md
│   ├── navigation-agent.md
│   ├── theme-migration-agent.md
│   └── security-agent.md
└── skill/                 # Skill instructions
    ├── shopify-reverse-engineer/SKILL.md
    ├── migration-central-brain/SKILL.md
    ├── deploy/SKILL.md
    ├── data-sync/SKILL.md
    ├── image-pipeline/SKILL.md
    ├── navigation-migration/SKILL.md
    ├── theme-migration/SKILL.md
    └── security-audit/SKILL.md

agents/                    # Agent prompt templates (registered via path) — organized by migration phase
├── README.md
├── 1-plan/
│   └── planner-agent.md
├── 2-audit/
│   └── shopify-auditor-agent.md
├── 3-build/
│   ├── frontend-builder-agent.md
│   ├── frontend-developer-agent.md
│   ├── website-designer-agent.md
│   └── concierge-builder-agent.md
├── 4-content-seo/
│   ├── content-agent.md
│   ├── seo-agent.md
│   └── seo-manager-agent.md
└── 5-qa/
    └── qa-agent.md

tools/                     # Agent tools
├── migration-brain/       # Central Brain
├── shopify-mcp/           # Shopify MCP server
├── playwright-scanner/    # Site scanner
├── shopify-import/        # Import tools
├── url-mapper/            # URL mapping
├── theme-analyzer/        # Theme analysis
├── lighthouse-tool/       # Performance audit
├── github-tool/           # GitHub operations
├── shared/                # Shared utils (approval)
└── seo-audit/             # SEO audit
```
