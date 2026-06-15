# HomeU Commerce — Project Instructions

Persistent, repo-level notes for any coding agent/extension (Claude Code,
Codex, Kilo Code, Blackbox, SuperRoo VS Code, Roo Cline, etc.) working in
this repository.

## Naming

This project's CMS is **DaVinciOS** (a rebranded Payload CMS v3.85.1).
Always call it "DaVinciOS" — never "Payload" — in code, docs, comments, and
conversation.

## CDN Media: DigitalOcean Spaces (`do-spaces`)

All CDN media for Products, Categories/Collections, Blogs, and Pages is
stored in a DigitalOcean Spaces bucket (S3-compatible object storage).

- **Bucket:** `homeatelierspaces` (region `sgp1`)
- **Origin endpoint:** `https://homeatelierspaces.sgp1.digitaloceanspaces.com`
- **CDN endpoint:** `https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com`
  (use this for all public-facing image URLs)
- **Credentials:** `DO_SPACES_*` vars in `.env` / `apps/website/.env` (both
  gitignored — never commit real keys)
- **Full details / S3 SDK usage / DaVinciOS `media` collection integration:**
  see [`.claude/skills/digitalocean-spaces/SKILL.md`](.claude/skills/digitalocean-spaces/SKILL.md)

### MCP access (`do-spaces`)

This repo's Spaces bucket is reachable from coding agents via a generic
S3-compatible MCP server, [`txn2/mcp-s3`](https://github.com/txn2/mcp-s3)
(binary: `mcp-s3.exe`, built with `go install
github.com/txn2/mcp-s3/cmd/mcp-s3@latest`).

It is currently registered for **Claude Code** (`claude mcp add do-spaces -s
local ...`, scoped to this project in `~/.claude.json`), read-only
(`MCP_S3_EXT_READONLY=true` — write/delete tools disabled since this bucket
backs the live CDN).

**For other extensions** (Codex, Kilo Code, Blackbox, SuperRoo VS Code, Roo
Cline, etc.): to get the same access when working in this project, register
an MCP server named `do-spaces` pointing at the same `mcp-s3.exe` binary
with these env vars (values come from `.env` in this repo — do not hardcode
or commit the secret):

```
S3_ENDPOINT          = $DO_SPACES_ORIGIN_ENDPOINT
AWS_REGION           = $DO_SPACES_REGION
AWS_ACCESS_KEY_ID    = $DO_SPACES_KEY
AWS_SECRET_ACCESS_KEY= $DO_SPACES_SECRET
S3_USE_PATH_STYLE    = false
MCP_S3_EXT_READONLY  = true   # keep read-only unless a task needs uploads
```

Tools exposed: `s3_list_buckets`, `s3_list_objects`, `s3_get_object`,
`s3_get_object_metadata`, `s3_copy_object`, `s3_presign_url` (plus
`s3_put_object` / `s3_delete_object`, disabled by default).

See the skill doc above for the full example config and rationale.
