CREATE TABLE IF NOT EXISTS "calendar_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"item_type" text DEFAULT 'task' NOT NULL,
	"category" text DEFAULT 'work' NOT NULL,
	"scheduled_date" text,
	"scheduled_time" text,
	"is_draft" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "calendar_items" ADD CONSTRAINT "calendar_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
