-- 0194 — SOP slice 1: engagement job numbers, TQ due dates.
ALTER TABLE esti_cons_engagement
  ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE esti_cons_tq
  ADD COLUMN IF NOT EXISTS due_date date;

-- Backfill job numbers for existing engagements (C-YY-serial by creation order).
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM esti_cons_engagement
  WHERE code IS NULL
)
UPDATE esti_cons_engagement e
SET code = 'C-26-' || lpad(n.rn::text, 3, '0')
FROM numbered n
WHERE e.id = n.id;
