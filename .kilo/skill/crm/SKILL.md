# CRM (Customer Relationship Management) Skill

## Description
Customer relationship management for HomeU Commerce: customer profiles, RFQ request lifecycle, quotation management, communication tracking, and sales pipeline monitoring.

## Related Skills
- Shopify — E-commerce operations, customer data sync, order management
- Frontend — Customer-facing login, portal, and RFQ submission UI
- Data Sync — Shopify customer data import

## Core Concepts

### Customer Lifecycle
```
Lead (from RFQ) → Registered Customer → Active Buyer → VIP
```

Customers typically start as RFQ submitters (anonymous leads), then register an account to:
1. View product prices
2. Track RFQ status
3. Receive quotations
4. Place repeat requests

### RFQ → Quotation Pipeline
```
RFQ Submitted → Contacted → Quoted → Quotation Sent → Won/Lost
```

**Each stage requires specific actions:**
| Stage | Action | Responsible |
|-------|--------|-------------|
| `new` | Review RFQ details, verify items | Admin |
| `contacted` | Call/email customer, discuss requirements | Sales |
| `quoted` | Prepare pricing proposal, add note to RFQ | Sales |
| `quotation_sent` | Email quotation PDF to customer, mark sent | Sales |
| `closed (won)` | Follow up, note closed won amount | Sales |
| `closed (lost)` | Record reason, add to nurture list | Sales |

## DaVinciOS CMS Collections

### Customers Collection
**Slug**: `customers`
**Admin**: Use as title = `name`

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | text | Yes | Customer's full name |
| `email` | email | Yes | Login credential, unique |
| `phone` | text | Yes | Contact number |
| `password` | text | Yes | Hashed by DaVinciOS auth |
| `address` | text | No | Delivery address |
| `notes` | textarea | No | Internal notes |
| `status` | select | No | `active`, `inactive`, `lead` |
| `relatedRFQs` | relationship | No | Links to RFQ requests |

**Access Control:**
- Create: Public (registration)
- Read: Admin only (list), Customer (own profile)
- Update: Admin, Customer (own profile)
- Delete: Admin only

### RFQRequests Collection (Enhanced)
**Slug**: `rfq-requests`

**Additional fields:**
- `customer` — relationship to `customers` collection (link RFQ to registered customer)
- `quotationSentAt` — date field (when quotation was sent)
- `quotationSentVia` — select: `email`, `phone`, `in-person`
- `quotationNotes` — textarea (internal notes about quotation)
- `closedAt` — date field (when closed)
- `closedReason` — textarea (why lost/won)

**Updated Status Options:**
```
new → contacted → quoted → quotation_sent → closed_won / closed_lost
```

## Dashboard Views (Admin)

### Customers Tab
- List all customers with Name, Email, Phone, Status
- Click to view/edit customer details
- See customer's RFQ history
- Add notes and update status

### RFQ Requests Tab
- List all RFQs with status badges
- Filter by status (new, quoted, quotation_sent, etc.)
- Quick actions: Mark as contacted, Mark as quoted, Send quotation
- View linked customer profile

### Quotation Status Badge Colors
```
new             — 🟡 Yellow (pending review)
contacted       — 🔵 Blue (in progress)
quoted          — 🟣 Purple (prepared)
quotation_sent  — 🟢 Green (sent to customer)
closed_won      — ✅ Green check (converted)
closed_lost     — ❌ Red (lost)
```

## Customer Portal (Frontend)

### Login Page (`/login`)
- Email + password form
- "Register" link for new customers
- Forgot password flow

### Registration Page (`/register`)
- Name, Email, Phone, Password fields
- Creates new customer in DaVinciOS CMS
- Auto-logs in after registration

### Customer Dashboard (`/customer/dashboard`)
- View personal profile
- See product prices (after login)
- View RFQ history with status
- Submit new RFQ

### RFQ Detail Page (`/customer/rfq/[id]`)
- View RFQ items and quantities
- Check current status
- Download quotation (when available)
- Contact support

## Email Templates

### Registration Confirmation
```
Subject: Welcome to HomeU!
Body: Thank you for registering, {name}. You can now browse product prices and track your RFQs.
```

### Quotation Sent
```
Subject: Your HomeU Quotation #{rfqId} is Ready
Body: Your quotation for {itemCount} items is ready. Total: ₱{total}. View your quotation here: {link}
```

### RFQ Status Update
```
Subject: RFQ #{rfqId} Status Update
Body: Your RFQ status has changed to: {status}. Click here to view: {link}
```

## Related Files
- `apps/website/src/collections/Customers.ts` — Customer collection definition
- `apps/website/src/collections/RFQRequests.ts` — Enhanced RFQ collection
- `apps/website/src/app/login/page.tsx` — Customer login page
- `apps/website/src/app/register/page.tsx` — Customer registration page
- `apps/website/src/app/customer/` — Customer portal pages
- `apps/website/src/app/api/rfq/route.ts` — RFQ API endpoint
- `apps/website/src/app/api/auth/` — Authentication API
