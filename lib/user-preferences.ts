import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, count, eq, inArray, sql } from "drizzle-orm";

import {
  calendarItems,
  db,
  generatedApps,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  notes,
  spaces,
  userAiUsage,
  userCategories,
  userSettings,
  users,
  whiteboards,
} from "@/db";
import { getLiveblocksUserId, normalizeCollaborationEmail } from "@/lib/liveblocks";

export const categoryScopes = ["calendar", "task", "note", "reminder"] as const;
export type CategoryScope = (typeof categoryScopes)[number];

export const freePlanLimits = {
  boards: 3,
  tasks: 25,
  notes: 10,
  spaces: 2,
  whiteboards: 2,
  aiActionsPerDay: 5,
} as const;

export type UserCategoryDTO = {
  id: number;
  scope: CategoryScope;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
};

export function isCategoryScope(value: string): value is CategoryScope {
  return categoryScopes.includes(value as CategoryScope);
}

export function cleanCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 36);
}

export function cleanHexColor(value: string) {
  const color = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : "#5BAE91";
}

export function cleanIconName(value: string) {
  const icon = value.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
  return icon || "Tag";
}

export function toCategoryDTO(category: typeof userCategories.$inferSelect): UserCategoryDTO {
  return {
    id: category.id,
    scope: isCategoryScope(category.scope) ? category.scope : "calendar",
    name: category.name,
    color: cleanHexColor(category.color),
    icon: cleanIconName(category.icon),
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export async function getCurrentDatabaseUser() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const clerkId = user?.id;

  if (!email || !clerkId) {
    throw new Error("You must be signed in.");
  }

  const normalizedEmail = normalizeCollaborationEmail(email);
  const name = user.fullName || user.username || normalizedEmail.split("@")[0] || null;
  const liveblocksId = getLiveblocksUserId(normalizedEmail);

  const [databaseUser] = await db
    .insert(users)
    .values({ clerkId, email: normalizedEmail, liveblocksId, name })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email: normalizedEmail, liveblocksId, name },
    })
    .returning({ id: users.id, email: users.email, name: users.name, clerkId: users.clerkId });

  return databaseUser;
}

export async function isCurrentUserPro() {
  const session = await auth();
  if (!session.userId) return false;

  return session.has({ plan: "user:pro" }) || session.has({ plan: "pro" });
}

export async function listUserCategories(scopes: CategoryScope[] = [...categoryScopes]) {
  const user = await getCurrentDatabaseUser();
  const rows = await db.query.userCategories.findMany({
    where: and(eq(userCategories.userId, user.id), inArray(userCategories.scope, scopes)),
  });

  return rows.map(toCategoryDTO).sort((left, right) => left.scope.localeCompare(right.scope) || left.name.localeCompare(right.name));
}

export async function getUserUsageSnapshot(userId: number) {
  const today = new Date().toISOString().slice(0, 10);
  const [boardCount] = await db.select({ value: count() }).from(kanbanBoards).where(eq(kanbanBoards.userId, userId));
  const [taskCount] = await db
    .select({ value: count() })
    .from(kanbanTasks)
    .innerJoin(kanbanColumns, eq(kanbanTasks.columnId, kanbanColumns.id))
    .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
    .where(eq(kanbanBoards.userId, userId));
  const [noteCount] = await db.select({ value: count() }).from(notes).where(eq(notes.userId, userId));
  const [spaceCount] = await db.select({ value: count() }).from(spaces).where(eq(spaces.userId, userId));
  const [whiteboardCount] = await db.select({ value: count() }).from(whiteboards).where(eq(whiteboards.userId, userId));
  const usage = await db.query.userAiUsage.findFirst({
    where: and(eq(userAiUsage.userId, userId), eq(userAiUsage.usageDate, today)),
  });

  return {
    boards: boardCount?.value ?? 0,
    tasks: taskCount?.value ?? 0,
    notes: noteCount?.value ?? 0,
    spaces: spaceCount?.value ?? 0,
    whiteboards: whiteboardCount?.value ?? 0,
    aiActionsToday: usage?.actionCount ?? 0,
    aiUsageDate: today,
  };
}

export async function assertFreePlanLimit(kind: keyof Omit<typeof freePlanLimits, "aiActionsPerDay">) {
  if (await isCurrentUserPro()) return;

  const user = await getCurrentDatabaseUser();
  const usage = await getUserUsageSnapshot(user.id);
  const current = usage[kind];
  const limit = freePlanLimits[kind];

  if (current >= limit) {
    throw new Error(`Free plan limit reached: ${limit} ${kind}. Upgrade to Pro for unlimited access.`);
  }
}

export async function assertAiFeatureEnabled(feature: "aiRefineEnabled" | "aiTemplateBuilderEnabled" | "aiDiagramEnabled") {
  const user = await getCurrentDatabaseUser();
  const settings = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, user.id) });
  if (settings && !settings[feature]) {
    throw new Error("This AI feature is disabled in Settings.");
  }
}

export async function recordAiAction() {
  if (await isCurrentUserPro()) return;

  const user = await getCurrentDatabaseUser();
  const today = new Date().toISOString().slice(0, 10);
  const [usage] = await db
    .insert(userAiUsage)
    .values({ userId: user.id, usageDate: today, actionCount: 1, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [userAiUsage.userId, userAiUsage.usageDate],
      set: {
        actionCount: sql`${userAiUsage.actionCount} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (usage.actionCount > freePlanLimits.aiActionsPerDay) {
    throw new Error(`Free plan limit reached: ${freePlanLimits.aiActionsPerDay} AI actions per day. Upgrade to Pro for unlimited AI.`);
  }
}

export async function exportCurrentUserData() {
  const user = await getCurrentDatabaseUser();
  const [settings, categories, calendar, boards, userNotes, userSpaces, userWhiteboards, apps] = await Promise.all([
    db.query.userSettings.findFirst({ where: eq(userSettings.userId, user.id) }),
    db.query.userCategories.findMany({ where: eq(userCategories.userId, user.id) }),
    db.query.calendarItems.findMany({ where: eq(calendarItems.userId, user.id) }),
    db.query.kanbanBoards.findMany({ where: eq(kanbanBoards.userId, user.id) }),
    db.query.notes.findMany({ where: eq(notes.userId, user.id) }),
    db.query.spaces.findMany({ where: eq(spaces.userId, user.id) }),
    db.query.whiteboards.findMany({ where: eq(whiteboards.userId, user.id) }),
    db.query.generatedApps.findMany({ where: eq(generatedApps.userId, user.id) }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user: { email: user.email, name: user.name },
    settings,
    categories,
    calendar,
    kanbanBoards: boards,
    notes: userNotes,
    spaces: userSpaces,
    whiteboards: userWhiteboards,
    generatedApps: apps,
  };
}
