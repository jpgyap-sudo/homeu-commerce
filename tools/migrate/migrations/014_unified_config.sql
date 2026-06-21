-- 014_unified_config.sql
-- Seeds default application config into DaVinciOS_kv table.
-- Ensures the admin settings UI works immediately with existing values.

BEGIN;

-- Store config
INSERT INTO "DaVinciOS_kv" (key, data)
SELECT 'app_config_store',
  jsonb_build_object(
    'name', 'Home Atelier',
    'displayName', 'Home Atelier',
    'email', 'hello@homeu.ph',
    'phone', '+63 2 8123 4567',
    'address', 'Manila, Philippines',
    'currency', 'PHP (₱)',
    'timezone', 'Asia/Manila (UTC+8)',
    'bankDetails', 'Bank: Eastwest Bank\nAccount Name: Home Atelier\nAccount Number: (set in admin settings)'
  )
WHERE NOT EXISTS (SELECT 1 FROM "DaVinciOS_kv" WHERE key = 'app_config_store');

-- Messaging config
INSERT INTO "DaVinciOS_kv" (key, data)
SELECT 'app_config_messaging',
  jsonb_build_object(
    'telegramBotToken', '',
    'telegramChatId', '',
    'viberNumber', '+639171234567',
    'viberName', 'HomeU Sales Team',
    'enableChat', true,
    'greetingDelay', 4000,
    'productPageDelay', 7000
  )
WHERE NOT EXISTS (SELECT 1 FROM "DaVinciOS_kv" WHERE key = 'app_config_messaging');

COMMIT;
