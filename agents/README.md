# HomeU Migration Agents

All agents registered in `.kilo/kilo.json` with corresponding skills in `.kilo/skill/`.

## Agent Map

| Agent | Type | Skill | Purpose |
|-------|------|-------|---------|
| `reverse-engineer` | Kilo | `shopify-reverse-engineer` | Full migration pipeline |
| `central-brain` | Kilo | `migration-central-brain` | PostgreSQL + Hermes3 memory |
| `deploy` | Kilo | `deploy` | VPS Docker deployment |
| `data-sync` | Kilo | `data-sync` | Shopify → Payload sync |
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

agents/                    # Agent prompt templates (registered via path)
├── planner-agent.md
├── shopify-auditor-agent.md
├── seo-agent.md
├── frontend-builder-agent.md
├── qa-agent.md
└── content-agent.md

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
