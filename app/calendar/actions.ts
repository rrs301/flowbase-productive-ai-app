"use server";

import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { calendarItems, db, users } from "@/db";
import { assertFreePlanLimit } from "@/lib/user-preferences";

const itemTypes = ["task", "reminder"] as const;

export type CalendarItemType = (typeof itemTypes)[number];
export type CalendarCategory = string;

export type CalendarItemDTO = {
  id: number;
  title: string;
  description: string | null;
  itemType: CalendarItemType;
  category: CalendarCategory;
  scheduledDate: string | null;
  scheduledTime: string | null;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CalendarItemInput = {
  title: string;
  description?: string;
  itemType: string;
  category: string;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
};

function normalizeType(value: string): CalendarItemType {
  return itemTypes.includes(value as CalendarItemType) ? (value as CalendarItemType) : "task";
}

function normalizeCategory(value: string): CalendarCategory {
  return value.trim().replace(/\s+/g, " ").slice(0, 36) || "Work";
}

function cleanOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toDTO(item: typeof calendarItems.$inferSelect): CalendarItemDTO {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    itemType: normalizeType(item.itemType),
    category: normalizeCategory(item.category),
    scheduledDate: item.scheduledDate,
    scheduledTime: item.scheduledTime,
    isDraft: item.isDraft,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

async function getCurrentDatabaseUserId() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const clerkId = user?.id;

  if (!email || !clerkId) {
    throw new Error("You must be signed in to manage calendar items.");
  }

  const name = user.fullName || user.username || email.split("@")[0] || null;

  const [databaseUser] = await db
    .insert(users)
    .values({ clerkId, email, name })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email, name },
    })
    .returning({ id: users.id });

  return databaseUser.id;
}

export async function listCalendarItems() {
  const userId = await getCurrentDatabaseUserId();
  const items = await db.query.calendarItems.findMany({
    where: eq(calendarItems.userId, userId),
  });

  return items.map(toDTO);
}

export async function createCalendarItem(input: CalendarItemInput, asDraft = false) {
  await assertFreePlanLimit("tasks");
  const userId = await getCurrentDatabaseUserId();
  const title = input.title.trim();

  if (!title) {
    throw new Error("Task title is required.");
  }

  const scheduledDate = asDraft ? null : cleanOptionalText(input.scheduledDate);

  if (!asDraft && !scheduledDate) {
    throw new Error("Choose a date before scheduling this item.");
  }

  const [item] = await db
    .insert(calendarItems)
    .values({
      userId,
      title,
      description: cleanOptionalText(input.description),
      itemType: normalizeType(input.itemType),
      category: normalizeCategory(input.category),
      scheduledDate,
      scheduledTime: cleanOptionalText(input.scheduledTime),
      isDraft: asDraft,
      updatedAt: new Date(),
    })
    .returning();

  revalidatePath("/calendar");
  return toDTO(item);
}

export async function updateCalendarItem(id: number, input: CalendarItemInput, asDraft = false) {
  const userId = await getCurrentDatabaseUserId();
  const title = input.title.trim();

  if (!title) {
    throw new Error("Task title is required.");
  }

  const scheduledDate = asDraft ? null : cleanOptionalText(input.scheduledDate);

  if (!asDraft && !scheduledDate) {
    throw new Error("Choose a date before scheduling this item.");
  }

  const [item] = await db
    .update(calendarItems)
    .set({
      title,
      description: cleanOptionalText(input.description),
      itemType: normalizeType(input.itemType),
      category: normalizeCategory(input.category),
      scheduledDate,
      scheduledTime: cleanOptionalText(input.scheduledTime),
      isDraft: asDraft,
      updatedAt: new Date(),
    })
    .where(and(eq(calendarItems.id, id), eq(calendarItems.userId, userId)))
    .returning();

  if (!item) {
    throw new Error("Calendar item not found.");
  }

  revalidatePath("/calendar");
  return toDTO(item);
}

export async function scheduleCalendarItem(id: number, scheduledDate: string) {
  const userId = await getCurrentDatabaseUserId();
  const date = cleanOptionalText(scheduledDate);

  if (!date) {
    throw new Error("Choose a date before scheduling this item.");
  }

  const [item] = await db
    .update(calendarItems)
    .set({
      scheduledDate: date,
      isDraft: false,
      updatedAt: new Date(),
    })
    .where(and(eq(calendarItems.id, id), eq(calendarItems.userId, userId)))
    .returning();

  if (!item) {
    throw new Error("Calendar item not found.");
  }

  revalidatePath("/calendar");
  return toDTO(item);
}
