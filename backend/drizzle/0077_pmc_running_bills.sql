CREATE TABLE IF NOT EXISTS "esti_running_bill" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ref" text NOT NULL UNIQUE,
  "project_id" uuid NOT NULL REFERENCES "esti_projectoffice"("id") ON DELETE cascade,
  "contractor_id" uuid REFERENCES "esti_contractor"("id") ON DELETE set null,
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'MEASURED',
  "measurement_date" date,
  "notes" text,
  "total_paise" bigint NOT NULL DEFAULT 0,
  "status_history" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_by_id" uuid REFERENCES "esti_user"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "esti_running_bill_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "running_bill_id" uuid NOT NULL REFERENCES "esti_running_bill"("id") ON DELETE cascade,
  "description" text NOT NULL,
  "unit" text NOT NULL,
  "qty" double precision NOT NULL DEFAULT 0,
  "rate_paise" bigint NOT NULL DEFAULT 0,
  "amount_paise" bigint NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "esti_running_bill_project_idx"
  ON "esti_running_bill" ("project_id", "created_at");

CREATE INDEX IF NOT EXISTS "esti_running_bill_status_idx"
  ON "esti_running_bill" ("status");
