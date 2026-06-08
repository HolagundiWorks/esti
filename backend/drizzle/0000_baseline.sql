CREATE TABLE IF NOT EXISTS "esti_approval" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"title" text NOT NULL,
	"recipient" text,
	"channel" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"sent_date" date,
	"response_date" date,
	"remarks" text,
	"supersedes_id" uuid,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"team_member_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"action" text NOT NULL,
	"actor_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bbs_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bbs_id" uuid NOT NULL,
	"bar_mark" text NOT NULL,
	"member" text,
	"dia_mm" integer NOT NULL,
	"no_of_members" integer DEFAULT 1 NOT NULL,
	"bars_per_member" integer DEFAULT 1 NOT NULL,
	"cutting_length_mm" double precision DEFAULT 0 NOT NULL,
	"weight_kg" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bbs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bylaw_calc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_bylaw_calc_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_bylaw" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parameter" text NOT NULL,
	"unit" text NOT NULL,
	"direction" text NOT NULL,
	"permitted_value" double precision,
	"proposed_value" double precision,
	"clause" text,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_clientlog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"client_id" uuid,
	"kind" text NOT NULL,
	"occurred_at" date NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"follow_up_date" date,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'INDIVIDUAL' NOT NULL,
	"gstin" text,
	"pan" text,
	"state" text,
	"city" text,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_consultant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"discipline" text NOT NULL,
	"firm" text,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_drawing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"file_hash" text NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"svg_key" text,
	"entity_count" integer DEFAULT 0 NOT NULL,
	"layers" jsonb,
	"bounds" jsonb,
	"scale_units_per_vb" double precision,
	"scale_unit" text,
	"issue_pdf_key" text,
	"issue_pdf_status" text DEFAULT 'NONE' NOT NULL,
	"error_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_drawing_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_dsr_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"rate_paise" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_dsr_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_dsr_version_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_engagement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"consultant_id" uuid NOT NULL,
	"scope" text,
	"agreed_fee_paise" bigint DEFAULT 0 NOT NULL,
	"paid_paise" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ENGAGED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_estimate_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estimate_id" uuid NOT NULL,
	"dsr_item_id" uuid,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"qty" double precision DEFAULT 0 NOT NULL,
	"rate_paise" bigint DEFAULT 0 NOT NULL,
	"item_lead_pct" double precision DEFAULT 0 NOT NULL,
	"amount_paise" bigint DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_estimate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"dsr_version_id" uuid,
	"lead_pct" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"subtotal_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_estimate_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_feeproposal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"revision_no" integer DEFAULT 0 NOT NULL,
	"work_category" text NOT NULL,
	"cost_of_works_paise" bigint DEFAULT 0 NOT NULL,
	"fee_paise" bigint DEFAULT 0 NOT NULL,
	"doc_comm_pct" integer DEFAULT 10 NOT NULL,
	"coa_minimum_paise" bigint DEFAULT 0 NOT NULL,
	"below_minimum" boolean DEFAULT false NOT NULL,
	"override_reason" text,
	"scope" text,
	"pdf_key" text,
	"pdf_status" text DEFAULT 'NONE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_feeproposal_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_firm" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text DEFAULT 'Holagundi Consulting Works' NOT NULL,
	"firm_type" text DEFAULT 'SOLO' NOT NULL,
	"logo_key" text,
	"gst_type" text DEFAULT 'REGULAR' NOT NULL,
	"gstin" text,
	"tds_applicable_default" boolean DEFAULT true NOT NULL,
	"architect_name" text,
	"coa_reg_no" text,
	"pan" text,
	"email" text,
	"phone1_type" text,
	"phone1" text,
	"phone2_type" text,
	"phone2" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"pincode" text,
	"district" text,
	"state" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid NOT NULL,
	"phase_id" uuid,
	"client_id" uuid,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"gst_system" text NOT NULL,
	"document_kind" text NOT NULL,
	"sac" text,
	"inter_state" boolean DEFAULT false NOT NULL,
	"tds_applicable" boolean DEFAULT true NOT NULL,
	"taxable_paise" bigint DEFAULT 0 NOT NULL,
	"cgst_paise" bigint DEFAULT 0 NOT NULL,
	"sgst_paise" bigint DEFAULT 0 NOT NULL,
	"igst_paise" bigint DEFAULT 0 NOT NULL,
	"gst_total_paise" bigint DEFAULT 0 NOT NULL,
	"composition_levy_paise" bigint DEFAULT 0 NOT NULL,
	"tds_paise" bigint DEFAULT 0 NOT NULL,
	"grand_total_paise" bigint DEFAULT 0 NOT NULL,
	"net_receivable_paise" bigint DEFAULT 0 NOT NULL,
	"date_invoice" date,
	"notes" text,
	"pdf_key" text,
	"pdf_status" text DEFAULT 'NONE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_invoice_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_leave" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" uuid NOT NULL,
	"type" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"days" double precision DEFAULT 0 NOT NULL,
	"reason" text,
	"status" text DEFAULT 'REQUESTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_measurement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drawing_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text NOT NULL,
	"kind" text DEFAULT 'LINEAR' NOT NULL,
	"vb_length" double precision DEFAULT 0 NOT NULL,
	"real_length" double precision DEFAULT 0 NOT NULL,
	"unit" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_orgsettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hr_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_partner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"coa_reg_no" text,
	"pan" text,
	"din" text,
	"email" text,
	"phone1_type" text,
	"phone1" text,
	"phone2_type" text,
	"phone2" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"pincode" text,
	"district" text,
	"state" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_payslip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" uuid NOT NULL,
	"month" text NOT NULL,
	"gross_paise" bigint DEFAULT 0 NOT NULL,
	"deductions_paise" bigint DEFAULT 0 NOT NULL,
	"net_paise" bigint DEFAULT 0 NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_date" date,
	"notes" text,
	"pdf_key" text,
	"pdf_status" text DEFAULT 'NONE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_permit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid NOT NULL,
	"permit_type" text NOT NULL,
	"authority" text NOT NULL,
	"application_no" text,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"date_submitted" date,
	"date_due" date,
	"date_approved" date,
	"portal_url" text,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_permit_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_phase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"billing_pct" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"date_planned" date,
	"date_actual" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_projectlog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"note" text NOT NULL,
	"author_id" uuid,
	"author_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_projectoffice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"title" text NOT NULL,
	"project_type" text NOT NULL,
	"jurisdiction" text DEFAULT 'OTHER' NOT NULL,
	"status" text DEFAULT 'ENQUIRY' NOT NULL,
	"client_id" uuid,
	"state" text,
	"district" text,
	"city" text,
	"pin" text,
	"site_address" text,
	"site_area_sqm" double precision,
	"contract_value_paise" bigint DEFAULT 0 NOT NULL,
	"date_start" date,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_projectoffice_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_reconcile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"label" text NOT NULL,
	"file_name" text NOT NULL,
	"file_hash" text NOT NULL,
	"storage_key" text NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"matched_count" integer DEFAULT 0 NOT NULL,
	"unmatched_count" integer DEFAULT 0 NOT NULL,
	"total_credit_paise" bigint DEFAULT 0 NOT NULL,
	"matched_credit_paise" bigint DEFAULT 0 NOT NULL,
	"lines" jsonb,
	"error_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_reconcile_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_sequence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"fy" text NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"project_id" uuid,
	"assignee" text,
	"status" text DEFAULT 'TODO' NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"due_date" date,
	"created_by_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_teammember" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"employment_type" text NOT NULL,
	"email" text,
	"phone" text,
	"monthly_salary_paise" bigint DEFAULT 0 NOT NULL,
	"date_joined" date,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_transmittal_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transmittal_id" uuid NOT NULL,
	"drawing_id" uuid,
	"drawing_ref" text NOT NULL,
	"title" text NOT NULL,
	"rev" text,
	"copies" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_transmittal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"project_id" uuid NOT NULL,
	"recipient" text NOT NULL,
	"purpose" text NOT NULL,
	"channel" text NOT NULL,
	"date_issued" date,
	"notes" text,
	"pdf_key" text,
	"pdf_status" text DEFAULT 'NONE' NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_transmittal_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "esti_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text DEFAULT 'CONSULTANT' NOT NULL,
	"password_hash" text,
	"totp_secret" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"client_id" uuid,
	"consultant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "esti_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_approval" ADD CONSTRAINT "esti_approval_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_approval" ADD CONSTRAINT "esti_approval_created_by_id_esti_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_assignment" ADD CONSTRAINT "esti_assignment_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_assignment" ADD CONSTRAINT "esti_assignment_team_member_id_esti_teammember_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."esti_teammember"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_bbs_item" ADD CONSTRAINT "esti_bbs_item_bbs_id_esti_bbs_id_fk" FOREIGN KEY ("bbs_id") REFERENCES "public"."esti_bbs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_bbs" ADD CONSTRAINT "esti_bbs_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_bylaw_calc" ADD CONSTRAINT "esti_bylaw_calc_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_bylaw" ADD CONSTRAINT "esti_bylaw_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_clientlog" ADD CONSTRAINT "esti_clientlog_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_clientlog" ADD CONSTRAINT "esti_clientlog_client_id_esti_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."esti_client"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_clientlog" ADD CONSTRAINT "esti_clientlog_created_by_id_esti_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_drawing" ADD CONSTRAINT "esti_drawing_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_dsr_item" ADD CONSTRAINT "esti_dsr_item_version_id_esti_dsr_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."esti_dsr_version"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_engagement" ADD CONSTRAINT "esti_engagement_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_engagement" ADD CONSTRAINT "esti_engagement_consultant_id_esti_consultant_id_fk" FOREIGN KEY ("consultant_id") REFERENCES "public"."esti_consultant"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_estimate_item" ADD CONSTRAINT "esti_estimate_item_estimate_id_esti_estimate_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."esti_estimate"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_estimate_item" ADD CONSTRAINT "esti_estimate_item_dsr_item_id_esti_dsr_item_id_fk" FOREIGN KEY ("dsr_item_id") REFERENCES "public"."esti_dsr_item"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_estimate" ADD CONSTRAINT "esti_estimate_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_estimate" ADD CONSTRAINT "esti_estimate_dsr_version_id_esti_dsr_version_id_fk" FOREIGN KEY ("dsr_version_id") REFERENCES "public"."esti_dsr_version"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_feeproposal" ADD CONSTRAINT "esti_feeproposal_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_invoice" ADD CONSTRAINT "esti_invoice_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_invoice" ADD CONSTRAINT "esti_invoice_phase_id_esti_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."esti_phase"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_invoice" ADD CONSTRAINT "esti_invoice_client_id_esti_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."esti_client"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_leave" ADD CONSTRAINT "esti_leave_team_member_id_esti_teammember_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."esti_teammember"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_measurement" ADD CONSTRAINT "esti_measurement_drawing_id_esti_drawing_id_fk" FOREIGN KEY ("drawing_id") REFERENCES "public"."esti_drawing"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_measurement" ADD CONSTRAINT "esti_measurement_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_payslip" ADD CONSTRAINT "esti_payslip_team_member_id_esti_teammember_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."esti_teammember"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_permit" ADD CONSTRAINT "esti_permit_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_phase" ADD CONSTRAINT "esti_phase_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_projectlog" ADD CONSTRAINT "esti_projectlog_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_projectoffice" ADD CONSTRAINT "esti_projectoffice_client_id_esti_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."esti_client"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_session" ADD CONSTRAINT "esti_session_user_id_esti_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."esti_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_task" ADD CONSTRAINT "esti_task_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_transmittal_item" ADD CONSTRAINT "esti_transmittal_item_transmittal_id_esti_transmittal_id_fk" FOREIGN KEY ("transmittal_id") REFERENCES "public"."esti_transmittal"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "esti_transmittal" ADD CONSTRAINT "esti_transmittal_project_id_esti_projectoffice_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."esti_projectoffice"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "esti_payslip_member_month" ON "esti_payslip" USING btree ("team_member_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "esti_sequence_scope_fy" ON "esti_sequence" USING btree ("scope","fy");