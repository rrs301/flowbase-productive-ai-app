"use server";

import { currentUser } from "@clerk/nextjs/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { calendarItems, db, kanbanBoards, kanbanColumns, kanbanTasks, users } from "@/db";

const boardColors = ["sage", "clay", "amber", "sky", "violet"] as const;
const priorities = ["low", "medium", "high"] as const;
const labelColors = ["sage", "clay", "amber", "sky", "violet"] as const;
const defaultColumns = ["Todo", "In Progress", "Done"];
const maxColumns = 5;

export type BoardColor = (typeof boardColors)[number];
export type TaskPriority = (typeof priorities)[number];
export type LabelColor = (typeof labelColors)[number];

export type KanbanLabelDTO = {
  name: string;
  color: LabelColor;
};

export type KanbanTaskDTO = {
  id: number;
  columnId: number;
  title: string;
  description: string | null;
  dueDate: string;
  priority: TaskPriority;
  labels: KanbanLabelDTO[];
  syncCalendar: boolean;
  linkNotes: boolean;
  calendarItemId: number | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type KanbanColumnDTO = {
  id: number;
  boardId: number;
  name: string;
  position: number;
  tasks: KanbanTaskDTO[];
};

export type KanbanBoardDTO = {
  id: number;
  name: string;
  color: BoardColor;
  createdAt: string;
  updatedAt: string;
  columns: KanbanColumnDTO[];
};

export type BoardInput = {
  name: string;
  color: string;
};

export type ColumnInput = {
  boardId: number;
  name: string;
};

export type TaskInput = {
  columnId: number;
  title: string;
  description?: string;
  dueDate: string;
  priority: string;
  labels: KanbanLabelDTO[];
  syncCalendar: boolean;
  linkNotes: boolean;
};

function normalizeBoardColor(value: string): BoardColor {
  return boardColors.includes(value as BoardColor) ? (value as BoardColor) : "sage";
}

function normalizePriority(value: string): TaskPriority {
  return priorities.includes(value as TaskPriority) ? (value as TaskPriority) : "medium";
}

function normalizeLabelColor(value: string): LabelColor {
  return labelColors.includes(value as LabelColor) ? (value as LabelColor) : "sage";
}

function cleanOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeLabels(labels: { name: string; color: string }[]) {
  return labels
    .map((label) => ({ name: label.name.trim(), color: normalizeLabelColor(label.color) }))
    .filter((label) => label.name)
    .slice(0, 5);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function toTaskDTO(task: typeof kanbanTasks.$inferSelect): KanbanTaskDTO {
  return {
    id: task.id,
    columnId: task.columnId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: normalizePriority(task.priority),
    labels: normalizeLabels(task.labels),
    syncCalendar: task.syncCalendar,
    linkNotes: task.linkNotes,
    calendarItemId: task.calendarItemId,
    position: task.position,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

async function getCurrentDatabaseUserId() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const clerkId = user?.id;

  if (!email || !clerkId) {
    throw new Error("You must be signed in to manage Kanban boards.");
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

async function assertBoardOwner(boardId: number, userId: number) {
  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, userId)))
    .limit(1);

  if (!board) {
    throw new Error("Kanban board not found.");
  }

  return board;
}

async function assertColumnOwner(columnId: number, userId: number) {
  const [record] = await db
    .select({ column: kanbanColumns, board: kanbanBoards })
    .from(kanbanColumns)
    .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
    .where(and(eq(kanbanColumns.id, columnId), eq(kanbanBoards.userId, userId)))
    .limit(1);

  if (!record) {
    throw new Error("Kanban column not found.");
  }

  return record;
}

async function assertTaskOwner(taskId: number, userId: number) {
  const [record] = await db
    .select({ task: kanbanTasks, column: kanbanColumns, board: kanbanBoards })
    .from(kanbanTasks)
    .innerJoin(kanbanColumns, eq(kanbanTasks.columnId, kanbanColumns.id))
    .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
    .where(and(eq(kanbanTasks.id, taskId), eq(kanbanBoards.userId, userId)))
    .limit(1);

  if (!record) {
    throw new Error("Kanban task not found.");
  }

  return record;
}

async function nextColumnPosition(boardId: number) {
  const columns = await db.query.kanbanColumns.findMany({
    where: eq(kanbanColumns.boardId, boardId),
    orderBy: [asc(kanbanColumns.position), asc(kanbanColumns.id)],
  });

  return columns.length;
}

async function nextTaskPosition(columnId: number) {
  const tasks = await db.query.kanbanTasks.findMany({
    where: eq(kanbanTasks.columnId, columnId),
    orderBy: [asc(kanbanTasks.position), asc(kanbanTasks.id)],
  });

  return tasks.length;
}

async function syncCalendarItem(userId: number, input: {
  title: string;
  description?: string | null;
  dueDate: string;
  syncCalendar: boolean;
  calendarItemId?: number | null;
}) {
  if (!input.syncCalendar) {
    if (input.calendarItemId) {
      await db.delete(calendarItems).where(and(eq(calendarItems.id, input.calendarItemId), eq(calendarItems.userId, userId)));
    }
    return null;
  }

  if (input.calendarItemId) {
    const [item] = await db
      .update(calendarItems)
      .set({
        title: input.title,
        description: cleanOptionalText(input.description),
        itemType: "task",
        category: "work",
        scheduledDate: input.dueDate,
        scheduledTime: null,
        isDraft: false,
        updatedAt: new Date(),
      })
      .where(and(eq(calendarItems.id, input.calendarItemId), eq(calendarItems.userId, userId)))
      .returning({ id: calendarItems.id });

    if (item) return item.id;
  }

  const [item] = await db
    .insert(calendarItems)
    .values({
      userId,
      title: input.title,
      description: cleanOptionalText(input.description),
      itemType: "task",
      category: "work",
      scheduledDate: input.dueDate,
      scheduledTime: null,
      isDraft: false,
      updatedAt: new Date(),
    })
    .returning({ id: calendarItems.id });

  return item.id;
}

async function deleteLinkedCalendarItems(calendarItemIds: number[], userId: number) {
  if (calendarItemIds.length === 0) return;

  await db.delete(calendarItems).where(and(inArray(calendarItems.id, calendarItemIds), eq(calendarItems.userId, userId)));
}

export async function listKanbanBoards() {
  const userId = await getCurrentDatabaseUserId();
  const boards = await db.query.kanbanBoards.findMany({
    where: eq(kanbanBoards.userId, userId),
    orderBy: [asc(kanbanBoards.createdAt), asc(kanbanBoards.id)],
  });

  if (boards.length === 0) return [];

  const boardIds = boards.map((board) => board.id);
  const columns = await db.query.kanbanColumns.findMany({
    where: inArray(kanbanColumns.boardId, boardIds),
    orderBy: [asc(kanbanColumns.position), asc(kanbanColumns.id)],
  });
  const columnIds = columns.map((column) => column.id);
  const tasks =
    columnIds.length > 0
      ? await db.query.kanbanTasks.findMany({
          where: inArray(kanbanTasks.columnId, columnIds),
          orderBy: [asc(kanbanTasks.position), asc(kanbanTasks.id)],
        })
      : [];

  const tasksByColumn = tasks.reduce<Record<number, KanbanTaskDTO[]>>((grouped, task) => {
    grouped[task.columnId] = [...(grouped[task.columnId] || []), toTaskDTO(task)];
    return grouped;
  }, {});
  const columnsByBoard = columns.reduce<Record<number, KanbanColumnDTO[]>>((grouped, column) => {
    grouped[column.boardId] = [
      ...(grouped[column.boardId] || []),
      {
        id: column.id,
        boardId: column.boardId,
        name: column.name,
        position: column.position,
        tasks: tasksByColumn[column.id] || [],
      },
    ];
    return grouped;
  }, {});

  return boards.map<KanbanBoardDTO>((board) => ({
    id: board.id,
    name: board.name,
    color: normalizeBoardColor(board.color),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    columns: columnsByBoard[board.id] || [],
  }));
}

export async function createKanbanBoard(input: BoardInput) {
  const userId = await getCurrentDatabaseUserId();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Board name is required.");
  }

  const [board] = await db
    .insert(kanbanBoards)
    .values({ userId, name, color: normalizeBoardColor(input.color), updatedAt: new Date() })
    .returning();

  await db.insert(kanbanColumns).values(defaultColumns.map((columnName, index) => ({ boardId: board.id, name: columnName, position: index })));

  revalidatePath("/kanban");
  return (await listKanbanBoards()).find((nextBoard) => nextBoard.id === board.id)!;
}

export async function updateKanbanBoard(boardId: number, input: BoardInput) {
  const userId = await getCurrentDatabaseUserId();
  await assertBoardOwner(boardId, userId);
  const name = input.name.trim();

  if (!name) {
    throw new Error("Board name is required.");
  }

  await db
    .update(kanbanBoards)
    .set({ name, color: normalizeBoardColor(input.color), updatedAt: new Date() })
    .where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, userId)));

  revalidatePath("/kanban");
  return listKanbanBoards();
}

export async function deleteKanbanBoard(boardId: number) {
  const userId = await getCurrentDatabaseUserId();
  await assertBoardOwner(boardId, userId);
  const columns = await db.query.kanbanColumns.findMany({ where: eq(kanbanColumns.boardId, boardId) });
  const columnIds = columns.map((column) => column.id);
  const tasks =
    columnIds.length > 0
      ? await db.query.kanbanTasks.findMany({
          where: inArray(kanbanTasks.columnId, columnIds),
        })
      : [];

  await deleteLinkedCalendarItems(tasks.map((task) => task.calendarItemId).filter((id): id is number => Boolean(id)), userId);
  await db.delete(kanbanBoards).where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, userId)));

  revalidatePath("/kanban");
  revalidatePath("/calendar");
  return listKanbanBoards();
}

export async function createKanbanColumn(input: ColumnInput) {
  const userId = await getCurrentDatabaseUserId();
  await assertBoardOwner(input.boardId, userId);
  const name = input.name.trim();

  if (!name) {
    throw new Error("Column name is required.");
  }

  const position = await nextColumnPosition(input.boardId);
  if (position >= maxColumns) {
    throw new Error("Each board can have up to 5 columns.");
  }

  await db.insert(kanbanColumns).values({ boardId: input.boardId, name, position, updatedAt: new Date() });
  await db.update(kanbanBoards).set({ updatedAt: new Date() }).where(eq(kanbanBoards.id, input.boardId));

  revalidatePath("/kanban");
  return listKanbanBoards();
}

export async function updateKanbanColumn(columnId: number, name: string) {
  const userId = await getCurrentDatabaseUserId();
  const { column } = await assertColumnOwner(columnId, userId);
  const nextName = name.trim();

  if (!nextName) {
    throw new Error("Column name is required.");
  }

  await db.update(kanbanColumns).set({ name: nextName, updatedAt: new Date() }).where(eq(kanbanColumns.id, columnId));
  await db.update(kanbanBoards).set({ updatedAt: new Date() }).where(eq(kanbanBoards.id, column.boardId));

  revalidatePath("/kanban");
  return listKanbanBoards();
}

export async function deleteKanbanColumn(columnId: number) {
  const userId = await getCurrentDatabaseUserId();
  const { column } = await assertColumnOwner(columnId, userId);
  const tasks = await db.query.kanbanTasks.findMany({ where: eq(kanbanTasks.columnId, columnId) });

  await deleteLinkedCalendarItems(tasks.map((task) => task.calendarItemId).filter((id): id is number => Boolean(id)), userId);
  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, columnId));
  await db.update(kanbanBoards).set({ updatedAt: new Date() }).where(eq(kanbanBoards.id, column.boardId));

  revalidatePath("/kanban");
  revalidatePath("/calendar");
  return listKanbanBoards();
}

export async function createKanbanTask(input: TaskInput) {
  const userId = await getCurrentDatabaseUserId();
  const { column, board } = await assertColumnOwner(input.columnId, userId);
  const title = input.title.trim();
  const dueDate = cleanOptionalText(input.dueDate) || todayKey();

  if (!title) {
    throw new Error("Task title is required.");
  }

  const calendarItemId = await syncCalendarItem(userId, {
    title,
    description: input.description,
    dueDate,
    syncCalendar: input.syncCalendar,
  });

  await db.insert(kanbanTasks).values({
    columnId: column.id,
    title,
    description: cleanOptionalText(input.description),
    dueDate,
    priority: normalizePriority(input.priority),
    labels: normalizeLabels(input.labels),
    syncCalendar: input.syncCalendar,
    linkNotes: input.linkNotes,
    calendarItemId,
    position: await nextTaskPosition(column.id),
    updatedAt: new Date(),
  });
  await db.update(kanbanBoards).set({ updatedAt: new Date() }).where(eq(kanbanBoards.id, board.id));

  revalidatePath("/kanban");
  revalidatePath("/calendar");
  return listKanbanBoards();
}

export async function updateKanbanTask(taskId: number, input: TaskInput) {
  const userId = await getCurrentDatabaseUserId();
  const { task, board } = await assertTaskOwner(taskId, userId);
  const { column } = await assertColumnOwner(input.columnId, userId);
  const title = input.title.trim();
  const dueDate = cleanOptionalText(input.dueDate) || todayKey();

  if (!title) {
    throw new Error("Task title is required.");
  }

  const calendarItemId = await syncCalendarItem(userId, {
    title,
    description: input.description,
    dueDate,
    syncCalendar: input.syncCalendar,
    calendarItemId: task.calendarItemId,
  });

  await db
    .update(kanbanTasks)
    .set({
      columnId: column.id,
      title,
      description: cleanOptionalText(input.description),
      dueDate,
      priority: normalizePriority(input.priority),
      labels: normalizeLabels(input.labels),
      syncCalendar: input.syncCalendar,
      linkNotes: input.linkNotes,
      calendarItemId,
      updatedAt: new Date(),
    })
    .where(eq(kanbanTasks.id, taskId));
  await db.update(kanbanBoards).set({ updatedAt: new Date() }).where(eq(kanbanBoards.id, board.id));

  revalidatePath("/kanban");
  revalidatePath("/calendar");
  return listKanbanBoards();
}

export async function deleteKanbanTask(taskId: number) {
  const userId = await getCurrentDatabaseUserId();
  const { task, board } = await assertTaskOwner(taskId, userId);

  await deleteLinkedCalendarItems(task.calendarItemId ? [task.calendarItemId] : [], userId);
  await db.delete(kanbanTasks).where(eq(kanbanTasks.id, taskId));
  await db.update(kanbanBoards).set({ updatedAt: new Date() }).where(eq(kanbanBoards.id, board.id));

  revalidatePath("/kanban");
  revalidatePath("/calendar");
  return listKanbanBoards();
}

export async function moveKanbanTask(taskId: number, targetColumnId: number, targetPosition: number) {
  const userId = await getCurrentDatabaseUserId();
  const { task, board } = await assertTaskOwner(taskId, userId);
  const { column } = await assertColumnOwner(targetColumnId, userId);
  const tasks = await db.query.kanbanTasks.findMany({
    where: eq(kanbanTasks.columnId, column.id),
    orderBy: [asc(kanbanTasks.position), asc(kanbanTasks.id)],
  });
  const withoutMoved = tasks.filter((nextTask) => nextTask.id !== taskId);
  const boundedPosition = Math.max(0, Math.min(targetPosition, withoutMoved.length));
  const reordered = [...withoutMoved.slice(0, boundedPosition), { ...task, columnId: column.id }, ...withoutMoved.slice(boundedPosition)];

  await db.update(kanbanTasks).set({ columnId: column.id, position: boundedPosition, updatedAt: new Date() }).where(eq(kanbanTasks.id, taskId));
  await Promise.all(
    reordered.map((nextTask, index) =>
      db.update(kanbanTasks).set({ position: index, updatedAt: new Date() }).where(eq(kanbanTasks.id, nextTask.id)),
    ),
  );
  await db.update(kanbanBoards).set({ updatedAt: new Date() }).where(eq(kanbanBoards.id, board.id));

  revalidatePath("/kanban");
  return listKanbanBoards();
}
