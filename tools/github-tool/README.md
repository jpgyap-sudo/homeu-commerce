# GitHub Integration Tool

Manages GitHub operations for the HomeU migration project.

## Available Operations

### Create Issue
```bash
# Use gh CLI (if installed) or GitHub API
gh issue create --title "Missing: Product detail page template" \
  --body "Need to create Next.js product detail page matching Shopify layout" \
  --label "frontend,migration"
```

### Create Pull Request
```bash
gh pr create --title "Phase 5: Product listing pages" \
  --body "Adds collection pages and product grid components" \
  --base master
```

### List Issues
```bash
gh issue list --label migration --state open
```

### Create Release / Tag
```bash
git tag v0.2-frontend-preview
git push origin v0.2-frontend-preview
```

## Migration-Specific Labels
- `migration` — General migration task
- `phase-5-frontend` — Frontend work
- `phase-6-rfq` — RFQ cart work
- `phase-9-launch` — Launch prep
- `seo` — SEO-related
- `safety` — Safety/security
- `bug` — Bug fixes
- `data` — Data sync/import

## Notes
- All migration work should be labeled for tracking
- Use PRs for deployable changes
- Tag baselines for rollback points
