-- Ensure admin OTP verification exists in every environment and can be
-- purpose-bound and consumed by the protected server-side operation.

CREATE TABLE IF NOT EXISTS otp_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  code VARCHAR(255) NOT NULL,
  purpose VARCHAR(64) NOT NULL DEFAULT 'generic',
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(64) NOT NULL DEFAULT 'generic',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS otp_codes_active_lookup_idx
  ON otp_codes (email, purpose, created_at DESC)
  WHERE used = FALSE;
