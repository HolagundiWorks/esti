CREATE TABLE IF NOT EXISTS "esti_account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_expense" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ref" text NOT NULL UNIQUE,
  "scope" text NOT NULL,
  "project_id" uuid,
  "billing_class" text DEFAULT 'NON_BILLABLE' NOT NULL,
  "category" text NOT NULL,
  "payment_method" text NOT NULL,
  "account_id" uuid NOT NULL,
  "amount_paise" bigint NOT NULL,
  "expense_date" date NOT NULL,
  "payee" text,
  "description" text,
  "receipt_key" text,
  "status" text DEFAULT 'DRAFT' NOT NULL,
  "recovery_status" text DEFAULT 'NA' NOT NULL,
  "recovered_on_invoice_id" uuid,
  "submitted_by_id" uuid,
  "audited_by_id" uuid,
  "closed_by_id" uuid,
  "audited_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "esti_expense" ADD CONSTRAINT "esti_expense_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "esti_expense" ADD CONSTRAINT "esti_expense_account_id_esti_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."esti_account"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "esti_expense" ADD CONSTRAINT "esti_expense_recovered_on_invoice_id_esti_invoice_id_fk" FOREIGN KEY ("recovered_on_invoice_id") REFERENCES "public"."esti_invoice"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "esti_expense" ADD CONSTRAINT "esti_expense_submitted_by_id_esti_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."esti_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "esti_expense" ADD CONSTRAINT "esti_expense_audited_by_id_esti_user_id_fk" FOREIGN KEY ("audited_by_id") REFERENCES "public"."esti_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "esti_expense" ADD CONSTRAINT "esti_expense_closed_by_id_esti_user_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "public"."esti_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_expense_scope_idx" ON "esti_expense" ("scope");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_expense_project_id_idx" ON "esti_expense" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esti_expense_status_idx" ON "esti_expense" ("status");
--> statement-breakpoint
INSERT INTO "esti_account" ("code", "name", "kind", "is_system")
VALUES
  ('MAIN', 'Main operating', 'OPERATING', true),
  ('OFFICE_EXPENSE', 'Office expenses', 'EXPENSE', true),
  ('CASH', 'Cash / petty cash', 'CASH', true),
  ('PROJECT_EXPENSE', 'Project expenses', 'EXPENSE', true)
ON CONFLICT ("code") DO NOTHING;
