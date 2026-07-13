-- 0196 — SOP slice 3: comment resolution sheet (CRS) per deliverable submission.
CREATE TABLE IF NOT EXISTS esti_cons_review_comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid NOT NULL REFERENCES esti_cons_deliverable(id) ON DELETE CASCADE,
  revision text NOT NULL,
  reviewer text NOT NULL,
  comment text NOT NULL,
  response text,
  status text NOT NULL DEFAULT 'OPEN',
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esti_cons_review_comment_del_idx
  ON esti_cons_review_comment(deliverable_id);
