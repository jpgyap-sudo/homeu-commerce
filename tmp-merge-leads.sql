BEGIN;

-- Canonical lead = earliest created row per duplicate email group.
CREATE TEMP TABLE lead_merge_map AS
SELECT id AS dup_id, (
  SELECT id FROM chatbot.leads l2
  WHERE LOWER(l2.email) = LOWER(l1.email)
  ORDER BY created_at ASC LIMIT 1
) AS canonical_id
FROM chatbot.leads l1;

-- Re-point every dependent row from duplicate leads to the canonical lead.
UPDATE chatbot.conversations c SET lead_id = m.canonical_id
  FROM lead_merge_map m WHERE c.lead_id = m.dup_id AND m.dup_id <> m.canonical_id;
UPDATE chatbot.uploaded_images c SET lead_id = m.canonical_id
  FROM lead_merge_map m WHERE c.lead_id = m.dup_id AND m.dup_id <> m.canonical_id;
UPDATE chatbot.rfq_carts c SET lead_id = m.canonical_id
  FROM lead_merge_map m WHERE c.lead_id = m.dup_id AND m.dup_id <> m.canonical_id;
UPDATE chatbot.appointments c SET lead_id = m.canonical_id
  FROM lead_merge_map m WHERE c.lead_id = m.dup_id AND m.dup_id <> m.canonical_id;
UPDATE chatbot.lead_scores c SET lead_id = m.canonical_id
  FROM lead_merge_map m WHERE c.lead_id = m.dup_id AND m.dup_id <> m.canonical_id;
UPDATE chatbot.telegram_logs c SET lead_id = m.canonical_id
  FROM lead_merge_map m WHERE c.lead_id = m.dup_id AND m.dup_id <> m.canonical_id;
UPDATE chatbot.lead_ledger_events c SET lead_id = m.canonical_id
  FROM lead_merge_map m WHERE c.lead_id = m.dup_id AND m.dup_id <> m.canonical_id;
UPDATE chatbot.visitor_profiles c SET lead_id = m.canonical_id
  FROM lead_merge_map m WHERE c.lead_id = m.dup_id AND m.dup_id <> m.canonical_id;

-- Consolidate activity stats onto the canonical row before dropping duplicates.
UPDATE chatbot.leads canonical SET
  total_visits = sub.total_visits_sum,
  score = sub.max_score,
  last_seen_at = sub.max_last_seen,
  updated_at = NOW()
FROM (
  SELECT m.canonical_id,
         SUM(l.total_visits) AS total_visits_sum,
         MAX(l.score) AS max_score,
         MAX(l.last_seen_at) AS max_last_seen
  FROM lead_merge_map m
  JOIN chatbot.leads l ON l.id = m.dup_id
  GROUP BY m.canonical_id
) sub
WHERE canonical.id = sub.canonical_id;

-- Now safe to drop the duplicate rows (no dependents reference them anymore).
DELETE FROM chatbot.leads l
USING lead_merge_map m
WHERE l.id = m.dup_id AND m.dup_id <> m.canonical_id;

COMMIT;
