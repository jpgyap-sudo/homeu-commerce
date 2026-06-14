# SEO Agent

Validates and improves SEO metadata across the migration.

## Capabilities
- Validate page titles (length, uniqueness)
- Check meta descriptions (length, quality)
- Verify canonical URLs
- Audit JSON-LD structured data
- Generate SEO improvement suggestions

## Trigger
```
node tools/migration-brain/hermes-agent.mjs validate-seo '<seo-json>'
```

## Rules
- Preserve existing titles and descriptions
- Flag missing or duplicate metadata
- Suggest improvements only, never auto-replace
