"use server";

import { GoogleGenAI } from "@google/genai";
import { currentUser } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, generatedApps, users } from "@/db";
import { assertAiFeatureEnabled, isCurrentUserPro, recordAiAction } from "@/lib/user-preferences";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const SIDEBAR_LIMIT = 3;
const allowedIcons = [
  "Activity",
  "BadgeDollarSign",
  "BookOpen",
  "CalendarDays",
  "CheckCircle2",
  "ClipboardList",
  "Dumbbell",
  "Flame",
  "GraduationCap",
  "Heart",
  "LayoutTemplate",
  "ListChecks",
  "NotebookPen",
  "PiggyBank",
  "Sparkles",
  "Target",
  "Utensils",
] as const;

const componentTypes = ["stats", "list", "table", "form", "progress", "checklist", "buttons", "tags", "chart"] as const;

export type GeneratedComponentType = (typeof componentTypes)[number];

export type GeneratedComponent = {
  id: string;
  type: GeneratedComponentType;
  title: string;
  description?: string;
  fields?: { label: string; type?: string; placeholder?: string; value?: string }[];
  items?: Record<string, unknown>[];
  columns?: string[];
  rows?: Record<string, unknown>[];
  actions?: { label: string; variant?: string }[];
  value?: number;
  max?: number;
  labels?: string[];
};

export type GeneratedSection = {
  id: string;
  title: string;
  description?: string;
  components: GeneratedComponent[];
};

export type GeneratedAppDefinition = {
  appName: string;
  description: string;
  icon: string;
  color: string;
  layout: "single-page";
  sections: GeneratedSection[];
  actions: { label: string; variant?: string }[];
  sampleData: Record<string, unknown>[];
};

export type GeneratedComponentState = {
  items?: Record<string, unknown>[];
  rows?: Record<string, unknown>[];
  labels?: string[];
  checked?: number[];
  value?: number;
  formValues?: Record<string, string>;
  clicks?: Record<string, number>;
};

export type GeneratedAppState = {
  components: Record<string, GeneratedComponentState>;
};

export type GeneratedAppDTO = {
  id: number;
  appName: string;
  description: string;
  icon: string;
  color: string;
  layout: string;
  definition: GeneratedAppDefinition;
  appState: GeneratedAppState;
  isInSidebar: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedSidebarAppDTO = {
  id: number;
  appName: string;
  icon: string;
  color: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanAppState(value: unknown): GeneratedAppState {
  const data = asRecord(value);
  const components = asRecord(data.components);
  const nextComponents: Record<string, GeneratedComponentState> = {};

  for (const [componentId, rawState] of Object.entries(components).slice(0, 80)) {
    const record = asRecord(rawState);
    nextComponents[componentId.slice(0, 80)] = {
      items: cleanRecordArray(record.items, [], 40),
      rows: cleanRecordArray(record.rows, [], 40),
      labels: cleanStringArray(record.labels, [], 40),
      checked: Array.isArray(record.checked)
        ? record.checked
            .map((item) => (typeof item === "number" && Number.isInteger(item) ? item : null))
            .filter((item): item is number => item !== null && item >= 0 && item <= 200)
            .slice(0, 200)
        : [],
      value: typeof record.value === "number" && Number.isFinite(record.value) ? Math.max(0, Math.min(100, record.value)) : undefined,
      formValues: Object.fromEntries(
        Object.entries(asRecord(record.formValues))
          .slice(0, 20)
          .map(([key, item]) => [key.slice(0, 80), cleanText(item, "", 300)]),
      ),
      clicks: Object.fromEntries(
        Object.entries(asRecord(record.clicks))
          .slice(0, 20)
          .map(([key, item]) => [key.slice(0, 80), typeof item === "number" && Number.isFinite(item) ? Math.max(0, Math.min(999, item)) : 0]),
      ),
    };
  }

  return { components: nextComponents };
}

function cleanText(value: unknown, fallback: string, maxLength = 140) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return (text || fallback).slice(0, maxLength);
}

function cleanColor(value: unknown) {
  const color = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : "#F97316";
}

function cleanIcon(value: unknown) {
  const icon = cleanText(value, "LayoutTemplate", 40);
  return allowedIcons.includes(icon as (typeof allowedIcons)[number]) ? icon : "LayoutTemplate";
}

function cleanComponentType(value: unknown): GeneratedComponentType {
  const type = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (type === "stats cards" || type === "stat" || type === "stats-card") return "stats";
  if (type === "progress bar" || type === "progress-bar") return "progress";
  if (type === "checklists") return "checklist";
  if (type === "button" || type === "actions") return "buttons";
  if (type === "chart placeholder" || type === "chart-placeholder") return "chart";
  return componentTypes.includes(type as GeneratedComponentType) ? (type as GeneratedComponentType) : "list";
}

function cleanStringArray(value: unknown, fallback: string[], maxItems = 6) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item) => cleanText(item, "", 60)).filter(Boolean).slice(0, maxItems);
}

function cleanRecordArray(value: unknown, fallback: Record<string, unknown>[], maxItems = 8) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map(asRecord).filter((item) => Object.keys(item).length > 0).slice(0, maxItems);
}

function cleanActions(value: unknown) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item) => {
      const record = asRecord(item);
      return {
        label: cleanText(record.label ?? record.name, "", 48),
        variant: cleanText(record.variant, "primary", 24),
      };
    })
    .filter((action) => action.label)
    .slice(0, 5);
}

function defaultComponents(appName: string): GeneratedComponent[] {
  return [
    {
      id: "stats-1",
      type: "stats",
      title: "Today at a glance",
      items: [
        { label: "Active", value: "8" },
        { label: "Done", value: "5" },
        { label: "Progress", value: "62%" },
      ],
    },
    {
      id: "list-1",
      type: "list",
      title: `${appName} plan`,
      items: [
        { title: "Start with one clear next step", meta: "Today" },
        { title: "Review progress", meta: "This week" },
      ],
    },
  ];
}

function cleanComponent(value: unknown, index: number): GeneratedComponent {
  const record = asRecord(value);
  const type = cleanComponentType(record.type ?? record.componentType ?? record.blockType);
  const title = cleanText(record.title ?? record.name, `${type[0].toUpperCase()}${type.slice(1)} block`, 80);
  const columns = cleanStringArray(record.columns, ["Item", "Status", "Notes"], 5);

  return {
    id: cleanText(record.id, `component-${index + 1}`, 48),
    type,
    title,
    description: typeof record.description === "string" ? cleanText(record.description, "", 160) : undefined,
    fields: cleanRecordArray(record.fields, [], 8).map((field) => ({
      label: cleanText(field.label ?? field.name, "Field", 48),
      type: cleanText(field.type, "text", 24),
      placeholder: typeof field.placeholder === "string" ? cleanText(field.placeholder, "", 80) : undefined,
      value: typeof field.value === "string" ? cleanText(field.value, "", 80) : undefined,
    })),
    items: cleanRecordArray(record.items ?? record.cards ?? record.stats, [], 8),
    columns,
    rows: cleanRecordArray(record.rows, [], 8),
    actions: cleanActions(record.actions ?? record.buttons),
    value: typeof record.value === "number" && Number.isFinite(record.value) ? Math.max(0, Math.min(100, record.value)) : undefined,
    max: typeof record.max === "number" && Number.isFinite(record.max) ? Math.max(1, record.max) : undefined,
    labels: cleanStringArray(record.labels ?? record.tags, [], 10),
  };
}

function cleanDefinition(input: unknown): GeneratedAppDefinition {
  const data = asRecord(input);
  const appName = cleanText(data.appName ?? data.name ?? data.title, "Generated App", 80);
  const description = cleanText(data.description, "A focused single-page productivity template.", 180);
  const icon = cleanIcon(data.icon);
  const color = cleanColor(data.color ?? data.themeColor ?? data.theme_color);

  const rawSections = Array.isArray(data.sections) ? data.sections : [];
  const sections = rawSections
    .map((section, sectionIndex): GeneratedSection | null => {
      const record = asRecord(section);
      const rawComponents = Array.isArray(record.components) ? record.components : Array.isArray(record.blocks) ? record.blocks : [];
      const components = rawComponents.map(cleanComponent).filter(Boolean).slice(0, 6);
      if (!components.length) return null;
      return {
        id: cleanText(record.id, `section-${sectionIndex + 1}`, 48),
        title: cleanText(record.title ?? record.name, sectionIndex === 0 ? "Overview" : "Workspace", 80),
        description: typeof record.description === "string" ? cleanText(record.description, "", 160) : undefined,
        components,
      };
    })
    .filter((section): section is GeneratedSection => Boolean(section))
    .slice(0, 5);

  const topLevelComponents = Array.isArray(data.components) ? data.components.map(cleanComponent).slice(0, 6) : [];
  const finalSections =
    sections.length > 0
      ? sections
      : [
          {
            id: "section-1",
            title: "Overview",
            description,
            components: topLevelComponents.length > 0 ? topLevelComponents : defaultComponents(appName),
          },
        ];

  return {
    appName,
    description,
    icon,
    color,
    layout: "single-page",
    sections: finalSections,
    actions: cleanActions(data.actions),
    sampleData: cleanRecordArray(data.sampleData ?? data.sample_data, [], 12),
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

function toDTO(app: typeof generatedApps.$inferSelect): GeneratedAppDTO {
  const definition = cleanDefinition(app.definition);
  return {
    id: app.id,
    appName: app.appName,
    description: app.description,
    icon: cleanIcon(app.icon),
    color: cleanColor(app.color),
    layout: app.layout,
    definition,
    appState: cleanAppState(app.appState),
    isInSidebar: app.isInSidebar,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

async function getCurrentDatabaseUserId() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const clerkId = user?.id;

  if (!email || !clerkId) {
    throw new Error("You must be signed in to manage generated apps.");
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

async function assertGeneratedAppAccess(appId: number, userId: number) {
  const app = await db.query.generatedApps.findFirst({
    where: and(eq(generatedApps.id, appId), eq(generatedApps.userId, userId)),
  });

  if (!app) {
    throw new Error("Generated app not found.");
  }

  return app;
}

export async function listGeneratedApps() {
  const userId = await getCurrentDatabaseUserId();
  const apps = await db.query.generatedApps.findMany({
    where: eq(generatedApps.userId, userId),
    orderBy: [desc(generatedApps.updatedAt), desc(generatedApps.id)],
  });

  return apps.map(toDTO);
}

export async function listSidebarGeneratedApps(): Promise<GeneratedSidebarAppDTO[]> {
  const userId = await getCurrentDatabaseUserId();
  const apps = await db.query.generatedApps.findMany({
    where: and(eq(generatedApps.userId, userId), eq(generatedApps.isInSidebar, true)),
    orderBy: [desc(generatedApps.updatedAt), desc(generatedApps.id)],
    limit: SIDEBAR_LIMIT,
  });

  return apps.map((app) => ({
    id: app.id,
    appName: app.appName,
    icon: cleanIcon(app.icon),
    color: cleanColor(app.color),
  }));
}

export async function getGeneratedApp(appId: number) {
  const userId = await getCurrentDatabaseUserId();
  return toDTO(await assertGeneratedAppAccess(appId, userId));
}

export async function generateGeneratedApp(prompt: string) {
  if (!(await isCurrentUserPro())) {
    throw new Error("AI Template Builder is available on the Pro plan.");
  }
  await assertAiFeatureEnabled("aiTemplateBuilderEnabled");
  await recordAiAction();
  const userId = await getCurrentDatabaseUserId();
  const cleanPrompt = prompt.trim().slice(0, 2000);
  if (!cleanPrompt) {
    throw new Error("Enter an app idea first.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini is not configured. Add GEMINI_API_KEY to enable AI Template Builder.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      "Return only strict JSON for a single-page mini productivity app/template. No markdown fences or commentary.",
      'Schema: {"appName":"string","description":"string","icon":"Activity|BadgeDollarSign|BookOpen|CalendarDays|CheckCircle2|ClipboardList|Dumbbell|Flame|GraduationCap|Heart|LayoutTemplate|ListChecks|NotebookPen|PiggyBank|Sparkles|Target|Utensils","color":"#RRGGBB","layout":"single-page","sections":[{"id":"short-id","title":"string","description":"optional string","components":[{"id":"short-id","type":"stats|list|table|form|progress|checklist|buttons|tags|chart","title":"string","description":"optional string","fields":[{"label":"string","type":"text|number|date|select|textarea","placeholder":"optional string"}],"items":[{"label":"string","value":"string","title":"string","meta":"string","status":"string"}],"columns":["string"],"rows":[{"Column":"Value"}],"actions":[{"label":"string","variant":"primary|secondary"}],"value":number,"max":number,"labels":["string"]}]}],"actions":[{"label":"string","variant":"primary|secondary"}],"sampleData":[{}]}',
      "Use 2 to 4 sections and include a useful mix of stats, list/table/form/progress/checklist/buttons/tags/chart components when appropriate. Keep copy concise and practical.",
      `User prompt: ${cleanPrompt}`,
    ].join("\n\n"),
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini did not return a generated app.");
  }

  const definition = cleanDefinition(parseJsonResponse(text));
  const now = new Date();
  const [app] = await db
    .insert(generatedApps)
    .values({
      userId,
      appName: definition.appName,
      description: definition.description,
      icon: definition.icon,
      color: definition.color,
      layout: definition.layout,
      definition,
      appState: { components: {} },
      updatedAt: now,
    })
    .returning();

  revalidatePath("/ai-template-builder");
  return toDTO(app);
}

export async function toggleGeneratedAppSidebar(appId: number, shouldShow: boolean) {
  const userId = await getCurrentDatabaseUserId();
  const app = await assertGeneratedAppAccess(appId, userId);

  if (shouldShow && !app.isInSidebar) {
    const existing = await db.query.generatedApps.findMany({
      where: and(eq(generatedApps.userId, userId), eq(generatedApps.isInSidebar, true)),
      columns: { id: true },
    });

    if (existing.length >= SIDEBAR_LIMIT) {
      throw new Error("You can add up to 3 generated apps to the sidebar.");
    }
  }

  const [updated] = await db
    .update(generatedApps)
    .set({ isInSidebar: shouldShow, updatedAt: new Date() })
    .where(and(eq(generatedApps.id, appId), eq(generatedApps.userId, userId)))
    .returning();

  revalidatePath("/ai-template-builder");
  revalidatePath(`/ai-template-builder/${appId}`);
  return toDTO(updated);
}

export async function updateGeneratedAppState(appId: number, state: GeneratedAppState) {
  const userId = await getCurrentDatabaseUserId();
  await assertGeneratedAppAccess(appId, userId);
  const nextState = cleanAppState(state);

  if (JSON.stringify(nextState).length > 50000) {
    throw new Error("This generated app has reached its saved data limit.");
  }

  const [updated] = await db
    .update(generatedApps)
    .set({ appState: nextState, updatedAt: new Date() })
    .where(and(eq(generatedApps.id, appId), eq(generatedApps.userId, userId)))
    .returning();

  revalidatePath("/ai-template-builder");
  revalidatePath(`/ai-template-builder/${appId}`);
  return toDTO(updated);
}

export async function deleteGeneratedApp(appId: number) {
  const userId = await getCurrentDatabaseUserId();
  await assertGeneratedAppAccess(appId, userId);
  await db.delete(generatedApps).where(and(eq(generatedApps.id, appId), eq(generatedApps.userId, userId)));

  revalidatePath("/ai-template-builder");
  revalidatePath(`/ai-template-builder/${appId}`);
  return listGeneratedApps();
}
