CREATE TABLE IF NOT EXISTS "generated_apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"app_name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text DEFAULT 'LayoutTemplate' NOT NULL,
	"color" text DEFAULT '#F97316' NOT NULL,
	"layout" text DEFAULT 'single-page' NOT NULL,
	"definition" jsonb NOT NULL,
	"app_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_in_sidebar" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "generated_apps" ADD CONSTRAINT "generated_apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
