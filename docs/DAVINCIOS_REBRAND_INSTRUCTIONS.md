# DaVinciOS Rebranding Instructions

## Important Notice For All Extensions

This project is branded as **DaVinciOS**. All future development must use DaVinciOS naming in package references, imports, environment variables, routes, documentation, logs, and generated resources.

## Current Naming

- Core package: `DaVinciOS`
- Next package: `@DaVinciOScms/next`
- Database package: `@DaVinciOScms/db-postgres`
- Rich text package: `@DaVinciOScms/richtext-lexical`
- Config file: `apps/website/src/daVinciOS.config.ts`
- Config alias: `@DaVinciOS-config`
- Public URL env: `DAVINCIOS_PUBLIC_SERVER_URL`
- Secret env: `DAVINCIOS_SECRET`
- Admin route group: `apps/website/src/app/(DaVinciOS)`
- Import tool: `tools/shopify-import/import-daVinciOS.mjs`

## Import Standard

```ts
import { buildConfig } from 'DaVinciOS'
import { lexicalEditor } from '@DaVinciOScms/richtext-lexical'
import { postgresAdapter } from '@DaVinciOScms/db-postgres'
import config from '@DaVinciOS-config'
```

## Environment Standard

```bash
DAVINCIOS_SECRET=replace-with-strong-secret
DAVINCIOS_PUBLIC_SERVER_URL=https://admin.homeu.ph
DAVINCIOS_TOKEN=your-api-token
```

## Validation Checklist

Before committing code:

1. Search for old brand references in tracked files.
2. Confirm package files only show DaVinciOS package names.
3. Confirm deployment scripts use `DAVINCIOS_*` variables.
4. Confirm generated exports use `DaVinciOS-products.json`, `DaVinciOS-categories.json`, and `DaVinciOS-pages.json`.
5. Confirm route groups use `(DaVinciOS)`.

## Notes

The GitHub repository should stay fully DaVinciOS-branded. If an upstream runtime adapter still expects an internal legacy key, construct it at runtime without writing the old brand name into repository text.
