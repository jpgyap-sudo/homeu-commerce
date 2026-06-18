# Appointment Booking App — Skill

## Business Goal
Allow customers to book showroom/design consultation appointments directly on the storefront. Reduce friction in the sales process by letting customers self-schedule.

## Target Users
- Homeowners wanting to visit the showroom
- Architects/designers needing a consultation
- Contractors discussing bulk/wholesale

## Data Model
```sql
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR,
  customer_email VARCHAR,
  customer_phone VARCHAR,
  preferred_date DATE,
  preferred_time TIME,
  service_type VARCHAR,          -- showroom_visit | design_consultation | measurement
  notes TEXT,
  status VARCHAR DEFAULT 'pending', -- pending | confirmed | completed | cancelled
  assigned_to INTEGER,           -- staff user ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints
```
POST /api/appointments            — Customer booking (public, rate-limited)
GET  /api/admin/appointments      — Staff listing (admin auth)
PATCH /api/admin/appointments/:id — Update status (admin auth)
```

## Admin UI
- `/admin/collections/appointments` — Calendar + list view
- Status: Pending → Confirm → Complete → Cancel
- Assign to staff member

## Frontend Widget
- "Book a Showroom Visit" button on homepage + product pages
- Form: Name, Email, Phone, Preferred Date/Time, Service Type
- Calendar picker for date selection

## Conversion Flow
```
Widget → Date/Time picker → Confirm → Thank you page
                                   ↓
                           Admin notified (Telegram)
                                   ↓
                           Staff confirms booking
                                   ↓
                           Customer notified (email/SMS)
```

## Security
- Rate limit: 3 submissions per IP per hour
- Captcha/Honeypot for spam prevention
- Zod validation on all inputs
- Admin auth via getSession()
