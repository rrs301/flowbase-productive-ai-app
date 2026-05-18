"use server";

import { GoogleGenAI } from "@google/genai";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, users, whiteboards } from "@/db";
import { assertAiFeatureEnabled, assertFreePlanLimit, recordAiAction } from "@/lib/user-preferences";

const whiteboardColors = ["sage", "clay", "amber", "sky", "violet"] as const;
const GEMINI_MODEL = "gemini-2.5-flash";

export type WhiteboardColor = (typeof whiteboardColors)[number];
export type WhiteboardScene = Record<string, unknown>;
export type WhiteboardFiles = Record<string, unknown>;

export type WhiteboardDTO = {
  id: number;
  name: string;
  color: WhiteboardColor;
  scene: WhiteboardScene;
  files: WhiteboardFiles;
  createdAt: string;
  updatedAt: string;
};

export type DiagramKind = "flowchart" | "mindmap" | "architecture" | "journey" | "process";

export type GeneratedDiagramNode = {
  id: string;
  label: string;
  detail?: string;
  group?: string;
};

export type GeneratedDiagramEdge = {
  from: string;
  to: string;
  label?: string;
};

export type GeneratedDiagram = {
  title: string;
  kind: DiagramKind;
  nodes: GeneratedDiagramNode[];
  edges: GeneratedDiagramEdge[];
};

function normalizeColor(value?: string | null): WhiteboardColor {
  return whiteboardColors.includes(value as WhiteboardColor) ? (value as WhiteboardColor) : "sage";
}

function cleanName(value: string) {
  const name = value.trim().slice(0, 80);
  return name || "Untitled whiteboard";
}

function safeJsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toDTO(board: typeof whiteboards.$inferSelect): WhiteboardDTO {
  return {
    id: board.id,
    name: board.name,
    color: normalizeColor(board.color),
    scene: safeJsonRecord(board.scene),
    files: safeJsonRecord(board.files),
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  };
}

function sortBoards(left: WhiteboardDTO, right: WhiteboardDTO) {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() || right.id - left.id;
}

async function getCurrentDatabaseUserId() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const clerkId = user?.id;

  if (!email || !clerkId) {
    throw new Error("You must be signed in to manage whiteboards.");
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

async function assertWhiteboardAccess(boardId: number, userId: number) {
  const board = await db.query.whiteboards.findFirst({
    where: and(eq(whiteboards.id, boardId), eq(whiteboards.userId, userId)),
  });

  if (!board) {
    throw new Error("Whiteboard not found.");
  }

  return board;
}

export async function listWhiteboards() {
  const userId = await getCurrentDatabaseUserId();
  const userBoards = await db.query.whiteboards.findMany({
    where: eq(whiteboards.userId, userId),
  });

  return userBoards.map(toDTO).sort(sortBoards);
}

export async function createWhiteboard(input?: { name?: string; color?: string }) {
  await assertFreePlanLimit("whiteboards");
  const userId = await getCurrentDatabaseUserId();
  const existing = await db.query.whiteboards.findMany({
    where: eq(whiteboards.userId, userId),
    columns: { id: true },
  });
  const color = normalizeColor(input?.color || whiteboardColors[existing.length % whiteboardColors.length]);
  const now = new Date();
  const [board] = await db
    .insert(whiteboards)
    .values({
      userId,
      name: cleanName(input?.name || "Untitled whiteboard"),
      color,
      scene: {
        elements: [],
        appState: {
          viewBackgroundColor: "#fffdf8",
        },
      },
      files: {},
      updatedAt: now,
    })
    .returning();

  revalidatePath("/whiteboard");
  return toDTO(board);
}

export async function renameWhiteboard(boardId: number, name: string) {
  const userId = await getCurrentDatabaseUserId();
  await assertWhiteboardAccess(boardId, userId);

  const [board] = await db
    .update(whiteboards)
    .set({ name: cleanName(name), updatedAt: new Date() })
    .where(and(eq(whiteboards.id, boardId), eq(whiteboards.userId, userId)))
    .returning();

  revalidatePath("/whiteboard");
  return toDTO(board);
}

export async function deleteWhiteboard(boardId: number) {
  const userId = await getCurrentDatabaseUserId();
  await assertWhiteboardAccess(boardId, userId);
  await db.delete(whiteboards).where(and(eq(whiteboards.id, boardId), eq(whiteboards.userId, userId)));
  revalidatePath("/whiteboard");
  const remaining = await listWhiteboards();
  if (remaining.length) return remaining;
  return [await createWhiteboard()];
}

export async function updateWhiteboardScene(boardId: number, input: { scene: WhiteboardScene; files: WhiteboardFiles }) {
  const userId = await getCurrentDatabaseUserId();
  await assertWhiteboardAccess(boardId, userId);

  const [board] = await db
    .update(whiteboards)
    .set({
      scene: safeJsonRecord(input.scene),
      files: safeJsonRecord(input.files),
      updatedAt: new Date(),
    })
    .where(and(eq(whiteboards.id, boardId), eq(whiteboards.userId, userId)))
    .returning();

  return toDTO(board);
}

function cleanDiagramKind(value: unknown): DiagramKind {
  const kind = typeof value === "string" ? value.toLowerCase() : "";
  if (kind === "mindmap" || kind === "architecture" || kind === "journey" || kind === "process") return kind;
  return "flowchart";
}

function cleanDiagram(input: unknown): GeneratedDiagram {
  const data = safeJsonRecord(input);
  const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
  const nodes = rawNodes
    .map((node, index): GeneratedDiagramNode | null => {
      const record = safeJsonRecord(node);
      const label = typeof record.label === "string" ? record.label.trim().slice(0, 80) : "";
      if (!label) return null;
      const nextNode: GeneratedDiagramNode = {
        id: typeof record.id === "string" && record.id.trim() ? record.id.trim().slice(0, 40) : `node-${index + 1}`,
        label,
      };
      const detail = typeof record.detail === "string" ? record.detail.trim().slice(0, 140) : "";
      const group = typeof record.group === "string" ? record.group.trim().slice(0, 60) : "";
      if (detail) nextNode.detail = detail;
      if (group) nextNode.group = group;
      return nextNode;
    })
    .filter((node): node is GeneratedDiagramNode => Boolean(node))
    .slice(0, 14);

  const nodeIds = new Set(nodes.map((node) => node.id));
  const rawEdges = Array.isArray(data.edges) ? data.edges : [];
  const edges = rawEdges
    .map((edge): GeneratedDiagramEdge | null => {
      const record = safeJsonRecord(edge);
      const from = typeof record.from === "string" ? record.from.trim() : "";
      const to = typeof record.to === "string" ? record.to.trim() : "";
      if (!nodeIds.has(from) || !nodeIds.has(to) || from === to) return null;
      const nextEdge: GeneratedDiagramEdge = {
        from,
        to,
      };
      const label = typeof record.label === "string" ? record.label.trim().slice(0, 60) : "";
      if (label) nextEdge.label = label;
      return nextEdge;
    })
    .filter((edge): edge is GeneratedDiagramEdge => Boolean(edge))
    .slice(0, 20);

  if (!nodes.length) {
    throw new Error("Gemini did not return usable diagram nodes.");
  }

  return {
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim().slice(0, 90) : "Generated diagram",
    kind: cleanDiagramKind(data.kind),
    nodes,
    edges,
  };
}

function parseJsonResponse(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return JSON.");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function generateWhiteboardDiagram(prompt: string): Promise<GeneratedDiagram> {
  await assertAiFeatureEnabled("aiDiagramEnabled");
  await recordAiAction();
  await getCurrentDatabaseUserId();
  const cleanPrompt = prompt.trim().slice(0, 2000);
  if (!cleanPrompt) {
    throw new Error("Enter a prompt for the diagram.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini is not configured. Add GEMINI_API_KEY to enable AI diagrams.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      "Return only strict JSON for a diagram to insert into Excalidraw.",
      'Schema: {"title":"string","kind":"flowchart|mindmap|architecture|journey|process","nodes":[{"id":"short-id","label":"short text","detail":"optional short detail","group":"optional group"}],"edges":[{"from":"node id","to":"node id","label":"optional short label"}]}',
      "Use 4 to 10 nodes. Keep labels concise. Edges must reference existing node ids. No markdown fences.",
      `User prompt: ${cleanPrompt}`,
    ].join("\n\n"),
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini did not return a diagram.");
  }

  return cleanDiagram(parseJsonResponse(text));
}
