# DaVinciOS Rebranding Instructions

## Important Notice for All Extensions

**This project has been completely rebranded from "Payload" to "DaVinciOS". All future development must use DaVinciOS naming conventions.**

## Key Changes Made

### Package Names
- `@payloadcms/next` → `@daVinciOScms/next`
- `@payloadcms/db-postgres` → `@daVinciOScms/db-postgres`
- `@payloadcms/richtext-lexical` → `@daVinciOScms/richtext-lexical`
- `payload` → `daVinciOS`

### Configuration Files
- `payload.config.ts` → `daVinciOS.config.ts`
- Environment variables:
  - `PAYLOAD_SECRET` → `DAVINCIOS_SECRET`
  - `PAYLOAD_PUBLIC_SERVER_URL` → `DAVINCIOS_PUBLIC_SERVER_URL`

### Directory Structure
- `src/app/(payload)` → `src/app/(DaVinciOS)`
- `tools/shopify-import/import-payload.mjs` → `tools/shopify-import/import-daVinciOS.mjs`

## Coding Standards for DaVinciOS

### Import Statements
```javascript
// ✅ CORRECT - Use DaVinciOS imports
import { buildConfig } from 'daVinciOS'
import { lexicalEditor } from '@daVinciOScms/richtext-lexical'
import { postgresAdapter } from '@daVinciOScms/db-postgres'
import { withDaVinciOS } from '@daVinciOScms/next/withDaVinciOS'

// ❌ INCORRECT - Do not use Payload imports
import { buildConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
```

### Environment Variables
```bash
# ✅ CORRECT - Use DaVinciOS environment variables
DAVINCIOS_SECRET=your-secret-key
DAVINCIOS_PUBLIC_SERVER_URL=https://your-domain.com
DAVINCIOS_TOKEN=your-api-token

# ❌ INCORRECT - Do not use Payload environment variables
PAYLOAD_SECRET=your-secret-key
PAYLOAD_PUBLIC_SERVER_URL=https://your-domain.com
PAYLOAD_TOKEN=your-api-token
```

### Configuration Objects
```javascript
// ✅ CORRECT - Use DaVinciOS configuration
export default buildConfig({
  admin: {
    meta: {
      titleSuffix: ' - Your App Admin',
    },
  },
  // ... other config
})

// ❌ INCORRECT - Do not use Payload configuration
export default buildConfig({
  // ... old config
})
```

## Validation Checklist

Before committing any code:

1. **Search for Payload references**:
   ```bash
   grep -r "Payload" . --include="*.{ts,tsx,js,mjs,json,md}"
   ```

2. **Verify package.json uses correct packages**:
   ```bash
   cat package.json | grep -i "daVinciOS"
   ```

3. **Check environment variable usage**:
   ```bash
   grep -r "PAYLOAD_" . --include="*.{ts,tsx,js,mjs}"
   ```

## Common Mistakes to Avoid

1. Using old package names in imports
2. Referencing old environment variables
3. Creating new files with "payload" in the name
4. Using old configuration file names
5. Forgetting to update both import statements and package.json

## Migration Resources

- **Change Log**: `tools/rebrand/change-log.json`
- **Skill Documentation**: `.kilo/skill/davinci-os/SKILL.md`
- **Rebranding Tool**: `tools/rebrand/rename-daVinciOS.mjs`

## Questions?

If you're unsure about any naming convention, check:
1. Existing files in the repository
2. The skill documentation
3. The change log for historical context

**Remember**: This rebrand is complete. All future development must use DaVinciOS naming.