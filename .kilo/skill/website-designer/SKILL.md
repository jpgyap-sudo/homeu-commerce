# Website Designer Skill — HomeU Commerce

Design premium, practical, production-ready UI for the HomeU furniture catalog, RFQ workflow, login/auth pages, and admin backend.

**Architecture context:**
- **DaVinciOS** = The backend CMS/system. Powers the admin panel, collections, API, and database. Branding for admin login pages uses DaVinciOS (DaVinciLogo, DaVinciOS patterns).
- **HomeU (HOMEU.PH)** = The customer-facing frontend brand. Pages at store.homeu.ph use HomeU branding.

This skill merges all design resources from the DaVinciOS Design Skills Pack.

## Brand Identity
- **Name:** HOMEU.PH (Home Atelier PH)
- **Backend CMS:** DaVinciOS
- **Tagline:** Modern Interior | Contemporary Furniture | Bespoke Designs
- **Industry:** Furniture & interior design retail (RFQ model — no checkout/payment)
- **Vibe:** Luxury, calm, architectural, editorial, showroom, warm minimalism, spacious, trustworthy

## Design Keywords
Luxury, calm, architectural, editorial, showroom, warm minimalism, spacious, trustworthy

## Color Palette
- **Background:** `#f8f5ef` or similar warm neutral
- **Surface:** white/ivory
- **Text:** charcoal
- **Accent:** muted brass/gold (not bright yellow)
- **Border radius:** medium-large, elegant
- **Spacing:** generous, editorial

## UI Component Libraries (Pattern Reference Only)
- **shadcn/ui** — Core design system foundation: https://ui.shadcn.com
  - Login blocks: https://ui.shadcn.com/blocks/login
  - Sidebar blocks: https://ui.shadcn.com/blocks/sidebar
  - Dashboard examples: https://ui.shadcn.com/examples/dashboard
- **Magic UI** — Premium animated sections (marketing pages, hero effects): https://magicui.design
- **Aceternity UI** — Landing page polish (hero sections, backgrounds, animated cards): https://ui.aceternity.com
- **HomeU Admin** — Custom admin panel built with Next.js App Router and direct PostgreSQL integration

> **Rule:** Study patterns, do NOT copy full commercial templates. Rebuild original HomeU-branded components.

## Design Priorities
1. Business clarity — users must understand the RFQ model immediately
2. SEO preservation — never break meta tags, headings, structured data
3. Fast loading — minimize JS bundles, lazy-load images, avoid heavy animation on critical paths
4. Luxury furniture feel — warm neutrals, generous spacing, large photography
5. Mobile responsiveness — every design must work on mobile first
6. Safe admin workflow — clear navigation, confirmation dialogs, status indicators
7. Human review before risky changes — never auto-publish AI-generated design changes

---

## Section 1: Login Page Designer

### Goal
Create a premium, trustworthy login section for HomeU admin and staff portals.

### Layout
- **Desktop:** Left 45% brand/story panel (showroom image, furniture detail, or abstract DaVinciOS pattern) + Right 55% login card centered
- **Mobile:** Brand mark at top + Login card full width (hide large image panel)

### Components (shadcn)
Card, Button, Input, Label, Separator, Alert
Optional: Magic UI subtle border beam (only if performance allows)
Avoid: Heavy Aceternity animation on auth pages

### Required UX States
- [ ] Empty state validation
- [ ] Invalid credentials error (generic: "Invalid email or password" — never reveal whether email exists)
- [ ] Loading state with disabled button
- [ ] Password visibility toggle
- [ ] Forgot password link
- [ ] Admin/support contact line

### Security Rules
- Never hardcode admin emails/passwords
- Never expose backend secrets in frontend
- Rate-limit login on backend
- Generic error messages only

### Suggested File Structure
```
app/(auth)/login/page.tsx
components/auth/LoginPageShell.tsx
components/auth/LoginForm.tsx
components/auth/PasswordInput.tsx
components/brand/DaVinciLogo.tsx
lib/auth/client.ts
```

### AI Prompt
Build a HomeU admin login page using Next.js, React, Tailwind, and shadcn/ui. Create an original luxury furniture-inspired layout. Use a two-column desktop layout and single-column mobile layout. Include email/password fields, loading state, password visibility toggle, error alert, forgot password link, and HomeU branding. Do not copy any external template exactly. Keep code modular with LoginForm.tsx and LoginPageShell.tsx.

---

## Section 2: Admin Backend Designer

### Goal
Design the HomeU admin backend so it feels like a professional internal operating system, not a generic CMS.

### Core Admin Areas
Dashboard | Products | Collections | RFQ Cart / Quotations | Customers / Leads | Chat Inbox | Showroom Appointments | Media Library | SEO Manager | AI Suggestions | Settings

### Layout Rules
- Persistent left sidebar on desktop
- Top bar for search, notifications, user menu, environment badge
- Cards for high-level metrics
- Tables for records
- Drawers/sheets for quick edits
- Modals used sparingly

### shadcn Components for Admin
Sidebar, Card, Table, Tabs, Dropdown Menu, Command palette, Sheet, Dialog, Badge, Button, Input, Select, Toast/Sonner

### Admin Dashboard Widgets
- Pending RFQs count + quick link
- New chat leads this week
- Product import status
- SEO issues summary
- Broken links alert
- Top viewed products
- Appointments this week
- AI recommendations pending review

### AI Safety Workflow
Always include status labels: `Draft → Needs Review → Approved → Published → Rejected`
AI must never auto-publish risky code/content changes.

### Suggested File Structure
```
app/(admin)/admin/layout.tsx
app/(admin)/admin/page.tsx
components/admin/AdminShell.tsx
components/admin/AdminSidebar.tsx
components/admin/AdminTopbar.tsx
components/admin/DashboardMetricCard.tsx
components/admin/RecentRFQsTable.tsx
components/admin/AISuggestionsPanel.tsx
components/admin/StatusBadge.tsx
```

### AI Prompt
Create a HomeU admin dashboard layout using Next.js, Tailwind, shadcn/ui sidebar, cards, tables, tabs, and command menu. The backend is for a furniture catalog/RFQ business. Include navigation for Products, RFQs, Chat Inbox, Appointments, SEO, Media, AI Suggestions, and Settings. Make it premium, warm, calm, and business-like. Prioritize clarity over flashy animation.

---

## Section 3: Frontend Design System

### Goal
Make HomeU frontend pages look premium, consistent, and easy for AI to extend.

### Page Patterns

**Homepage:**
- Full-width hero with large room/furniture image
- Collection tiles
- Featured products
- Architect/designer CTA
- Showroom booking CTA

**Product Page:**
- Large gallery
- Product title, category, dimensions, materials
- Reference price if enabled
- Add to RFQ button
- Ask about this item CTA
- Similar products

**Collection Page:**
- Strong visual header
- Filters: category, material, color, size, style, availability
- Grid cards with consistent ratios

**Landing Page:**
- Hero → Problem/solution → Product/service blocks → Gallery → FAQ → CTA

### Component Rules
- Use shadcn for functional UI (buttons, forms, tables, modals)
- Use Aceternity/Magic UI only for hero sections, hover effects, backgrounds, premium animated sections
- Never overuse motion on product browsing pages
- Images are more important than animation

### AI Prompt
When building HomeU frontend pages, use an editorial luxury furniture design language. Prioritize large photography, whitespace, clean typography, and simple RFQ conversion. Use shadcn/ui as the component base and only add Magic UI or Aceternity effects when they improve perceived quality without hurting speed.

---

## Design Resources Location

All design reference materials are available at:
```
design-resources/davincios-design-skills/
├── README.md                    # Overview
├── prompts/
│   └── master-design-agent-prompt.md
├── skills/
│   ├── admin-backend-designer.md
│   ├── login-section-designer.md
│   └── frontend-design-system.md
├── checklists/
│   ├── login-ui-checklist.md
│   └── admin-backend-checklist.md
├── examples/
│   ├── login-page-file-structure.md
│   └── admin-file-structure.md
└── references/
    └── github-design-references.md
```

## Development Commands

```bash
# Run dev server
cd apps/website && npm run dev

# Build
cd apps/website && npm run build

# Lint
cd apps/website && npm run lint
```

## Verification Checklist (Complete Before Marking Done)

- [ ] Mobile responsive
- [ ] All required UX states handled (loading, empty, error, edge cases)
- [ ] SEO preserved (meta tags, headings, structured data)
- [ ] shadcn/ui components used where appropriate
- [ ] No hardcoded credentials or secrets
- [ ] Keyboard accessible
- [ ] Good color contrast
- [ ] Fast load time (minimal unnecessary animation)
- [ ] Consistent with HomeU brand identity
- [ ] Logged to centralized task log
