"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, userCategories, userSettings } from "@/db";
import {
  CategoryScope,
  categoryScopes,
  cleanCategoryName,
  cleanHexColor,
  cleanIconName,
  exportCurrentUserData,
  freePlanLimits,
  getCurrentDatabaseUser,
  getUserUsageSnapshot,
  isCategoryScope,
  isCurrentUserPro,
  toCategoryDTO,
  type UserCategoryDTO,
} from "@/lib/user-preferences";

const defaultCategories: Array<{ scope: CategoryScope; name: string; color: string; icon: string }> = [
  { scope: "calendar", name: "Work", color: "#5BAE91", icon: "BriefcaseBusiness" },
  { scope: "calendar", name: "Personal", color: "#EF806F", icon: "Heart" },
  { scope: "calendar", name: "Focus", color: "#4BA3C7", icon: "Focus" },
  { scope: "calendar", name: "Meeting", color: "#E6A23C", icon: "Users" },
  { scope: "reminder", name: "Reminder", color: "#8B7CF6", icon: "Bell" },
  { scope: "task", name: "Build", color: "#E6A23C", icon: "Hammer" },
  { scope: "task", name: "Review", color: "#4BA3C7", icon: "ListChecks" },
  { scope: "task", name: "Admin", color: "#8B7CF6", icon: "ClipboardList" },
  { scope: "note", name: "Ideas", color: "#EF806F", icon: "Lightbulb" },
  { scope: "note", name: "Research", color: "#5BAE91", icon: "BookOpen" },
  { scope: "note", name: "Meeting Notes", color: "#E6A23C", icon: "NotebookPen" },
];

const themeOptions = ["system", "light", "dark"] as const;
const calendarViews = ["month", "week"] as const;
const priorities = ["low", "medium", "high"] as const;
const aiModels = ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"] as const;
const aiBehaviors = ["concise", "balanced", "detailed"] as const;
const aiTones = ["Friendly", "Professional", "Confident", "Casual"] as const;

export type UserSettingsDTO = {
  theme: string;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  defaultCalendarView: string;
  defaultTaskPriority: string;
  autoSaveEnabled: boolean;
  privacyModeEnabled: boolean;
  twoFactorReminderDismissed: boolean;
  aiModel: string;
  aiBehavior: string;
  aiTone: string;
  aiRefineEnabled: boolean;
  aiAssistantEnabled: boolean;
  aiTemplateBuilderEnabled: boolean;
  aiDiagramEnabled: boolean;
  updatedAt: string;
};

export type SettingsPageData = {
  profile: {
    name: string | null;
    email: string;
    initials: string;
  };
  settings: UserSettingsDTO;
  categories: UserCategoryDTO[];
  usage: Awaited<ReturnType<typeof getUserUsageSnapshot>>;
  limits: typeof freePlanLimits;
  isPro: boolean;
};

export type UserSettingsInput = Partial<Omit<UserSettingsDTO, "updatedAt">>;

export type CategoryInput = {
  scope: string;
  name: string;
  color: string;
  icon: string;
};

function option<T extends readonly string[]>(value: unknown, options: T, fallback: T[number]) {
  return typeof value === "string" && options.includes(value as T[number]) ? value : fallback;
}

function toSettingsDTO(settings: typeof userSettings.$inferSelect): UserSettingsDTO {
  return {
    theme: option(settings.theme, themeOptions, "system"),
    notificationsEnabled: settings.notificationsEnabled,
    emailNotificationsEnabled: settings.emailNotificationsEnabled,
    defaultCalendarView: option(settings.defaultCalendarView, calendarViews, "month"),
    defaultTaskPriority: option(settings.defaultTaskPriority, priorities, "medium"),
    autoSaveEnabled: settings.autoSaveEnabled,
    privacyModeEnabled: settings.privacyModeEnabled,
    twoFactorReminderDismissed: settings.twoFactorReminderDismissed,
    aiModel: option(settings.aiModel, aiModels, "gemini-3.1-flash-lite"),
    aiBehavior: option(settings.aiBehavior, aiBehaviors, "balanced"),
    aiTone: option(settings.aiTone, aiTones, "Friendly"),
    aiRefineEnabled: settings.aiRefineEnabled,
    aiAssistantEnabled: settings.aiAssistantEnabled,
    aiTemplateBuilderEnabled: settings.aiTemplateBuilderEnabled,
    aiDiagramEnabled: settings.aiDiagramEnabled,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function initials(name: string | null, email: string) {
  const source = name || email;
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function ensureSettings(userId: number) {
  const [settings] = await db
    .insert(userSettings)
    .values({ userId })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { updatedAt: sqlNow() },
    })
    .returning();

  return settings;
}

function sqlNow() {
  return new Date();
}

async function ensureDefaultCategories(userId: number) {
  await db
    .insert(userCategories)
    .values(defaultCategories.map((category) => ({ ...category, userId })))
    .onConflictDoNothing();
}

export async function listSettingsPageData(): Promise<SettingsPageData> {
  const user = await getCurrentDatabaseUser();
  const [settings] = await Promise.all([ensureSettings(user.id), ensureDefaultCategories(user.id)]);
  const [categories, usage, isPro] = await Promise.all([
    db.query.userCategories.findMany({ where: eq(userCategories.userId, user.id) }),
    getUserUsageSnapshot(user.id),
    isCurrentUserPro(),
  ]);

  return {
    profile: {
      name: user.name,
      email: user.email,
      initials: initials(user.name, user.email),
    },
    settings: toSettingsDTO(settings),
    categories: categories.map(toCategoryDTO),
    usage,
    limits: freePlanLimits,
    isPro,
  };
}

export async function updateUserSettings(input: UserSettingsInput) {
  const user = await getCurrentDatabaseUser();
  const values: Partial<typeof userSettings.$inferInsert> = { updatedAt: new Date() };

  if (typeof input.theme === "string") values.theme = option(input.theme, themeOptions, "system");
  if (typeof input.notificationsEnabled === "boolean") values.notificationsEnabled = input.notificationsEnabled;
  if (typeof input.emailNotificationsEnabled === "boolean") values.emailNotificationsEnabled = input.emailNotificationsEnabled;
  if (typeof input.defaultCalendarView === "string") values.defaultCalendarView = option(input.defaultCalendarView, calendarViews, "month");
  if (typeof input.defaultTaskPriority === "string") values.defaultTaskPriority = option(input.defaultTaskPriority, priorities, "medium");
  if (typeof input.autoSaveEnabled === "boolean") values.autoSaveEnabled = input.autoSaveEnabled;
  if (typeof input.privacyModeEnabled === "boolean") values.privacyModeEnabled = input.privacyModeEnabled;
  if (typeof input.twoFactorReminderDismissed === "boolean") values.twoFactorReminderDismissed = input.twoFactorReminderDismissed;
  if (typeof input.aiModel === "string") values.aiModel = option(input.aiModel, aiModels, "gemini-3.1-flash-lite");
  if (typeof input.aiBehavior === "string") values.aiBehavior = option(input.aiBehavior, aiBehaviors, "balanced");
  if (typeof input.aiTone === "string") values.aiTone = option(input.aiTone, aiTones, "Friendly");
  if (typeof input.aiRefineEnabled === "boolean") values.aiRefineEnabled = input.aiRefineEnabled;
  if (typeof input.aiAssistantEnabled === "boolean") values.aiAssistantEnabled = input.aiAssistantEnabled;
  if (typeof input.aiTemplateBuilderEnabled === "boolean") values.aiTemplateBuilderEnabled = input.aiTemplateBuilderEnabled;
  if (typeof input.aiDiagramEnabled === "boolean") values.aiDiagramEnabled = input.aiDiagramEnabled;

  const [settings] = await db
    .insert(userSettings)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: userSettings.userId, set: values })
    .returning();

  revalidatePath("/settings");
  return toSettingsDTO(settings);
}

function cleanCategoryInput(input: CategoryInput) {
  const scope = isCategoryScope(input.scope) ? input.scope : null;
  const name = cleanCategoryName(input.name);

  if (!scope) throw new Error("Choose a valid category scope.");
  if (!name) throw new Error("Category name is required.");

  return {
    scope,
    name,
    color: cleanHexColor(input.color),
    icon: cleanIconName(input.icon),
  };
}

export async function createCategory(input: CategoryInput) {
  const user = await getCurrentDatabaseUser();
  const category = cleanCategoryInput(input);
  const [created] = await db
    .insert(userCategories)
    .values({ ...category, userId: user.id, updatedAt: new Date() })
    .returning();

  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/kanban");
  revalidatePath("/notes");
  return toCategoryDTO(created);
}

export async function updateCategory(id: number, input: CategoryInput) {
  const user = await getCurrentDatabaseUser();
  const category = cleanCategoryInput(input);
  const [updated] = await db
    .update(userCategories)
    .set({ ...category, updatedAt: new Date() })
    .where(and(eq(userCategories.id, id), eq(userCategories.userId, user.id)))
    .returning();

  if (!updated) throw new Error("Category not found.");

  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/kanban");
  revalidatePath("/notes");
  return toCategoryDTO(updated);
}

export async function deleteCategory(id: number) {
  const user = await getCurrentDatabaseUser();
  const [deleted] = await db
    .delete(userCategories)
    .where(and(eq(userCategories.id, id), eq(userCategories.userId, user.id)))
    .returning();

  if (!deleted) throw new Error("Category not found.");

  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/kanban");
  revalidatePath("/notes");
  return toCategoryDTO(deleted);
}

export async function listCategoriesForScopes(scopes: CategoryScope[]) {
  const data = await listSettingsPageData();
  const allowed = new Set(scopes.length ? scopes : categoryScopes);
  return data.categories.filter((category) => allowed.has(category.scope));
}

export async function exportUserData() {
  return exportCurrentUserData();
}
