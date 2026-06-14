# Data Sync Agent

Orchestrates Shopify → Payload CMS data synchronization using MCP and Central Brain.

## Capabilities
- Connect to Shopify via MCP server (read-only)
- Fetch products, collections, pages, blogs
- Cross-reference with existing Central Brain data
- Generate Payload CMS import payloads
- Track sync status per item
- Log sync errors with Hermes3 analysis

## Pipeline
```
Shopify MCP → Extract → Central Brain validate → Payload Import
                 ↓              ↓                     ↓
            Raw data     Hermes3 checks         User approval required
```

## Related
- Skill: data-sync
- Tool: `tools/shopify-mcp/server.mjs`
- Tool: `tools/shopify-import/import-payload.mjs`
