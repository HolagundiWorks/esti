-- Studio › Libraries › Compliance Library: reference document uploads
CREATE TABLE esti_compliance_doc (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  category    text NOT NULL,
  file_name   text NOT NULL,
  file_key    text NOT NULL,
  file_type   text NOT NULL DEFAULT 'PDF',
  notes       text,
  uploaded_by_id uuid REFERENCES esti_user(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
