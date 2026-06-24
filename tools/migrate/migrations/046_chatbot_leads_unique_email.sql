-- Prevents the duplicate-lead race condition: two concurrent chat-init
-- requests could both pass the "no existing lead for this email" check
-- in POST /api/chat/leads before either INSERT completed, creating
-- multiple chatbot.leads rows for the same visitor (seen in production:
-- 28 duplicate rows for one test account). A unique index on lower(email)
-- makes the second concurrent insert fail loudly instead of silently
-- duplicating, and the existing application-level dedup logic continues
-- to handle the common (non-racing) case.

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_unique ON chatbot.leads (LOWER(email));
