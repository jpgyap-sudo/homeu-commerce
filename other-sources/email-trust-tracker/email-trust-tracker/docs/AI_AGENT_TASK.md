# Coding Agent Task: Add Email Trust Tracker to DaVinciOS

## Rule

Do not copy code from external repositories. Use this package as the original starter implementation.

## Goal

Add an email trust and lead scoring module that helps HomeU avoid spam issues and identify hot leads.

## Required features

1. Customer email verification status.
2. Separate marketing consent field.
3. VCF contact card download button.
4. Email open tracking pixel.
5. Click tracking redirect.
6. Website intent tracking:
   - product view
   - RFQ add
   - RFQ submitted
   - appointment booked
7. Admin dashboard:
   - sent
   - opens
   - clicks
   - RFQs
   - appointments
   - lead score
8. Privacy-safe IP hashing.
9. No automatic Gmail contact insertion.
10. Human approval before any production email blast.

## Suggested merge path

- Keep this as a standalone service first.
- Integrate with DaVinciOS only after testing.
- Use `mail.homeu.ph` as the tracking domain.
- Use Amazon SES/Postmark/Mailgun/Brevo as the sender.
- Do not send bulk email directly from the VPS.

## Acceptance tests

- Registration creates a customer.
- A sent email creates a message record.
- Pixel URL records one open event.
- Click URL records one click event and redirects safely.
- Contact button downloads VCF.
- Product view event is saved.
- RFQ submit event increases lead score.
- Dashboard displays updated stats.
