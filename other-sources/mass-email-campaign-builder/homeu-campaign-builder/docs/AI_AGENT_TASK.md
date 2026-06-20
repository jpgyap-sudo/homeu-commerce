# Task for Coding Agent

You are adding a from-scratch Mass Email Campaign Builder to DaVinciOS/HomeU.

## Rules

- Do not copy code from Listmonk, Mautic, Mailtrain, Keila, or SendPortal.
- You may study those repos only for architecture ideas.
- Keep Shopify/HomeU live during implementation.
- Use this as a separate service first.
- Require human approval before sending mass campaigns.

## Merge plan

1. Run this package standalone using Docker.
2. Confirm campaign creation, recipient preparation, and test sending.
3. Replace SMTP credentials with production provider.
4. Add auth using DaVinciOS admin login.
5. Connect contacts to HomeU account registration and RFQ forms.
6. Connect website product views to email_events.
7. Add campaign analytics into DaVinciOS admin.
8. Add AI content generator later.

## Safety requirements

- Never send to contacts without marketing_consent=true.
- Never send to suppression_list emails.
- Always include unsubscribe link.
- Add rate limiting.
- Add campaign preview and test send before production.
- Add confirmation modal before bulk sending.
