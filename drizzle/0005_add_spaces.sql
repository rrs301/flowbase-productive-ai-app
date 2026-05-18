CREATE TABLE IF NOT EXISTS "spaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT 'violet' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "space_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"invited_by_user_id" integer NOT NULL,
	"accepted_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "space_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"space_id" integer NOT NULL,
	"title" text NOT NULL,
	"template" text DEFAULT 'Blank Page' NOT NULL,
	"page_type" text DEFAULT 'Document' NOT NULL,
	"description" text,
	"content" jsonb NOT NULL,
	"plain_text" text DEFAULT '' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"updated_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "page_task_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "page_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"user_id" integer,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "spaces" ADD CONSTRAINT "spaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "space_shares" ADD CONSTRAINT "space_shares_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "space_shares" ADD CONSTRAINT "space_shares_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "space_shares" ADD CONSTRAINT "space_shares_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "space_pages" ADD CONSTRAINT "space_pages_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "space_pages" ADD CONSTRAINT "space_pages_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "page_task_links" ADD CONSTRAINT "page_task_links_page_id_space_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "space_pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "page_task_links" ADD CONSTRAINT "page_task_links_task_id_kanban_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "kanban_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_page_id_space_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "space_pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "space_shares_space_email_unique" ON "space_shares" USING btree ("space_id","email");
CREATE UNIQUE INDEX IF NOT EXISTS "page_task_links_page_task_unique" ON "page_task_links" USING btree ("page_id","task_id");
