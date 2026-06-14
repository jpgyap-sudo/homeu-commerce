# Data Sync Agent

Orchestrates Shopify → DaVinciOS CMS data synchronization using MCP and Central Brain.

## Capabilities
- Connect to Shopify via MCP server (read-only)
- Fetch products, collections, pages, blogs
- Cross-reference with existing Central Brain data
- Generate DaVinciOS CMS import DaVinciOSs
- Track sync status per item
- Log sync errors with Hermes3 analysis

## Pipeline
```
Shopify MCP → Extract → Central Brain validate → DaVinciOS Import
                 ↓              ↓                     ↓
            Raw data     Hermes3 checks         User approval required
```

## Related
- Skill: data-sync
- Tool: `tools/shopify-mcp/server.mjs`
- Tool: `tools/shopify-import/import-DaVinciOS.mjs`
