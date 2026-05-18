ALTER TABLE "kanban_tasks" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "category" text;

CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "theme" text DEFAULT 'system' NOT NULL,
  "notifications_enabled" boolean DEFAULT true NOT NULL,
  "email_notifications_enabled" boolean DEFAULT false NOT NULL,
  "default_calendar_view" text DEFAULT 'month' NOT NULL,
  "default_task_priority" text DEFAULT 'medium' NOT NULL,
  "auto_save_enabled" boolean DEFAULT true NOT NULL,
  "privacy_mode_enabled" boolean DEFAULT false NOT NULL,
  "two_factor_reminder_dismissed" boolean DEFAULT false NOT NULL,
  "ai_model" text DEFAULT 'gemini-3.1-flash-lite' NOT NULL,
  "ai_behavior" text DEFAULT 'balanced' NOT NULL,
  "ai_tone" text DEFAULT 'Friendly' NOT NULL,
  "ai_refine_enabled" boolean DEFAULT true NOT NULL,
  "ai_assistant_enabled" boolean DEFAULT true NOT NULL,
  "ai_template_builder_enabled" boolean DEFAULT true NOT NULL,
  "ai_diagram_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_id_unique" ON "user_settings" ("user_id");

CREATE TABLE IF NOT EXISTS "user_categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "scope" text NOT NULL,
  "name" text NOT NULL,
  "color" text DEFAULT '#5BAE91' NOT NULL,
  "icon" text DEFAULT 'Tag' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_categories_user_scope_name_unique" ON "user_categories" ("user_id", "scope", "name");

CREATE TABLE IF NOT EXISTS "user_ai_usage" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "usage_date" text NOT NULL,
  "action_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_ai_usage_user_date_unique" ON "user_ai_usage" ("user_id", "usage_date");
