# Build New App — Complete Workflow

Use this when the user asks to build a new app.

## Phase 1: Plan (App Builder + Planner)
1. Read app idea from user
2. Fill `app-spec-template.md` with business goal, target user, MVP features
3. Score **MVP value vs risk** using `app-risk-review` workflow:
   - SEO risk
   - Speed risk
   - Data privacy risk
   - Sales workflow risk
   - Shopify conflict risk
   - Maintenance burden
   - Third-party API dependency
4. Decision: Build Now / Build Later / Avoid / Use External Tool

## Phase 2: Build (Code Generator)
1. Create database migration (new table or ALTER TABLE in PostgreSQL)
2. Create API routes at `apps/website/src/app/api/admin/{app-name}/`
3. Create admin UI at `apps/website/src/app/admin/apps/{app-name}/`
4. Create frontend widget at `apps/website/src/components/{app-name}/`
5. Add admin controls (enable/disable, settings, moderation)
6. Add analytics events

## Phase 3: QA (QA Agent)
1. Run pre-deployment checklist:
   - [ ] Clear business goal documented
   - [ ] MVP scope is small
   - [ ] Mobile UI tested
   - [ ] Forms validated
   - [ ] Errors handled (try/catch, fallbacks)
   - [ ] Loading states included
   - [ ] Admin override exists
   - [ ] Analytics events added
   - [ ] No secrets committed
   - [ ] No direct production deploy without approval
   - [ ] Existing storefront unaffected
   - [ ] SEO URLs unaffected or redirects planned

2. Run security checklist:
   - [ ] All inputs validated with Zod
   - [ ] Rate limit on public forms
   - [ ] Admin APIs protected (getSession check)
   - [ ] No API keys exposed to frontend
   - [ ] No sensitive info logged
   - [ ] Upload file types checked
   - [ ] Spam protection for public forms

## Phase 4: Deploy
1. Preflight sweep (`node tools/shared/preflight-sweep.mjs --full`)
2. TypeScript check (`npx tsc --noEmit`)
3. Build check (`npm run build`)
4. Commit + push
5. Human approval
6. Deploy to VPS via deployer
