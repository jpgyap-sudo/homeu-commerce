# App Spec Template

## App Name
*One-line description*

## Business Goal
*What business problem does this solve? (RFQ conversion, engagement, operational efficiency)*

## Target User
- Architects
- Interior Designers
- Contractors
- Homeowners
- Admin staff

## MVP Features
1. *Core feature*
2. *Core feature*
3. *Admin control*

## Not Included Yet
*Features explicitly deferred for later*

## Data Model
```sql
CREATE TABLE app_name (
  id SERIAL PRIMARY KEY,
  -- fields
);
```

## API Endpoints
```
GET  /api/admin/{app}        — list
POST /api/admin/{app}        — create
PATCH /api/admin/{app}/:id   — update
DELETE /api/admin/{app}/:id  — delete
GET  /api/{app}/public       — public endpoint (rate limited)
```

## Admin UI
- Location: `/admin/apps/{app-name}`
- Features: enable/disable, CRUD, moderation

## Frontend UI
- Component: `components/{app-name}/Widget.tsx`
- Props: ...
- Location on page: ...

## Analytics Events
- `{app_name}_view`
- `{app_name}_interaction`
- `{app_name}_conversion`

## Security Rules
- [ ] Zod validation on all inputs
- [ ] Rate limit on public endpoints
- [ ] Admin auth via getSession()
- [ ] No secrets in frontend

## SEO Impact
- New URLs? ...
- Existing URLs affected? ...
- Meta tags set? ...

## Testing Checklist
- [ ] Mobile + desktop
- [ ] Loading state
- [ ] Error state
- [ ] Empty state
- [ ] Form validation
- [ ] Edge cases

## Deployment Notes
- Database migration: ...
- Env vars needed: ...
- Rollback plan: ...
