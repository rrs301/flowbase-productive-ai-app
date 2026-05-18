ALTER TABLE "generated_apps" ADD COLUMN IF NOT EXISTS "app_state" jsonb DEFAULT '{}'::jsonb NOT NULL;
