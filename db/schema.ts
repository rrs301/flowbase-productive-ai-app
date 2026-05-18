import { boolean, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  liveblocksId: text("liveblocks_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  clerkId: text("clerk_id").notNull().unique(),
});

export const calendarItems = pgTable("calendar_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  itemType: text("item_type").notNull().default("task"),
  category: text("category").notNull().default("work"),
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  isDraft: boolean("is_draft").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanBoards = pgTable("kanban_boards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("sage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanColumns = pgTable("kanban_columns", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id")
    .notNull()
    .references(() => kanbanBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanTasks = pgTable("kanban_tasks", {
  id: serial("id").primaryKey(),
  columnId: integer("column_id")
    .notNull()
    .references(() => kanbanColumns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date").notNull(),
  priority: text("priority").notNull().default("medium"),
  category: text("category"),
  labels: jsonb("labels").$type<{ name: string; color: string }[]>().notNull().default([]),
  syncCalendar: boolean("sync_calendar").notNull().default(false),
  linkNotes: boolean("link_notes").notNull().default(false),
  calendarItemId: integer("calendar_item_id").references(() => calendarItems.id, { onDelete: "set null" }),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanBoardShares = pgTable(
  "kanban_board_shares",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => kanbanBoards.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("editor"),
    invitedByUserId: integer("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acceptedUserId: integer("accepted_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("kanban_board_shares_board_email_unique").on(table.boardId, table.email)],
);

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  icon: text("icon").notNull().default("FileText"),
  color: text("color").notNull().default("sage"),
  category: text("category"),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  plainText: text("plain_text").notNull().default(""),
  wordCount: integer("word_count").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  isTrashed: boolean("is_trashed").notNull().default(false),
  trashedAt: timestamp("trashed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const whiteboards = pgTable("whiteboards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("sage"),
  scene: jsonb("scene").$type<Record<string, unknown>>().notNull().default({}),
  files: jsonb("files").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const generatedApps = pgTable("generated_apps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  appName: text("app_name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("LayoutTemplate"),
  color: text("color").notNull().default("#F97316"),
  layout: text("layout").notNull().default("single-page"),
  definition: jsonb("definition").$type<Record<string, unknown>>().notNull(),
  appState: jsonb("app_state").$type<Record<string, unknown>>().notNull().default({}),
  isInSidebar: boolean("is_in_sidebar").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const spaces = pgTable("spaces", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("violet"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const spaceShares = pgTable(
  "space_shares",
  {
    id: serial("id").primaryKey(),
    spaceId: integer("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("editor"),
    invitedByUserId: integer("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acceptedUserId: integer("accepted_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("space_shares_space_email_unique").on(table.spaceId, table.email)],
);

export const spacePages = pgTable("space_pages", {
  id: serial("id").primaryKey(),
  spaceId: integer("space_id")
    .notNull()
    .references(() => spaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  template: text("template").notNull().default("Blank Page"),
  pageType: text("page_type").notNull().default("Document"),
  description: text("description"),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  plainText: text("plain_text").notNull().default(""),
  wordCount: integer("word_count").notNull().default(0),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pageTaskLinks = pgTable(
  "page_task_links",
  {
    id: serial("id").primaryKey(),
    pageId: integer("page_id")
      .notNull()
      .references(() => spacePages.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => kanbanTasks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("page_task_links_page_task_unique").on(table.pageId, table.taskId)],
);

export const pageComments = pgTable("page_comments", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id")
    .notNull()
    .references(() => spacePages.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  theme: text("theme").notNull().default("system"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  emailNotificationsEnabled: boolean("email_notifications_enabled").notNull().default(false),
  defaultCalendarView: text("default_calendar_view").notNull().default("month"),
  defaultTaskPriority: text("default_task_priority").notNull().default("medium"),
  autoSaveEnabled: boolean("auto_save_enabled").notNull().default(true),
  privacyModeEnabled: boolean("privacy_mode_enabled").notNull().default(false),
  twoFactorReminderDismissed: boolean("two_factor_reminder_dismissed").notNull().default(false),
  aiModel: text("ai_model").notNull().default("gemini-3.1-flash-lite"),
  aiBehavior: text("ai_behavior").notNull().default("balanced"),
  aiTone: text("ai_tone").notNull().default("Friendly"),
  aiRefineEnabled: boolean("ai_refine_enabled").notNull().default(true),
  aiAssistantEnabled: boolean("ai_assistant_enabled").notNull().default(true),
  aiTemplateBuilderEnabled: boolean("ai_template_builder_enabled").notNull().default(true),
  aiDiagramEnabled: boolean("ai_diagram_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userCategories = pgTable(
  "user_categories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#5BAE91"),
    icon: text("icon").notNull().default("Tag"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_categories_user_scope_name_unique").on(table.userId, table.scope, table.name)],
);

export const userAiUsage = pgTable(
  "user_ai_usage",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    usageDate: text("usage_date").notNull(),
    actionCount: integer("action_count").notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_ai_usage_user_date_unique").on(table.userId, table.usageDate)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CalendarItem = typeof calendarItems.$inferSelect;
export type NewCalendarItem = typeof calendarItems.$inferInsert;
export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type NewKanbanBoard = typeof kanbanBoards.$inferInsert;
export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type NewKanbanColumn = typeof kanbanColumns.$inferInsert;
export type KanbanTask = typeof kanbanTasks.$inferSelect;
export type NewKanbanTask = typeof kanbanTasks.$inferInsert;
export type KanbanBoardShare = typeof kanbanBoardShares.$inferSelect;
export type NewKanbanBoardShare = typeof kanbanBoardShares.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Whiteboard = typeof whiteboards.$inferSelect;
export type NewWhiteboard = typeof whiteboards.$inferInsert;
export type GeneratedApp = typeof generatedApps.$inferSelect;
export type NewGeneratedApp = typeof generatedApps.$inferInsert;
export type Space = typeof spaces.$inferSelect;
export type NewSpace = typeof spaces.$inferInsert;
export type SpaceShare = typeof spaceShares.$inferSelect;
export type NewSpaceShare = typeof spaceShares.$inferInsert;
export type SpacePage = typeof spacePages.$inferSelect;
export type NewSpacePage = typeof spacePages.$inferInsert;
export type PageTaskLink = typeof pageTaskLinks.$inferSelect;
export type NewPageTaskLink = typeof pageTaskLinks.$inferInsert;
export type PageComment = typeof pageComments.$inferSelect;
export type NewPageComment = typeof pageComments.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type UserCategory = typeof userCategories.$inferSelect;
export type NewUserCategory = typeof userCategories.$inferInsert;
export type UserAiUsage = typeof userAiUsage.$inferSelect;
export type NewUserAiUsage = typeof userAiUsage.$inferInsert;
