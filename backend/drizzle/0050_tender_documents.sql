CREATE TABLE IF NOT EXISTS "esti_tender_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tender_id" uuid NOT NULL REFERENCES "esti_tender"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'OTHER',
  "file_name" text NOT NULL,
  "storage_key" text NOT NULL,
  "addendum_no" integer,
  "issued_at" date,
  "created_by_id" uuid REFERENCES "esti_user"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "esti_tender_document_ack" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invitation_id" uuid NOT NULL REFERENCES "esti_tender_invitation"("id") ON DELETE CASCADE,
  "document_id" uuid NOT NULL REFERENCES "esti_tender_document"("id") ON DELETE CASCADE,
  "acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "esti_tender_document_ack_inv_doc" UNIQUE ("invitation_id", "document_id")
);
