-- OTP authentication for account creation, new-device login, and change password
-- Extends otp_codes table (created in migration 033) and customers table.

-- Add known_devices to customers table for tracking trusted devices
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
    BEGIN
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS known_devices JSONB NOT NULL DEFAULT '[]'::jsonb;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    BEGIN
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS otp_pending_email VARCHAR(320);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    BEGIN
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS otp_pending_name VARCHAR(255);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    BEGIN
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS otp_pending_phone VARCHAR(50);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    BEGIN
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS otp_pending_data JSONB;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    BEGIN
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS otp_pending_expires_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
  END IF;
END $$;

-- Index for pending OTP purposes
DO $$
BEGIN
  DROP INDEX IF EXISTS otp_codes_registration_lookup_idx;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'otp_codes') THEN
    CREATE INDEX IF NOT EXISTS otp_codes_registration_lookup_idx
      ON otp_codes (email, purpose, created_at DESC)
      WHERE used = FALSE AND purpose IN ('registration', 'login_new_device', 'change_password');
  END IF;
END $$;
