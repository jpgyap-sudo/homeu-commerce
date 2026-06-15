---
name: digitalocean-spaces
description: HomeU Commerce CDN media storage on DigitalOcean Spaces (S3-compatible) — credentials, MCP access, and DaVinciOS Media integration.
---

# DigitalOcean Spaces — HomeU CDN Media Storage

## When to use

Use this skill when working on anything related to image/media storage for
the HomeU site: the `media` collection in DaVinciOS, product/category/blog/page
images, CDN URLs, uploads, or the DigitalOcean Spaces bucket itself.

## Bucket details

- **Bucket name:** `homeatelierspaces`
- **Region:** `sgp1` (Singapore)
- **Origin endpoint (S3 API):** `https://homeatelierspaces.sgp1.digitaloceanspaces.com`
- **CDN endpoint (public asset URLs):** `https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com`
- **Intended contents:** images for Products, Categories/Collections, Blogs, Pages — anything served via DaVinciOS's `media` collection.

Credentials live in `.env` (root) and `apps/website/.env` (both gitignored,
never commit):

```
DO_SPACES_REGION=sgp1
DO_SPACES_BUCKET=homeatelierspaces
DO_SPACES_ORIGIN_ENDPOINT=https://homeatelierspaces.sgp1.digitaloceanspaces.com
DO_SPACES_CDN_ENDPOINT=https://homeatelierspaces.sgp1.cdn.digitaloceanspaces.com
DO_SPACES_KEY=allbuckets-17815175896
DO_SPACES_SECRET=<see .env>
```

When building public-facing image URLs, always use `DO_SPACES_CDN_ENDPOINT`
(not the origin endpoint) — it's the CDN-fronted path.

## S3 API compatibility

Spaces implements the AWS S3 API, so any S3 SDK/tool works by pointing at the
origin endpoint with path- or virtual-hosted-style addressing and the
`sgp1` region. With the AWS SDK v3 for JS:

```ts
import { S3Client } from '@aws-sdk/client-s3'

const spaces = new S3Client({
  endpoint: process.env.DO_SPACES_ORIGIN_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false, // Spaces supports virtual-hosted-style: bucket.region.digitaloceanspaces.com
})
```

## Wiring into DaVinciOS's `media` collection (future work)

DaVinciOS (rebranded Payload CMS v3.85) supports an S3-compatible storage
adapter package (`@payloadcms/storage-s3`, aliased here as
`@DaVinciOScms/storage-s3` if/when added). To make uploads in the `media`
collection go straight to Spaces instead of local disk:

1. `npm install @aws-sdk/client-s3 @DaVinciOScms/storage-s3` (or the upstream
   `@payloadcms/storage-s3` if the alias package isn't published yet — check
   `packages/davincios` for the aliasing pattern used elsewhere).
2. In `apps/website/src/daVinciOS.config.ts`, add the plugin to the `plugins`
   array, configured with `bucket: process.env.DO_SPACES_BUCKET`,
   `region: process.env.DO_SPACES_REGION`, `endpoint:
   process.env.DO_SPACES_ORIGIN_ENDPOINT`, and credentials from
   `DO_SPACES_KEY` / `DO_SPACES_SECRET`, scoped to the `media` collection.
3. Set the collection's public URL generation to use
   `DO_SPACES_CDN_ENDPOINT` so admin-uploaded media is served via the CDN.

Not yet implemented — this is the natural next step once basic Spaces access
is verified.

## MCP access to the bucket

There is **no official DigitalOcean MCP tool for browsing/uploading objects**:
- `@digitalocean/mcp` (official) only covers App Platform (deploy/logs/etc).
- DigitalOcean's "Spaces MCP tools" (`spaces-key-*`) only manage **access
  keys**, not bucket contents.

For actual object operations (list/get/put/delete/presign), use a generic
S3-compatible MCP server pointed at the Spaces endpoint, e.g.
[`txn2/mcp-s3`](https://github.com/txn2/mcp-s3) (Go, supports custom S3
endpoints):

```bash
go install github.com/txn2/mcp-s3/cmd/mcp-s3@latest
```

Example MCP client config (local-only — goes in a gitignored settings file,
never committed):

```json
{
  "mcpServers": {
    "do-spaces": {
      "command": "mcp-s3",
      "env": {
        "S3_ENDPOINT": "https://homeatelierspaces.sgp1.digitaloceanspaces.com",
        "AWS_REGION": "sgp1",
        "AWS_ACCESS_KEY_ID": "<DO_SPACES_KEY>",
        "AWS_SECRET_ACCESS_KEY": "<DO_SPACES_SECRET>",
        "S3_USE_PATH_STYLE": "false"
      }
    }
  }
}
```

Tools exposed: `s3_list_buckets`, `s3_list_objects`, `s3_get_object`,
`s3_get_object_metadata`, `s3_put_object` (disabled by default —
enable explicitly for write access), `s3_delete_object` (disabled by
default), `s3_copy_object`, `s3_presign_url`.

**Safety note:** write/delete tools are disabled by default in `mcp-s3` —
keep them disabled unless a task explicitly requires uploading/removing
objects, since this bucket backs the live CDN.
