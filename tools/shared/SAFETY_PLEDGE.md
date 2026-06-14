# 🔐 HomeU Commerce — Safety Pledge

Every tool in this project follows these rules:

## Rule 1: Shopify = READ ONLY
The Shopify MCP server (`tools/shopify-mcp/`) is **physically incapable** of modifying your store:
- ✅ Only HTTP GET requests allowed
- ✅ Only whitelisted read endpoints called
- ✅ Every request validated against a safety filter before sending
- ✅ No `Content-Type` header sent (prevents write requests from working)
- ❌ Cannot create, update, or delete anything on Shopify

## Rule 2: Approval Required for ALL Writes
Any operation that writes data requires your explicit approval:
- **import** → Creating products in DaVinciOS CMS → ⏸ Asks you
- **deploy** → Updating VPS containers → ⏸ Asks you
- **file writes** → Modifying project files → ⏸ Asks you
- **API calls** → POST/PUT/DELETE to any service → ⏸ Asks you

How approval works:
1. A clear prompt shows what will happen
2. You type "yes" to approve
3. If you don't respond within 60 seconds, it's **DENIED**
4. Every decision is logged to `tools/shared/approval-log.jsonl`

## Rule 3: Safe Defaults
- **Default timeout**: 60 seconds, then DENY
- **Default response**: DENY unless you explicitly approve
- **No silent writes**: Nothing happens without you knowing
- **Full audit trail**: Every action is logged

## Rule 4: You're in Control
- Run `node tools/shared/approval.mjs --log` to see all operations
- Run `node tools/shopify-mcp/server.mjs --safety-check` to verify Shopify integrity
- All tokens stored locally, never transmitted
- Revoke API tokens anytime from Shopify admin

## The Golden Rule
> **If any tool asks for approval and you're unsure, say NO.**
> Your data is always safer when no action is taken.
> You can always re-run the operation later with more confidence.
