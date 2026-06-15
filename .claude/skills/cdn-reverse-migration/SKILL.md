---
name: cdn-reverse-migration
description: Reusable workflow for reverse-engineering legacy (Shopify) CDN image references out of scraped/exported data and seamlessly mirroring them to DigitalOcean Spaces with content-addressed dedup, before they're imported into DaVinciOS.
---

# CDN Reverse-Migration — Shopify CDN → DigitalOcean Spaces

## When to use

Use this when migrating any content that still references `cdn.shopify.com`
image URLs — Products, Categories/Collections, Blogs, Pages — into HomeU's
own DigitalOcean Spaces bucket (`homeatelierspaces`, see
[`digitalocean-spaces`](../digitalocean-spaces/SKILL.md)) **before or
independent of** the DaVinciOS database import. It works entirely off the
already-exported JSON in `tools/shopify-import/output/`, so it:

- Never touches the live Shopify admin/store (read-only `GET`s against the
  public CDN — fine even under the standing "don't touch Shopify until
  launch" constraint).
- Doesn't require Postgres/DaVinciOS to be running — it's a pure
  file-in/file-out pipeline.
- Produces output the importer (`import-daVinciOS.mjs`) can consume later
  without any further Shopify dependency.

## The genius idea: content-addressed, idempotent mirror manifest

Don't migrate "per product" — migrate **unique image bytes**. The HomeU
catalog reuses the same product photos across many SKUs/variants and the
same hero images across categories. A naive 1:1 copy re-downloads and
re-uploads the same file dozens of times and leaves the rewritten JSON
pointing at N different Spaces objects for what is really one image.

Instead:

1. **Scan** every exported JSON file (`DaVinciOS-products.json`,
   `DaVinciOS-categories.json`, `DaVinciOS-pages.json`, …) for
   `https://cdn.shopify.com/...` URLs — in `images[].src`, `image`, and
   inline `<img src="...">` tags inside rich-text `description`/`content`
   fields. Record every **unique URL** in a manifest,
   `output/cdn-migration-manifest.json`.
2. **Mirror**: for each pending URL, download it, compute its **SHA-256**,
   and upload to Spaces under a **content-addressed key**:
   `cdn-mirror/<sha256>.<ext>`. If two different Shopify URLs hash to the
   same bytes (duplicate photo), they collapse to the same Spaces object —
   uploaded once. The manifest records `{ sha256, spacesKey, cdnUrl, bytes,
   contentType, status }` per source URL.
3. **Rewrite**: produce non-destructive `*.cdn.json` siblings of each input
   file with every matched Shopify URL replaced by its
   `DO_SPACES_CDN_ENDPOINT/cdn-mirror/<sha256>.<ext>` equivalent — including
   occurrences inside rich-text HTML. Originals are untouched, so this step
   can be re-run safely and diffed before being adopted.

Because the manifest persists `status: 'done'` per URL and dedups by hash,
the whole pipeline is **resumable and idempotent**: re-running `--scan`
picks up newly-exported data, re-running `--mirror` skips everything already
uploaded, and `--rewrite` always reflects the current manifest.

## Script: `tools/shopify-import/migrate-cdn-to-spaces.mjs`

```
node tools/shopify-import/migrate-cdn-to-spaces.mjs --scan
node tools/shopify-import/migrate-cdn-to-spaces.mjs --report
node tools/shopify-import/migrate-cdn-to-spaces.mjs --mirror --execute [--limit N] [--concurrency 5]
node tools/shopify-import/migrate-cdn-to-spaces.mjs --rewrite
```

- `--scan` — regex-scans the configured input JSON files for
  `cdn.shopify.com` URLs and adds new ones to the manifest as `pending`.
  Pure local file read, no network.
- `--report` — prints manifest stats: total unique URLs, done/pending,
  unique content hashes (post-dedup), total bytes mirrored.
- `--mirror` — without `--execute`, just prints what *would* be downloaded
  (dry run). With `--execute`, downloads from `cdn.shopify.com`, hashes,
  and uploads to DO Spaces (`DO_SPACES_*` env vars from `.env`). `--limit N`
  caps how many pending URLs are processed — use this for a small
  end-to-end test before running a full batch.
- `--rewrite` — writes `output/<name>.cdn.json` for each input, with all
  `done` manifest URLs replaced by their Spaces CDN URL.

## Status (2026-06-15)

Initial migration complete: 3,209/3,212 unique Shopify CDN image URLs
mirrored (3 are dead 404 links in the source export, left as `error` in the
manifest). Deduped to 3,164 unique objects (~755 MB) under
`homeatelierspaces/cdn-mirror/<sha256>.<ext>`. Rewritten outputs:
`output/DaVinciOS-products.cdn.json` (3,152 URLs), `DaVinciOS-categories.cdn.json`
(39), `DaVinciOS-pages.cdn.json` (18). Re-run `--scan`/`--mirror`/`--rewrite`
if the source exports are regenerated or gain new image references.

Credentials/endpoints come from `.env` (`DO_SPACES_REGION`,
`DO_SPACES_BUCKET`, `DO_SPACES_ORIGIN_ENDPOINT`, `DO_SPACES_CDN_ENDPOINT`,
`DO_SPACES_KEY`, `DO_SPACES_SECRET`) — see
[`digitalocean-spaces`](../digitalocean-spaces/SKILL.md). Verify uploaded
objects read-only via the `do-spaces` MCP (`s3_list_objects` /
`s3_get_object_metadata` / `s3_presign_url`) without needing write access in
the MCP session itself.

## Extending to new content types

To migrate Blogs/Pages or any future export, add its
`output/DaVinciOS-<type>.json` path to the `INPUT_FILES` list at the top of
the script — the scan/mirror/rewrite logic is generic over "any
`cdn.shopify.com` URL found anywhere in the JSON tree", including inside
rich-text HTML strings.

## Future work: wiring into DaVinciOS import

Once `*.cdn.json` files exist, `import-daVinciOS.mjs` (or its DB-direct
path) should read the `.cdn.json` variants instead of the raw exports, and
optionally also create corresponding `media` collection documents in
Postgres pointing at the same `cdn-mirror/<sha256>.<ext>` keys — so
`images` relationships resolve to DaVinciOS `media` docs rather than bare
URL strings. Not yet implemented.
