"use server";

import { and, asc, eq, inArray } from "drizzle-orm";

import {
  calendarItems,
  db,
  generatedApps,
  kanbanBoardShares,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  notes,
  userAiUsage,
  userCategories,
  userSettings,
  whiteboards,
} from "@/db";
import { getCurrentDatabaseUser } from "@/lib/user-preferences";

type DashboardFeatureKey = "calendar" | "kanban" | "notes" | "whiteboard" | "ai-assistant" | "ai-template-builder";
type DashboardTone = "sage" | "clay" | "amber" | "sky" | "violet" | "rose";

export type DashboardFeatureStatus = {
  key: DashboardFeatureKey;
  name: string;
  status: "Active" | "Ready" | "Disabled";
  stat: string;
  detail: string;
  tone: DashboardTone;
};

export type DashboardQuickAction = {
  label: string;
  href: string;
  description: string;
  tone: DashboardTone;
};

export type DashboardActivityItem = {
  id: string;
  title: string;
  label: string;
  href: string;
  occurredAt: string;
  tone: DashboardTone;
};

export type DashboardUpcomingItem = {
  id: number;
  title: string;
  date: string;
  time: string | null;
  type: "task" | "reminder";
  category: string;
  color: string;
};

export type DashboardRecentPage = {
  id: string;
  title: string;
  type: "Note" | "Whiteboard" | "Kanban board" | "AI template";
  href: string;
  updatedAt: string;
  meta: string;
  tone: DashboardTone;
};

export type DashboardTaskSummary = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  progress: number;
};

export type DashboardData = {
  userName: string;
  generatedAt: string;
  features: DashboardFeatureStatus[];
  quickActions: DashboardQuickAction[];
  recentActivity: DashboardActivityItem[];
  upcoming: DashboardUpcomingItem[];
  recentPages: DashboardRecentPage[];
  taskSummary: DashboardTaskSummary;
  insights: string[];
};

const quickActions: DashboardQuickAction[] = [
  { label: "Create Task", href: "/kanban", description: "Open your Kanban workspace.", tone: "amber" },
  { label: "Add Calendar Reminder", href: "/calendar", description: "Schedule a task or reminder.", tone: "sage" },
  { label: "Create Note", href: "/notes", description: "Capture a fresh thought.", tone: "sky" },
  { label: "Open Whiteboard", href: "/whiteboard", description: "Sketch ideas visually.", tone: "clay" },
  { label: "Ask AI Assistant", href: "/ai-assistant", description: "Plan or act across the app.", tone: "violet" },
  { label: "Generate AI Template", href: "/ai-template-builder", description: "Build a mini productivity app.", tone: "rose" },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isCompletedColumn(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized === "done" || normalized === "completed";
}

function activityLabel(createdAt: Date, updatedAt: Date, createdLabel: string, updatedLabel: string) {
  return updatedAt.getTime() - createdAt.getTime() > 60_000 ? updatedLabel : createdLabel;
}

function dateTimeKey(date: string | null, time: string | null) {
  return `${date || "9999-12-31"}T${time || "23:59"}`;
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function categoryColor(category: string, colors: Map<string, string>) {
  return colors.get(category.trim().toLowerCase()) || "#5BAE91";
}

export async function getDashboardData(): Promise<DashboardData> {
  const user = await getCurrentDatabaseUser();
  const today = todayKey();

  const [calendar, ownedBoards, sharedBoardRows, userNotes, boardsOnly, apps, categories, settings, aiUsage] =
    await Promise.all([
      db.query.calendarItems.findMany({ where: eq(calendarItems.userId, user.id) }),
      db.query.kanbanBoards.findMany({
        where: eq(kanbanBoards.userId, user.id),
        orderBy: [asc(kanbanBoards.createdAt), asc(kanbanBoards.id)],
      }),
      db
        .select({ board: kanbanBoards })
        .from(kanbanBoardShares)
        .innerJoin(kanbanBoards, eq(kanbanBoardShares.boardId, kanbanBoards.id))
        .where(and(eq(kanbanBoardShares.email, user.email), eq(kanbanBoardShares.role, "editor"))),
      db.query.notes.findMany({ where: eq(notes.userId, user.id) }),
      db.query.whiteboards.findMany({ where: eq(whiteboards.userId, user.id) }),
      db.query.generatedApps.findMany({ where: eq(generatedApps.userId, user.id) }),
      db.query.userCategories.findMany({
        where: and(eq(userCategories.userId, user.id), inArray(userCategories.scope, ["calendar", "reminder", "task", "note"])),
      }),
      db.query.userSettings.findFirst({ where: eq(userSettings.userId, user.id) }),
      db.query.userAiUsage.findFirst({ where: and(eq(userAiUsage.userId, user.id), eq(userAiUsage.usageDate, today)) }),
    ]);

  const boardsById = new Map([...ownedBoards, ...sharedBoardRows.map((row) => row.board)].map((board) => [board.id, board]));
  const boards = Array.from(boardsById.values());
  const boardIds = boards.map((board) => board.id);
  const columns = boardIds.length
    ? await db.query.kanbanColumns.findMany({
        where: inArray(kanbanColumns.boardId, boardIds),
        orderBy: [asc(kanbanColumns.position), asc(kanbanColumns.id)],
      })
    : [];
  const columnIds = columns.map((column) => column.id);
  const tasks = columnIds.length
    ? await db.query.kanbanTasks.findMany({
        where: inArray(kanbanTasks.columnId, columnIds),
        orderBy: [asc(kanbanTasks.position), asc(kanbanTasks.id)],
      })
    : [];

  const columnById = new Map(columns.map((column) => [column.id, column]));
  const boardById = new Map(boards.map((board) => [board.id, board]));
  const categoryColors = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category.color]));

  const enrichedTasks = tasks.map((task) => {
    const column = columnById.get(task.columnId);
    const board = column ? boardById.get(column.boardId) : null;
    return {
      ...task,
      columnName: column?.name ?? "Todo",
      boardName: board?.name ?? "Kanban board",
      boardId: board?.id ?? null,
      isCompleted: isCompletedColumn(column?.name ?? ""),
    };
  });

  const totalTasks = enrichedTasks.length;
  const completedTasks = enrichedTasks.filter((task) => task.isCompleted).length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = enrichedTasks.filter((task) => !task.isCompleted && task.dueDate < today).length;
  const taskSummary: DashboardTaskSummary = {
    total: totalTasks,
    completed: completedTasks,
    pending: pendingTasks,
    overdue: overdueTasks,
    progress: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };

  const upcoming: DashboardUpcomingItem[] = calendar
    .filter((item) => !item.isDraft && item.scheduledDate && item.scheduledDate >= today)
    .sort((left, right) => dateTimeKey(left.scheduledDate, left.scheduledTime).localeCompare(dateTimeKey(right.scheduledDate, right.scheduledTime)))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.title,
      date: item.scheduledDate!,
      time: item.scheduledTime,
      type: item.itemType === "reminder" ? "reminder" : "task",
      category: item.category,
      color: categoryColor(item.category, categoryColors),
    }));

  const recentPages: DashboardRecentPage[] = [
    ...userNotes
      .filter((note) => !note.isTrashed)
      .map((note): DashboardRecentPage => ({
        id: `note-${note.id}`,
        title: note.title,
        type: "Note",
        href: "/notes",
        updatedAt: note.updatedAt.toISOString(),
        meta: formatCount(note.wordCount, "word"),
        tone: "sky",
      })),
    ...boardsOnly.map((board): DashboardRecentPage => ({
      id: `whiteboard-${board.id}`,
      title: board.name,
      type: "Whiteboard",
      href: "/whiteboard",
      updatedAt: board.updatedAt.toISOString(),
      meta: "Visual workspace",
      tone: "clay",
    })),
    ...boards.map((board): DashboardRecentPage => ({
      id: `board-${board.id}`,
      title: board.name,
      type: "Kanban board",
      href: "/kanban",
      updatedAt: board.updatedAt.toISOString(),
      meta: formatCount(enrichedTasks.filter((task) => task.boardId === board.id).length, "task"),
      tone: "amber",
    })),
    ...apps.map((app): DashboardRecentPage => ({
      id: `template-${app.id}`,
      title: app.appName,
      type: "AI template",
      href: `/ai-template-builder/${app.id}`,
      updatedAt: app.updatedAt.toISOString(),
      meta: app.description,
      tone: "rose",
    })),
  ]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);

  const recentActivity: DashboardActivityItem[] = [
    ...calendar.map((item): DashboardActivityItem => ({
      id: `calendar-${item.id}`,
      title: item.title,
      label: activityLabel(item.createdAt, item.updatedAt, item.itemType === "reminder" ? "Added reminder" : "Created calendar task", "Updated calendar item"),
      href: "/calendar",
      occurredAt: item.updatedAt.toISOString(),
      tone: item.itemType === "reminder" ? "violet" : "sage",
    })),
    ...enrichedTasks.map((task): DashboardActivityItem => ({
      id: `task-${task.id}`,
      title: task.title,
      label: activityLabel(task.createdAt, task.updatedAt, "Created task", "Updated task"),
      href: "/kanban",
      occurredAt: task.updatedAt.toISOString(),
      tone: "amber",
    })),
    ...userNotes
      .filter((note) => !note.isTrashed)
      .map((note): DashboardActivityItem => ({
        id: `note-${note.id}`,
        title: note.title,
        label: activityLabel(note.createdAt, note.updatedAt, "Created note", "Updated note"),
        href: "/notes",
        occurredAt: note.updatedAt.toISOString(),
        tone: "sky",
      })),
    ...boardsOnly.map((board): DashboardActivityItem => ({
      id: `whiteboard-${board.id}`,
      title: board.name,
      label: activityLabel(board.createdAt, board.updatedAt, "Created whiteboard", "Updated whiteboard"),
      href: "/whiteboard",
      occurredAt: board.updatedAt.toISOString(),
      tone: "clay",
    })),
    ...apps.map((app): DashboardActivityItem => ({
      id: `template-${app.id}`,
      title: app.appName,
      label: activityLabel(app.createdAt, app.updatedAt, "Generated AI template", "Updated AI template"),
      href: `/ai-template-builder/${app.id}`,
      occurredAt: app.updatedAt.toISOString(),
      tone: "rose",
    })),
    ...(aiUsage && aiUsage.actionCount > 0
      ? [
          {
            id: `ai-usage-${aiUsage.usageDate}`,
            title: formatCount(aiUsage.actionCount, "AI action"),
            label: "AI assistant activity",
            href: "/ai-assistant",
            occurredAt: aiUsage.updatedAt.toISOString(),
            tone: "violet" as DashboardTone,
          },
        ]
      : []),
  ]
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, 8);

  const calendarReady = calendar.length > 0;
  const aiAssistantEnabled = settings?.aiAssistantEnabled ?? true;
  const aiTemplateBuilderEnabled = settings?.aiTemplateBuilderEnabled ?? true;
  const todayReminders = upcoming.filter((item) => item.date === today && item.type === "reminder").length;
  const workspaceCounts = [
    { name: "Notes", count: userNotes.filter((note) => !note.isTrashed).length },
    { name: "Tasks", count: totalTasks },
    { name: "Calendar", count: calendar.length },
    { name: "Whiteboard", count: boardsOnly.length },
    { name: "AI templates", count: apps.length },
  ];
  const mostActiveWorkspace = workspaceCounts.sort((left, right) => right.count - left.count)[0];

  const features: DashboardFeatureStatus[] = [
    {
      key: "calendar",
      name: "Calendar",
      status: calendarReady ? "Active" : "Ready",
      stat: formatCount(upcoming.length, "upcoming item"),
      detail: `${formatCount(calendar.filter((item) => item.isDraft).length, "draft")} saved`,
      tone: "sage",
    },
    {
      key: "kanban",
      name: "Kanban / Tasks",
      status: totalTasks > 0 ? "Active" : "Ready",
      stat: formatCount(totalTasks, "task"),
      detail: `${formatCount(completedTasks, "completed")} across ${formatCount(boards.length, "board")}`,
      tone: "amber",
    },
    {
      key: "notes",
      name: "Notes",
      status: userNotes.some((note) => !note.isTrashed) ? "Active" : "Ready",
      stat: formatCount(userNotes.filter((note) => !note.isTrashed).length, "note"),
      detail: `${formatCount(userNotes.filter((note) => note.isPinned && !note.isTrashed).length, "pinned note")} ready`,
      tone: "sky",
    },
    {
      key: "whiteboard",
      name: "Whiteboard",
      status: boardsOnly.length > 0 ? "Active" : "Ready",
      stat: formatCount(boardsOnly.length, "board"),
      detail: boardsOnly[0] ? `Latest: ${boardsOnly.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0].name}` : "Canvas ready",
      tone: "clay",
    },
    {
      key: "ai-assistant",
      name: "AI Assistant",
      status: aiAssistantEnabled ? (aiUsage?.actionCount ? "Active" : "Ready") : "Disabled",
      stat: formatCount(aiUsage?.actionCount ?? 0, "action"),
      detail: "Today",
      tone: "violet",
    },
    {
      key: "ai-template-builder",
      name: "AI Template Builder",
      status: aiTemplateBuilderEnabled ? (apps.length ? "Active" : "Ready") : "Disabled",
      stat: formatCount(apps.length, "template"),
      detail: `${formatCount(apps.filter((app) => app.isInSidebar).length, "sidebar app")} pinned`,
      tone: "rose",
    },
  ];

  const insights = [
    overdueTasks > 0 ? `You have ${formatCount(overdueTasks, "overdue task")}.` : "No overdue tasks right now.",
    mostActiveWorkspace.count > 0 ? `Your most active workspace is ${mostActiveWorkspace.name}.` : "Your workspace is ready for its first activity.",
    totalTasks > 0 ? `You completed ${taskSummary.progress}% of tracked tasks.` : "Create a task to start tracking progress.",
    todayReminders > 0 ? `You have ${formatCount(todayReminders, "reminder")} today.` : "No reminders scheduled for today.",
    overdueTasks > 0 ? "Suggested focus: finish overdue work before adding new tasks." : "Suggested focus: plan the next clear task.",
  ];

  return {
    userName: user.name || user.email.split("@")[0] || "there",
    generatedAt: new Date().toISOString(),
    features,
    quickActions,
    recentActivity,
    upcoming,
    recentPages,
    taskSummary,
    insights,
  };
}
