-- Estimation review follow-up.
--
-- 0201 shipped the estimation tables with no indexes at all, so every estimate
-- list, item fetch and measurement rollup was a sequential scan that grows with
-- the whole firm's history rather than the project being looked at.
CREATE INDEX IF NOT EXISTS esti_estimate_project_idx
  ON esti_estimate (project_id);
CREATE INDEX IF NOT EXISTS esti_estimate_item_estimate_idx
  ON esti_estimate_item (estimate_id);
CREATE INDEX IF NOT EXISTS esti_estimate_measurement_item_idx
  ON esti_estimate_measurement (estimate_item_id);
CREATE INDEX IF NOT EXISTS esti_rate_book_item_book_idx
  ON esti_rate_book_item (rate_book_id);

-- An item code must identify one rate within a book. Without this two rows in
-- "PWD SR 2024-25" could both be code 1.2.3 at different rates, and which one
-- priced a BOQ line came down to which row the user happened to click.
-- Partial: item_code is nullable and several rows may legitimately have none.
CREATE UNIQUE INDEX IF NOT EXISTS esti_rate_book_item_code_uniq
  ON esti_rate_book_item (rate_book_id, item_code)
  WHERE item_code IS NOT NULL;
