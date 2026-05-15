ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "liveblocks_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_liveblocks_id_unique" ON "users" ("liveblocks_id");

CREATE TABLE IF NOT EXISTS "kanban_board_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"invited_by_user_id" integer NOT NULL,
	"accepted_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "kanban_board_shares_board_email_unique" ON "kanban_board_shares" ("board_id", "email");

DO $$ BEGIN
 ALTER TABLE "kanban_board_shares" ADD CONSTRAINT "kanban_board_shares_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "kanban_boards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "kanban_board_shares" ADD CONSTRAINT "kanban_board_shares_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "kanban_board_shares" ADD CONSTRAINT "kanban_board_shares_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
