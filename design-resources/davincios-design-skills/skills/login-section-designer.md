# Skill: Login Section Designer

## Goal
Create a premium, trustworthy login section for DaVinciOS admin and staff portals.

## Best style for HomeU
Luxury furniture / architecture backend, not childish SaaS. Use:
- Warm neutral background: ivory, stone, charcoal, soft gold accents.
- Large visual panel on desktop: showroom, furniture detail, marble/wood texture, or abstract DaVinciOS pattern.
- Clean login card: email, password, forgot password, optional magic link later.
- No excessive animation on login. Login must feel fast, stable, and secure.

## Recommended structure
Desktop:
- Left 45% brand/story panel.
- Right 55% login card centered.

Mobile:
- Brand mark at top.
- Login card full width.
- Hide large image panel.

## Components to use
- shadcn Card, Button, Input, Label, Separator, Alert.
- Optional Magic UI subtle border beam only if performance is fine.
- Avoid heavy Aceternity animation on auth pages.

## Required UX states
- Empty state validation.
- Invalid credentials error.
- Loading state with disabled button.
- Password visibility toggle.
- Forgot password link.
- Admin/support contact line.

## Security rules
- Never hardcode admin emails/passwords.
- Never expose backend secrets in frontend.
- Rate-limit login on backend.
- Show generic error: "Invalid email or password." Do not reveal whether email exists.

## AI prompt for coding extension
Build a DaVinciOS admin login page using Next.js, React, Tailwind, and shadcn/ui. Create an original luxury furniture-inspired layout. Use a two-column desktop layout and single-column mobile layout. Include email/password fields, loading state, password visibility toggle, error alert, forgot password link, and HomeU/DaVinciOS branding. Do not copy any external template exactly. Keep code modular with LoginForm.tsx and LoginPageShell.tsx.
