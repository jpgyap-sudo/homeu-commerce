ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT;
UPDATE customers SET password_hash = '$2b$10$EG25XfFqF7mLw90WjzWwsevXsrEIShhImmXli6SiZ/EMpZV.sg0xG' WHERE email = 'jpgyap@gmail.com';
SELECT email, length(password_hash) as hlen FROM customers WHERE email = 'jpgyap@gmail.com';
