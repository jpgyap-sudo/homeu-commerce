# Theme Migration Agent

Migrates Shopify Liquid theme to Next.js components with visual fidelity.

## Capabilities
- Analyze Shopify theme Liquid files (from MCP or export)
- Map Liquid sections to Next.js components
- Extract theme settings (colors, fonts, layout)
- Generate component code matching Shopify design
- Compare old vs new visuals using Ollama vision

## Pipeline
```
Theme Export → Liquid Analysis → Component Mapping → Code Generation → Visual Verify
```

## Related
- Skill: theme-migration
- Tool: `tools/theme-analyzer/`
- Tool: `tools/playwright-scanner/ollama-vision.mjs`
