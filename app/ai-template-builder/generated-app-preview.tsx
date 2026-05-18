"use client";

import { BarChart3, Check, Circle, MousePointer2, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";

import { updateGeneratedAppState } from "@/app/ai-template-builder/actions";
import type {
  GeneratedAppDefinition,
  GeneratedAppState,
  GeneratedComponent,
  GeneratedComponentState,
} from "@/app/ai-template-builder/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGeneratedAppIcon } from "@/lib/generated-app-icons";
import { cn } from "@/lib/utils";

type GeneratedAppPreviewProps = {
  appId: number;
  definition: GeneratedAppDefinition;
  appState: GeneratedAppState;
  compact?: boolean;
  onStateChange?: (state: GeneratedAppState) => void;
};

type RuntimeProps = {
  component: GeneratedComponent;
  color: string;
  state: GeneratedComponentState;
  updateState: (next: GeneratedComponentState) => void;
};

function displayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "";
}

function firstText(record: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = displayValue(record[key]).trim();
    if (value) return value;
  }
  return fallback;
}

function labelKey(label: string) {
  return label.trim() || "Value";
}

export function GeneratedAppPreview({ appId, definition, appState, compact = false, onStateChange }: GeneratedAppPreviewProps) {
  const Icon = getGeneratedAppIcon(definition.icon);
  const [state, setState] = useState<GeneratedAppState>(appState?.components ? appState : { components: {} });
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [, startTransition] = useTransition();

  function updateComponentState(componentId: string, nextComponentState: GeneratedComponentState) {
    const nextState = {
      components: {
        ...state.components,
        [componentId]: nextComponentState,
      },
    };

    setState(nextState);
    onStateChange?.(nextState);
    setSaveMessage("Saving...");
    setSaveError("");
    startTransition(async () => {
      try {
        await updateGeneratedAppState(appId, nextState);
        setSaveMessage("Saved");
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Could not save this app.");
        setSaveMessage("");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-background/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
              style={{ backgroundColor: definition.color }}
            >
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase leading-5 text-primary">Functional generated app</p>
              <h2 className="break-words text-2xl font-semibold leading-tight text-foreground">{definition.appName}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{definition.description}</p>
              {(saveMessage || saveError) && (
                <p className={cn("mt-2 text-xs", saveError ? "text-destructive" : "text-muted-foreground")}>
                  {saveError || saveMessage}
                </p>
              )}
            </div>
          </div>
          {definition.actions.length > 0 && !compact && (
            <div className="flex shrink-0 flex-wrap gap-2">
              {definition.actions.map((action) => (
                <Button key={action.label} type="button" variant={action.variant === "secondary" ? "outline" : "default"} className="rounded-lg" size="sm">
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={cn("space-y-5 p-4 sm:p-5", compact && "max-h-[34rem] overflow-hidden")}>
        {definition.sections.map((section) => (
          <section key={section.id} className="space-y-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
              {section.description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.description}</p>}
            </div>
            <div className="grid min-w-0 gap-3 xl:grid-cols-2">
              {section.components.map((component) => (
                <PreviewComponent
                  key={component.id}
                  component={component}
                  color={definition.color}
                  state={state.components[component.id] ?? {}}
                  updateState={(next) => updateComponentState(component.id, next)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PreviewComponent(props: RuntimeProps) {
  if (props.component.type === "stats") return <StatsBlock {...props} />;
  if (props.component.type === "table") return <TableBlock {...props} />;
  if (props.component.type === "form") return <FormBlock {...props} />;
  if (props.component.type === "progress") return <ProgressBlock {...props} />;
  if (props.component.type === "checklist") return <ChecklistBlock {...props} />;
  if (props.component.type === "buttons") return <ButtonsBlock {...props} />;
  if (props.component.type === "tags") return <TagsBlock {...props} />;
  if (props.component.type === "chart") return <ChartBlock {...props} />;
  return <ListBlock {...props} />;
}

function BlockShell({ component, children }: { component: GeneratedComponent; children: ReactNode }) {
  return (
    <Card className="min-w-0 rounded-lg border-border bg-background shadow-none">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="break-words text-sm leading-5">{component.title}</CardTitle>
        {component.description && <p className="text-xs leading-5 text-muted-foreground">{component.description}</p>}
      </CardHeader>
      <CardContent className="min-w-0 p-4 pt-1">{children}</CardContent>
    </Card>
  );
}

function StatsBlock({ component, color, state, updateState }: RuntimeProps) {
  const items = state.items?.length ? state.items : component.items?.length ? component.items : [{ label: "Progress", value: "72%" }];
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");

  function addMetric() {
    const nextLabel = label.trim();
    const nextValue = value.trim();
    if (!nextLabel || !nextValue) return;
    updateState({ ...state, items: [{ label: nextLabel, value: nextValue }, ...items].slice(0, 40) });
    setLabel("");
    setValue("");
  }

  return (
    <BlockShell component={component}>
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_0.75fr_auto]">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="h-9 min-w-0 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
          placeholder="Metric"
        />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-9 min-w-0 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
          placeholder="Value"
        />
        <Button type="button" size="sm" className="rounded-lg" onClick={addMetric}>
          <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
          Add
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
        {items.slice(0, 6).map((item, index) => (
          <div key={index} className="flex min-w-0 gap-2 rounded-lg border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">{firstText(item, ["label", "title", "name"], `Metric ${index + 1}`)}</p>
              <p className="mt-2 break-words text-2xl font-semibold" style={{ color }}>
                {firstText(item, ["value", "count", "total"], String(index + 1))}
              </p>
            </div>
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
              aria-label="Delete metric"
              onClick={() => updateState({ ...state, items: items.filter((_, itemIndex) => itemIndex !== index) })}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </BlockShell>
  );
}

function ListBlock({ component, color, state, updateState }: RuntimeProps) {
  const items = state.items?.length ? state.items : component.items?.length ? component.items : [{ title: "Add your first item", meta: "Today" }];
  const [title, setTitle] = useState("");

  function addItem() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    updateState({ ...state, items: [{ title: nextTitle, meta: "Added now" }, ...items].slice(0, 40) });
    setTitle("");
  }

  return (
    <BlockShell component={component}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
          placeholder="Add an item"
        />
        <Button type="button" size="sm" className="rounded-lg" onClick={addItem}>
          <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {items.slice(0, 8).map((item, index) => (
          <div key={index} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{firstText(item, ["title", "label", "name"], `Item ${index + 1}`)}</p>
              <p className="truncate text-xs text-muted-foreground">{firstText(item, ["meta", "status", "description"], "Ready")}</p>
            </div>
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
              aria-label="Delete item"
              onClick={() => updateState({ ...state, items: items.filter((_, itemIndex) => itemIndex !== index) })}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </BlockShell>
  );
}

function TableBlock({ component, color, state, updateState }: RuntimeProps) {
  const columns = component.columns?.length ? component.columns : ["Item", "Status", "Notes"];
  const rows = state.rows?.length ? state.rows : component.rows?.length ? component.rows : [{ Item: "Example row", Status: "Planned", Notes: "Sample" }];
  const [draft, setDraft] = useState<Record<string, string>>({});

  function addRow() {
    const row = Object.fromEntries(columns.map((column) => [column, draft[column]?.trim() || "-"]));
    updateState({ ...state, rows: [row, ...rows].slice(0, 40) });
    setDraft({});
  }

  return (
    <BlockShell component={component}>
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        {columns.slice(0, 4).map((column) => (
          <input
            key={column}
            value={draft[column] ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, [column]: event.target.value }))}
            className="h-9 min-w-0 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
            placeholder={column}
          />
        ))}
        <Button type="button" size="sm" className="rounded-lg sm:col-span-2" onClick={addRow}>
          <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
          Add row
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <div className="min-w-[34rem]">
          <div className="grid text-xs font-semibold text-muted-foreground" style={{ gridTemplateColumns: `repeat(${columns.length + 1}, minmax(7rem, 1fr))` }}>
            {columns.map((column) => (
              <div key={column} className="border-b border-border px-3 py-2" style={{ color }}>
                {column}
              </div>
            ))}
            <div className="border-b border-border px-3 py-2 text-right">Action</div>
          </div>
          {rows.slice(0, 8).map((row, rowIndex) => (
            <div key={rowIndex} className="grid text-sm" style={{ gridTemplateColumns: `repeat(${columns.length + 1}, minmax(7rem, 1fr))` }}>
              {columns.map((column) => (
                <div key={column} className="min-w-0 truncate border-b border-border/70 px-3 py-2">
                  {displayValue(row[column]) || firstText(row, [column.toLowerCase(), column], rowIndex === 0 ? "Sample" : "-")}
                </div>
              ))}
              <div className="border-b border-border/70 px-3 py-1.5 text-right">
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
                  aria-label="Delete row"
                  onClick={() => updateState({ ...state, rows: rows.filter((_, index) => index !== rowIndex) })}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BlockShell>
  );
}

function FormBlock({ component, color, state, updateState }: RuntimeProps) {
  const fields = component.fields?.length ? component.fields : [{ label: "Name", type: "text", placeholder: "Add details" }];
  const formValues = state.formValues ?? {};
  const entries = state.items ?? [];

  function updateField(label: string, value: string) {
    updateState({ ...state, formValues: { ...formValues, [labelKey(label)]: value } });
  }

  function addEntry() {
    const entry = Object.fromEntries(fields.map((field) => [labelKey(field.label), formValues[labelKey(field.label)]?.trim() || field.placeholder || "-"]));
    updateState({ ...state, items: [entry, ...entries].slice(0, 40), formValues: {} });
  }

  return (
    <BlockShell component={component}>
      <div className="space-y-3">
        {fields.slice(0, 8).map((field) => (
          <label key={field.label} className="block">
            <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
            {field.type === "textarea" ? (
              <textarea
                value={formValues[labelKey(field.label)] ?? ""}
                onChange={(event) => updateField(field.label, event.target.value)}
                className="mt-1 min-h-20 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                placeholder={field.placeholder || field.value || field.label}
              />
            ) : (
              <input
                value={formValues[labelKey(field.label)] ?? ""}
                onChange={(event) => updateField(field.label, event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
                type={field.type === "number" || field.type === "date" ? field.type : "text"}
                placeholder={field.placeholder || field.value || field.label}
              />
            )}
          </label>
        ))}
        <Button type="button" size="sm" className="rounded-lg" style={{ backgroundColor: color }} onClick={addEntry}>
          <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
          Save entry
        </Button>
        {entries.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            {entries.slice(0, 4).map((entry, index) => (
              <div key={index} className="rounded-lg border border-border bg-card p-3 text-xs leading-5 text-muted-foreground">
                {Object.entries(entry)
                  .slice(0, 4)
                  .map(([key, value]) => `${key}: ${displayValue(value)}`)
                  .join(" • ")}
              </div>
            ))}
          </div>
        )}
      </div>
    </BlockShell>
  );
}

function ProgressBlock({ component, color, state, updateState }: RuntimeProps) {
  const value = Math.max(0, Math.min(100, state.value ?? component.value ?? 68));
  return (
    <BlockShell component={component}>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Completion</span>
          <span className="font-semibold">{value}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          className="w-full accent-[var(--primary)]"
          onChange={(event) => updateState({ ...state, value: Number(event.target.value) })}
        />
      </div>
    </BlockShell>
  );
}

function ChecklistBlock({ component, color, state, updateState }: RuntimeProps) {
  const items = useMemo(
    () => (state.items?.length ? state.items : component.items?.length ? component.items : [{ title: "First step" }, { title: "Review progress" }, { title: "Celebrate completion" }]),
    [component.items, state.items],
  );
  const checked = new Set(state.checked ?? []);
  const [title, setTitle] = useState("");

  function toggleItem(index: number) {
    const next = new Set(checked);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    updateState({ ...state, checked: Array.from(next).sort((left, right) => left - right), items });
  }

  function addItem() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    updateState({ ...state, items: [...items, { title: nextTitle }].slice(0, 40) });
    setTitle("");
  }

  return (
    <BlockShell component={component}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
          placeholder="Add checklist item"
        />
        <Button type="button" size="sm" className="rounded-lg" onClick={addItem}>
          <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {items.slice(0, 10).map((item, index) => {
          const active = checked.has(index);
          return (
            <button
              key={index}
              type="button"
              className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              onClick={() => toggleItem(index)}
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full border"
                style={{ borderColor: active ? color : undefined, backgroundColor: active ? color : undefined }}
              >
                {active ? <Check className="size-3 text-white" aria-hidden="true" /> : <Circle className="size-3 text-muted-foreground" aria-hidden="true" />}
              </span>
              <span className={cn("min-w-0 flex-1 truncate", active && "text-muted-foreground line-through")}>
                {firstText(item, ["title", "label", "name"], `Checklist item ${index + 1}`)}
              </span>
            </button>
          );
        })}
      </div>
    </BlockShell>
  );
}

function ButtonsBlock({ component, state, updateState }: RuntimeProps) {
  const actions = component.actions?.length ? component.actions : [{ label: "Save" }, { label: "Review", variant: "secondary" }];
  const clicks = state.clicks ?? {};
  return (
    <BlockShell component={component}>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            type="button"
            size="sm"
            variant={action.variant === "secondary" ? "outline" : "default"}
            className="rounded-lg"
            onClick={() => updateState({ ...state, clicks: { ...clicks, [action.label]: (clicks[action.label] ?? 0) + 1 } })}
          >
            <MousePointer2 className="mr-1.5 size-3.5" aria-hidden="true" />
            {action.label}
            {clicks[action.label] ? ` (${clicks[action.label]})` : ""}
          </Button>
        ))}
      </div>
    </BlockShell>
  );
}

function TagsBlock({ component, color, state, updateState }: RuntimeProps) {
  const labels =
    state.labels?.length ? state.labels : component.labels?.length ? component.labels : component.items?.map((item) => firstText(item, ["label", "title", "name"], "")).filter(Boolean) || [];
  const [label, setLabel] = useState("");

  function addLabel() {
    const nextLabel = label.trim();
    if (!nextLabel) return;
    updateState({ ...state, labels: [nextLabel, ...(labels.length ? labels : ["Focus", "Weekly", "In progress"])].slice(0, 40) });
    setLabel("");
  }

  return (
    <BlockShell component={component}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/15"
          placeholder="Add tag"
        />
        <Button type="button" size="sm" className="rounded-lg" onClick={addLabel}>
          <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(labels.length ? labels : ["Focus", "Weekly", "In progress"]).slice(0, 16).map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:bg-accent"
            style={{ borderColor: `${color}55`, color }}
            onClick={() => updateState({ ...state, labels: labels.filter((current) => current !== item) })}
            title="Click to remove"
          >
            {item}
          </button>
        ))}
      </div>
    </BlockShell>
  );
}

function ChartBlock({ component, color, state, updateState }: RuntimeProps) {
  const value = Math.max(0, Math.min(100, state.value ?? component.value ?? 64));
  const bars = [Math.max(12, value - 28), value, Math.max(12, value - 16), Math.min(100, value + 18), Math.max(12, value - 4), Math.min(100, value + 28)];
  return (
    <BlockShell component={component}>
      <div className="flex h-40 items-end gap-2 rounded-lg border border-border bg-card p-3">
        <BarChart3 className="absolute size-0" aria-hidden="true" />
        {bars.map((height, index) => (
          <div key={index} className="flex flex-1 items-end">
            <div className="w-full rounded-t-md" style={{ height: `${height}%`, backgroundColor: `${color}${index % 2 ? "AA" : "66"}` }} />
          </div>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        className="mt-3 w-full accent-[var(--primary)]"
        onChange={(event) => updateState({ ...state, value: Number(event.target.value) })}
      />
    </BlockShell>
  );
}
