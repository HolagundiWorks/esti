CREATE TABLE IF NOT EXISTS "hlp_account" (
	"id" text PRIMARY KEY NOT NULL,
	"google_sub" text,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hlp_api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hlp_device" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"device_id" text NOT NULL,
	"fingerprint" text,
	"name" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"sync_token_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hlp_feature_flag" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"feature_code" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hlp_license_event" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"type" text NOT NULL,
	"actor" text,
	"meta" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hlp_license_seat" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"account_id" text,
	"email" text,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hlp_license" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"product_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"key" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"seats" integer,
	"device_limit" integer,
	"meter_limit" integer,
	"expires_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hlp_org_member" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"account_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hlp_organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"billing_email" text,
	"owner_account_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hlp_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"seats" integer,
	"device_limit" integer,
	"meter_limit" integer,
	"meter_unit" text DEFAULT 'seats' NOT NULL,
	"feature_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hlp_product" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_api_key" ADD CONSTRAINT "hlp_api_key_product_id_hlp_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."hlp_product"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_device" ADD CONSTRAINT "hlp_device_license_id_hlp_license_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."hlp_license"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_feature_flag" ADD CONSTRAINT "hlp_feature_flag_license_id_hlp_license_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."hlp_license"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_license_event" ADD CONSTRAINT "hlp_license_event_license_id_hlp_license_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."hlp_license"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_license_seat" ADD CONSTRAINT "hlp_license_seat_license_id_hlp_license_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."hlp_license"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_license_seat" ADD CONSTRAINT "hlp_license_seat_account_id_hlp_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."hlp_account"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_license" ADD CONSTRAINT "hlp_license_org_id_hlp_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."hlp_organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_license" ADD CONSTRAINT "hlp_license_product_id_hlp_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."hlp_product"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_license" ADD CONSTRAINT "hlp_license_plan_id_hlp_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."hlp_plan"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_org_member" ADD CONSTRAINT "hlp_org_member_org_id_hlp_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."hlp_organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_org_member" ADD CONSTRAINT "hlp_org_member_account_id_hlp_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."hlp_account"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_organization" ADD CONSTRAINT "hlp_organization_owner_account_id_hlp_account_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."hlp_account"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hlp_plan" ADD CONSTRAINT "hlp_plan_product_id_hlp_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."hlp_product"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_account_email_idx" ON "hlp_account" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_account_google_sub_idx" ON "hlp_account" USING btree ("google_sub");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_api_key_hash_idx" ON "hlp_api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_device_idx" ON "hlp_device" USING btree ("license_id","device_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_feature_flag_idx" ON "hlp_feature_flag" USING btree ("license_id","feature_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_license_key_idx" ON "hlp_license" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_org_member_idx" ON "hlp_org_member" USING btree ("org_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_organization_slug_idx" ON "hlp_organization" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_plan_idx" ON "hlp_plan" USING btree ("product_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hlp_product_code_idx" ON "hlp_product" USING btree ("code");