"use server";

import { GoogleGenAI } from "@google/genai";
import { and, eq } from "drizzle-orm";

import { generateGeneratedApp } from "@/app/ai-template-builder/actions";
import { createCalendarItem } from "@/app/calendar/actions";
import { createKanbanBoard, createKanbanTask, listKanbanBoards } from "@/app/kanban/actions";
import { createNote, listNotes, updateNoteContent, updateNoteTitle } from "@/app/notes/actions";
import { updateUserSettings } from "@/app/settings/actions";
import { createWhiteboard, generateWhiteboardDiagram } from "@/app/whiteboard/actions";
import { calendarItems, db, generatedApps, userSettings, whiteboards } from "@/db";
import { getCurrentDatabaseUser, recordAiAction } from "@/lib/user-preferences";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

export type AssistantMessageInput = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantActionType =
  | "create_kanban_board"
  | "create_kanban_task"
  | "create_calendar_item"
  | "create_note"
  | "update_note_content"
  | "create_whiteboard"
  | "generate_whiteboard_diagram"
  | "generate_template_app"
  | "update_settings";

export type AssistantActionProposal = {
  type: AssistantActionType;
  title: string;
  summary: string;
  appArea: string;
  requiresConfirmation: true;
  payload: Record<string, unknown>;
};

export type AssistantResponse = {
  text: string;
  clarification?: string;
  action?: AssistantActionProposal;
};

export type AssistantExecutionResult = {
  message: string;
  link?: string;
  data?: unknown;
};

function cleanText(value: unknown, fallback = "", maxLength = 400) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return (text || fallback).slice(0, maxLength);
}

function cleanLongText(value: unknown, fallback = "", maxLength = 12000) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, maxLength);
}

function cleanBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanDate(value: unknown) {
  const text = cleanText(value, "", 24);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function cleanTime(value: unknown) {
  const text = cleanText(value, "", 12);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : "";
}

function wordCount(value: string) {
  return value.trim().match(/\S+/g)?.length ?? 0;
}

function noteContentFromText(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return {
    type: "doc",
    content: paragraphs.length
      ? paragraphs.map((paragraph) => ({
          type: "paragraph",
          content: [{ type: "text", text: paragraph }],
        }))
      : [{ type: "paragraph" }],
  };
}

function parseJsonResponse(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return JSON.");
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
}

function cleanActionProposal(value: unknown): AssistantActionProposal | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const type = cleanText(record.type, "", 80) as AssistantActionType;
  const allowed: AssistantActionType[] = [
    "create_kanban_board",
    "create_kanban_task",
    "create_calendar_item",
    "create_note",
    "update_note_content",
    "create_whiteboard",
    "generate_whiteboard_diagram",
    "generate_template_app",
    "update_settings",
  ];

  if (!allowed.includes(type)) return undefined;

  return {
    type,
    title: cleanText(record.title, "Confirm action", 80),
    summary: cleanText(record.summary, "Review and confirm this action.", 240),
    appArea: cleanText(record.appArea, "Flowbase", 40),
    requiresConfirmation: true,
    payload:
      record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)
        ? (record.payload as Record<string, unknown>)
        : {},
  };
}

function cleanAssistantResponse(value: Record<string, unknown>): AssistantResponse {
  const clarification = cleanText(value.clarification, "", 260);
  const text = cleanText(value.text, clarification || "I can help with that.", 900);

  return {
    text,
    clarification: clarification || undefined,
    action: cleanActionProposal(value.action),
  };
}

async function assertAssistantEnabled() {
  const user = await getCurrentDatabaseUser();
  const settings = await db.query.userSettings.findFirst({ where: eq(userSettings.userId, user.id) });

  if (settings && !settings.aiAssistantEnabled) {
    throw new Error("AI Assistant is disabled in Settings.");
  }

  return user;
}

export async function getAssistantSnapshot() {
  const user = await assertAssistantEnabled();
  const [boards, notes, calendar, boardsOnly, apps, settings] = await Promise.all([
    listKanbanBoards(),
    listNotes(),
    db.query.calendarItems.findMany({ where: eq(calendarItems.userId, user.id) }),
    db.query.whiteboards.findMany({ where: eq(whiteboards.userId, user.id) }),
    db.query.generatedApps.findMany({ where: eq(generatedApps.userId, user.id) }),
    db.query.userSettings.findFirst({ where: eq(userSettings.userId, user.id) }),
  ]);

  return {
    today: new Date().toISOString().slice(0, 10),
    user: { name: user.name, email: user.email },
    kanbanBoards: boards.map((board) => ({
      id: board.id,
      name: board.name,
      columns: board.columns.map((column) => ({
        id: column.id,
        name: column.name,
        taskCount: column.tasks.length,
      })),
    })),
    calendarItems: calendar.slice(-40).map((item) => ({
      id: item.id,
      title: item.title,
      itemType: item.itemType,
      scheduledDate: item.scheduledDate,
      scheduledTime: item.scheduledTime,
      category: item.category,
      isDraft: item.isDraft,
    })),
    notes: notes.slice(0, 30).map((note) => ({
      id: note.id,
      title: note.title,
      category: note.category,
      wordCount: note.wordCount,
      isPinned: note.isPinned,
      updatedAt: note.updatedAt,
      preview: note.plainText.slice(0, 700),
    })),
    whiteboards: boardsOnly.map((board) => ({
      id: board.id,
      name: board.name,
      color: board.color,
      updatedAt: board.updatedAt.toISOString(),
    })),
    generatedApps: apps.map((app) => ({
      id: app.id,
      appName: app.appName,
      description: app.description,
      isInSidebar: app.isInSidebar,
    })),
    settings: settings
      ? {
          theme: settings.theme,
          notificationsEnabled: settings.notificationsEnabled,
          defaultCalendarView: settings.defaultCalendarView,
          defaultTaskPriority: settings.defaultTaskPriority,
          aiModel: settings.aiModel,
          aiBehavior: settings.aiBehavior,
          aiTone: settings.aiTone,
        }
      : null,
  };
}

export async function sendAssistantMessage(messages: AssistantMessageInput[]): Promise<AssistantResponse> {
  await assertAssistantEnabled();
  await recordAiAction();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini is not configured. Add GEMINI_API_KEY to enable AI Assistant.");
  }

  const snapshot = await getAssistantSnapshot();
  const cleanMessages = messages
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: cleanLongText(message.content, "", 2000),
    }))
    .filter((message) => message.content);

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      "You are Flowbase AI Assistant, a concise command center for a productivity app.",
      "Return only strict JSON. Never include markdown fences or commentary outside JSON.",
      'Schema: {"text":"string","clarification":"optional string","action":{"type":"create_kanban_board|create_kanban_task|create_calendar_item|create_note|update_note_content|create_whiteboard|generate_whiteboard_diagram|generate_template_app|update_settings","title":"string","summary":"string","appArea":"string","requiresConfirmation":true,"payload":{}}}',
      "Always ask a clarification question instead of proposing a save action when required details are missing. Calendar writes require scheduledDate as YYYY-MM-DD. Calendar time is optional but must be HH:mm when present.",
      "All persistent actions require confirmation, so action.requiresConfirmation must always be true.",
      "Use existing ids from the snapshot when targeting a known board, column, or note. For Kanban tasks, choose the Todo column when the request is clear and no column is named.",
      "For summaries or planning answers, respond in text without an action unless the user explicitly asks to save the result.",
      `Workspace snapshot JSON:\n${JSON.stringify(snapshot)}`,
      `Conversation JSON:\n${JSON.stringify(cleanMessages)}`,
    ].join("\n\n"),
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini did not return an assistant response.");
  }

  return cleanAssistantResponse(parseJsonResponse(text));
}

export async function executeAssistantAction(action: AssistantActionProposal): Promise<AssistantExecutionResult> {
  await assertAssistantEnabled();
  const payload = action.payload || {};

  if (action.type === "create_kanban_board") {
    const board = await createKanbanBoard({
      name: cleanText(payload.name ?? payload.title, "New board", 80),
      color: cleanText(payload.color, "sage", 20),
    });
    return { message: `Created Kanban board "${board.name}".`, link: "/kanban", data: board };
  }

  if (action.type === "create_kanban_task") {
    const boards = await listKanbanBoards();
    const requestedBoardId = typeof payload.boardId === "number" ? payload.boardId : Number(payload.boardId);
    const requestedColumnId = typeof payload.columnId === "number" ? payload.columnId : Number(payload.columnId);
    const board =
      boards.find((item) => item.id === requestedBoardId) ||
      boards.find((item) => item.name.toLowerCase() === cleanText(payload.boardName, "", 80).toLowerCase()) ||
      boards[0];

    if (!board) throw new Error("Create a Kanban board before adding a task.");

    const column =
      board.columns.find((item) => item.id === requestedColumnId) ||
      board.columns.find((item) => item.name.toLowerCase() === cleanText(payload.columnName, "Todo", 80).toLowerCase()) ||
      board.columns.find((item) => item.name.toLowerCase() === "todo") ||
      board.columns[0];

    if (!column) throw new Error("This board does not have a column for the task.");

    await createKanbanTask({
      columnId: column.id,
      title: cleanText(payload.title, "New task", 140),
      description: cleanLongText(payload.description, "", 1000),
      dueDate: cleanDate(payload.dueDate) || new Date().toISOString().slice(0, 10),
      priority: cleanText(payload.priority, "medium", 20),
      category: cleanText(payload.category, "", 36) || null,
      labels: [],
      syncCalendar: cleanBoolean(payload.syncCalendar, false),
      linkNotes: false,
    });
    return { message: `Added task to ${board.name}.`, link: "/kanban" };
  }

  if (action.type === "create_calendar_item") {
    const scheduledDate = cleanDate(payload.scheduledDate);
    if (!scheduledDate) throw new Error("Choose a date before saving this calendar item.");

    const item = await createCalendarItem({
      title: cleanText(payload.title, "New calendar item", 140),
      description: cleanLongText(payload.description, "", 1000),
      itemType: cleanText(payload.itemType, "task", 20),
      category: cleanText(payload.category, "Work", 36),
      scheduledDate,
      scheduledTime: cleanTime(payload.scheduledTime) || null,
    });
    return { message: `Added "${item.title}" to your calendar.`, link: "/calendar", data: item };
  }

  if (action.type === "create_note") {
    const plainText = cleanLongText(payload.plainText ?? payload.content, "", 12000);
    const note = await createNote();
    const titled = await updateNoteTitle(note.id, cleanText(payload.title, "AI note", 100));
    const updated = await updateNoteContent(titled.id, {
      content: noteContentFromText(plainText),
      plainText,
      wordCount: wordCount(plainText),
    });
    return { message: `Created note "${updated.title}".`, link: "/notes", data: updated };
  }

  if (action.type === "update_note_content") {
    const noteId = typeof payload.noteId === "number" ? payload.noteId : Number(payload.noteId);
    if (!Number.isInteger(noteId)) throw new Error("Choose a note before updating content.");
    const plainText = cleanLongText(payload.plainText ?? payload.content, "", 12000);
    const updated = await updateNoteContent(noteId, {
      content: noteContentFromText(plainText),
      plainText,
      wordCount: wordCount(plainText),
    });
    return { message: `Updated note "${updated.title}".`, link: "/notes", data: updated };
  }

  if (action.type === "create_whiteboard") {
    const board = await createWhiteboard({
      name: cleanText(payload.name ?? payload.title, "AI whiteboard", 80),
      color: cleanText(payload.color, "sage", 20),
    });
    return { message: `Created whiteboard "${board.name}".`, link: "/whiteboard", data: board };
  }

  if (action.type === "generate_whiteboard_diagram") {
    const prompt = cleanLongText(payload.prompt ?? payload.description, action.summary, 2000);
    const diagram = await generateWhiteboardDiagram(prompt);
    return { message: `Generated a ${diagram.kind} diagram idea: ${diagram.title}.`, link: "/whiteboard", data: diagram };
  }

  if (action.type === "generate_template_app") {
    const prompt = cleanLongText(payload.prompt ?? payload.description, action.summary, 2000);
    const app = await generateGeneratedApp(prompt);
    return { message: `Generated "${app.appName}".`, link: `/ai-template-builder/${app.id}`, data: app };
  }

  if (action.type === "update_settings") {
    const settings = await updateUserSettings(payload);
    return { message: "Updated your settings.", link: "/settings", data: settings };
  }

  throw new Error("Unsupported assistant action.");
}
