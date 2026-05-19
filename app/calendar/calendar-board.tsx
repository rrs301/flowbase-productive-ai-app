"use client";

import { Bell, CalendarDays, ChevronLeft, ChevronRight, Clock, GripVertical, Inbox, PanelRightClose, PanelRightOpen, Plus, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";

import {
  CalendarCategory,
  CalendarItemDTO,
  CalendarItemInput,
  CalendarItemType,
  createCalendarItem,
  deleteCalendarItem,
  moveCalendarItemToDraft,
  scheduleCalendarItem,
  updateCalendarItem,
} from "@/app/calendar/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserCategoryDTO } from "@/lib/user-preferences";
import { cn } from "@/lib/utils";

type CalendarView = "month" | "week";
type DraftForm = {
  title: string;
  description: string;
  scheduledTime: string;
  itemType: CalendarItemType;
  category: CalendarCategory;
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fallbackCategories: UserCategoryDTO[] = [
  { id: -1, scope: "calendar", name: "Work", color: "#5BAE91", icon: "BriefcaseBusiness", createdAt: "", updatedAt: "" },
  { id: -2, scope: "calendar", name: "Personal", color: "#EF806F", icon: "Heart", createdAt: "", updatedAt: "" },
  { id: -3, scope: "calendar", name: "Focus", color: "#4BA3C7", icon: "Focus", createdAt: "", updatedAt: "" },
  { id: -4, scope: "calendar", name: "Meeting", color: "#E6A23C", icon: "Users", createdAt: "", updatedAt: "" },
  { id: -5, scope: "reminder", name: "Reminder", color: "#8B7CF6", icon: "Bell", createdAt: "", updatedAt: "" },
];
const emptyForm: DraftForm = { title: "", description: "", scheduledTime: "", itemType: "task", category: "Work" };

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  return addDays(date, -date.getDay());
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getMonthDays(anchor: Date) {
  const start = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function getWeekDays(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function formatPeriod(date: Date, view: CalendarView) {
  if (view === "month") {
    return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
  }

  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(end)}, ${end.getFullYear()}`;
}

function sortItems(items: CalendarItemDTO[]) {
  return [...items].sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
    if (a.scheduledTime) return -1;
    if (b.scheduledTime) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function CalendarBoard({ initialItems, categories }: { initialItems: CalendarItemDTO[]; categories: UserCategoryDTO[] }) {
  const today = useMemo(() => new Date(), []);
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    return [...categories, ...fallbackCategories].filter((category) => {
      const key = `${category.scope}:${category.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [categories]);
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<CalendarView>("month");
  const [anchorDate, setAnchorDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(dateKey(today));
  const [form, setForm] = useState<DraftForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draftsCollapsed, setDraftsCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const scheduledItems = items.filter((item) => !item.isDraft && item.scheduledDate);
  const draftItems = items.filter((item) => item.isDraft);
  const editingItem = editingItemId ? items.find((item) => item.id === editingItemId) ?? null : null;
  const visibleDays = view === "month" ? getMonthDays(anchorDate) : getWeekDays(anchorDate);
  const itemsByDate = useMemo(
    () =>
      scheduledItems.reduce<Record<string, CalendarItemDTO[]>>((grouped, item) => {
        if (!item.scheduledDate) return grouped;
        grouped[item.scheduledDate] = [...(grouped[item.scheduledDate] || []), item];
        return grouped;
      }, {}),
    [scheduledItems],
  );

  function openDialog(date: string) {
    setSelectedDate(date);
    setForm(emptyForm);
    setEditingItemId(null);
    setError("");
    setDialogOpen(true);
  }

  function openEditDialog(item: CalendarItemDTO) {
    if (!item.scheduledDate) return;

    setSelectedDate(item.scheduledDate);
    setEditingItemId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      scheduledTime: item.scheduledTime || "",
      itemType: item.itemType,
      category: item.category,
    });
    setError("");
    setDialogOpen(true);
  }

  function upsertItem(nextItem: CalendarItemDTO) {
    setItems((current) => {
      const exists = current.some((item) => item.id === nextItem.id);
      return exists ? current.map((item) => (item.id === nextItem.id ? nextItem : item)) : [nextItem, ...current];
    });
  }

  function removeItem(itemId: number) {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  function submitItem(asDraft: boolean) {
    const input: CalendarItemInput = { ...form, scheduledDate: selectedDate, scheduledTime: form.scheduledTime };
    setError("");
    startTransition(async () => {
      try {
        const nextItem = editingItemId
          ? await updateCalendarItem(editingItemId, input, asDraft)
          : await createCalendarItem(input, asDraft);

        upsertItem(nextItem);
        setDialogOpen(false);
        setEditingItemId(null);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Something went wrong.");
      }
    });
  }

  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitItem(false);
  }

  function onDropItem(targetDate: string) {
    if (!draggingId) return;
    const previous = items.find((item) => item.id === draggingId);
    if (!previous || previous.scheduledDate === targetDate) {
      setDraggingId(null);
      return;
    }

    upsertItem({ ...previous, scheduledDate: targetDate, isDraft: false });
    setDraggingId(null);
    startTransition(async () => {
      try {
        upsertItem(await scheduleCalendarItem(previous.id, targetDate));
      } catch (requestError) {
        upsertItem(previous);
        setError(requestError instanceof Error ? requestError.message : "Could not move that item.");
      }
    });
  }

  function moveEditingItemToDraft() {
    if (!editingItem || editingItem.isDraft) return;

    const previous = editingItem;
    upsertItem({ ...previous, scheduledDate: null, isDraft: true });
    setDialogOpen(false);
    setEditingItemId(null);
    setError("");

    startTransition(async () => {
      try {
        upsertItem(await moveCalendarItemToDraft(previous.id));
      } catch (requestError) {
        upsertItem(previous);
        setError(requestError instanceof Error ? requestError.message : "Could not move that item to drafts.");
      }
    });
  }

  function deleteItem(item: CalendarItemDTO) {
    if (!window.confirm(`Delete "${item.title}" from calendar?`)) return;

    const previousItems = items;
    removeItem(item.id);
    if (editingItemId === item.id) {
      setDialogOpen(false);
      setEditingItemId(null);
    }
    setError("");

    startTransition(async () => {
      try {
        await deleteCalendarItem(item.id);
      } catch (requestError) {
        setItems(previousItems);
        setError(requestError instanceof Error ? requestError.message : "Could not delete that item.");
      }
    });
  }

  return (
    <div className={cn("grid min-w-0 gap-5 transition-[grid-template-columns]", draftsCollapsed ? "xl:grid-cols-[minmax(0,1fr)_4.5rem]" : "xl:grid-cols-[minmax(0,1fr)_20rem]")}>
      <Card className="min-w-0 overflow-hidden rounded-lg border-border bg-card/85 shadow-[0_14px_40px_rgba(70,54,40,0.07)]">
        <CardHeader className="gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <CardTitle className="truncate text-xl">{formatPeriod(anchorDate, view)}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Drop drafts or scheduled items onto any date.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-border bg-background/85 p-1">
                {(["month", "week"] as CalendarView[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setView(option)}
                    className={cn(
                      "h-8 rounded-md px-3 text-xs font-medium capitalize transition-colors",
                      view === option ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="rounded-lg bg-card/80" onClick={() => setAnchorDate(today)}>
                <CalendarDays className="mr-2 size-4 text-sage-600" aria-hidden="true" />
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-lg bg-card/80"
                onClick={() => setAnchorDate((date) => (view === "month" ? addMonths(date, -1) : addDays(date, -7)))}
                aria-label="Previous period"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-lg bg-card/80"
                onClick={() => setAnchorDate((date) => (view === "month" ? addMonths(date, 1) : addDays(date, 7)))}
                aria-label="Next period"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
              <Button className="rounded-lg" onClick={() => openDialog(selectedDate)}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                New task
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-y border-border bg-background text-center text-[11px] font-semibold uppercase leading-9 text-muted-foreground">
            {weekDays.map((day) => (
              <div key={day} className="min-w-0 border-r border-border last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {visibleDays.map((day) => {
              const key = dateKey(day);
              const dayItems = sortItems(itemsByDate[key] || []);
              const isToday = key === dateKey(today);
              const inCurrentMonth = day.getMonth() === anchorDate.getMonth();

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openDialog(key)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    onDropItem(key);
                  }}
                  className={cn(
                    "group flex min-h-32 min-w-0 flex-col border-b border-r border-border bg-card p-2 text-left transition-colors hover:bg-sage-100/45 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:min-h-36",
                    view === "week" && "min-h-[28rem]",
                    view === "month" && !inCurrentMonth && "bg-background/65 text-muted-foreground",
                    draggingId && "bg-sage-100/25",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg text-xs font-semibold",
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground group-hover:bg-card",
                      )}
                    >
                      {day.getDate()}
                    </span>
                    <Plus className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                    {dayItems.map((item) => (
                      <TaskChip
                        key={item.id}
                        item={item}
                        categories={categoryOptions}
                        setDraggingId={setDraggingId}
                        onOpenEdit={() => openEditDialog(item)}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {draftsCollapsed ? (
        <aside className="h-fit min-w-0 rounded-lg border border-border bg-card/80 p-2 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="size-12 rounded-lg bg-sage-100 text-sage-700 hover:bg-sage-200"
            onClick={() => setDraftsCollapsed(false)}
            aria-label="Expand draft task panel"
            title="Expand draft task panel"
          >
            <PanelRightOpen className="size-4" aria-hidden="true" />
          </Button>
          <div className="mt-2 flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg bg-background/75 px-2 text-center">
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{draftItems.length}</span>
            <span className="[writing-mode:vertical-rl] text-xs font-semibold uppercase text-muted-foreground">Drafts</span>
          </div>
        </aside>
      ) : (
        <Card className="h-fit min-w-0 rounded-lg border-sage-200 bg-sage-100/55 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate text-base">Draft Task Panel</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Unscheduled work waits here.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-white/75 px-2 py-1 text-xs font-medium text-sage-700">{draftItems.length}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg bg-white/60 text-muted-foreground hover:bg-white hover:text-foreground"
                  onClick={() => setDraftsCollapsed(true)}
                  aria-label="Collapse draft task panel"
                  title="Collapse draft task panel"
                >
                  <PanelRightClose className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            <Button variant="outline" className="w-full rounded-lg bg-white/75" onClick={() => openDialog(selectedDate)}>
              <Plus className="mr-2 size-4 text-primary" aria-hidden="true" />
              Add draft
            </Button>
            {draftItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-sage-200 bg-white/65 p-5 text-center">
                <Inbox className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">No drafts waiting</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Save unscheduled tasks here, then drag them onto a date.</p>
              </div>
            ) : (
              draftItems.map((item) => (
                <DraftTask
                  key={item.id}
                  item={item}
                  categories={categoryOptions}
                  setDraggingId={setDraggingId}
                  onDelete={() => deleteItem(item)}
                  disabled={isPending}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{editingItemId ? "Edit calendar item" : "Create calendar item"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Selected date: {parseDateKey(selectedDate).toLocaleDateString()}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingItemId(null);
                }}
              >
                Close
              </Button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={onFormSubmit}>
              <label className="block text-sm font-medium">
                Task title
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Write the next thing to remember"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="mt-2 min-h-24 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Add helpful context"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Time
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(event) => setForm((current) => ({ ...current, scheduledTime: event.target.value }))}
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Type
                  <select
                    value={form.itemType}
                    onChange={(event) => {
                      const itemType = event.target.value as CalendarItemType;
                      const nextCategory = categoryOptions.find((category) => category.scope === (itemType === "reminder" ? "reminder" : "calendar"));
                      setForm((current) => ({ ...current, itemType, category: nextCategory?.name || current.category }));
                    }}
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="task">Task</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </label>
              </div>
              <div>
                <p className="text-sm font-medium">Category</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {categoryOptions
                    .filter((category) => (form.itemType === "reminder" ? category.scope === "reminder" : category.scope === "calendar"))
                    .map((category) => (
                      <button
                        key={`${category.scope}-${category.name}`}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, category: category.name }))}
                        className={cn(
                          "flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-medium transition-colors",
                          form.category === category.name ? "ring-1 ring-ring" : "opacity-80 hover:opacity-100",
                        )}
                        style={{ borderColor: `${category.color}55`, color: category.color }}
                      >
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: category.color }} aria-hidden="true" />
                        <span className="truncate">{category.name}</span>
                      </button>
                    ))}
                </div>
              </div>
              {error && <p className="rounded-lg bg-clay-100 px-3 py-2 text-sm text-clay-800">{error}</p>}
              {editingItem && !editingItem.isDraft && (
                <div className="flex flex-col gap-2 rounded-lg bg-background p-2 sm:flex-row">
                  <Button type="button" variant="outline" className="rounded-lg bg-card text-muted-foreground" onClick={moveEditingItemToDraft} disabled={isPending}>
                    <Inbox className="mr-2 size-4 text-sage-600" aria-hidden="true" />
                    Move to drafts
                  </Button>
                  <Button type="button" variant="outline" className="rounded-lg bg-card text-clay-700" onClick={() => deleteItem(editingItem)} disabled={isPending}>
                    <Trash2 className="mr-2 size-4" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {!editingItemId && (
                  <Button type="button" variant="outline" className="rounded-lg bg-background" onClick={() => submitItem(true)} disabled={isPending}>
                    Save draft
                  </Button>
                )}
                <Button type="submit" className="rounded-lg" disabled={isPending}>
                  {editingItemId ? "Save changes" : "Schedule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskChip({
  item,
  categories,
  setDraggingId,
  onOpenEdit,
}: {
  item: CalendarItemDTO;
  categories: UserCategoryDTO[];
  setDraggingId: (id: number | null) => void;
  onOpenEdit: () => void;
}) {
  const style = categoryStyle(item.category, categories);
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(item.id));
        setDraggingId(item.id);
      }}
      onDragEnd={() => setDraggingId(null)}
      onClick={(event) => {
        event.stopPropagation();
        onOpenEdit();
      }}
      className="min-w-0 cursor-grab rounded-md border border-l-4 bg-background px-2 py-1.5 text-xs shadow-sm active:cursor-grabbing"
      style={{ borderLeftColor: style.color }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {item.itemType === "reminder" ? <Bell className="size-3 shrink-0 text-primary" /> : <GripVertical className="size-3 shrink-0 text-muted-foreground" />}
        <span className="truncate font-medium">{item.title}</span>
      </div>
      {(item.scheduledTime || item.itemType === "reminder") && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-medium uppercase text-muted-foreground">
          {item.scheduledTime && <Clock className="size-3" aria-hidden="true" />}
          <span>{item.scheduledTime || "Reminder"}</span>
        </div>
      )}
    </div>
  );
}

function DraftTask({
  item,
  categories,
  setDraggingId,
  onDelete,
  disabled,
}: {
  item: CalendarItemDTO;
  categories: UserCategoryDTO[];
  setDraggingId: (id: number | null) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const style = categoryStyle(item.category, categories);
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(item.id));
        setDraggingId(item.id);
      }}
      onDragEnd={() => setDraggingId(null)}
      className="cursor-grab rounded-lg border border-l-4 bg-background p-3 shadow-sm active:cursor-grabbing"
      style={{ borderLeftColor: style.color }}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title}</p>
          {item.description && <p className="mt-1 max-h-10 overflow-hidden text-xs leading-5 text-muted-foreground">{item.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-md border px-2 py-0.5 text-[11px] font-medium" style={{ borderColor: `${style.color}55`, color: style.color }}>
              {style.label}
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{item.itemType}</span>
          </div>
        </div>
        <button
          type="button"
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-clay-100 hover:text-clay-700 disabled:pointer-events-none disabled:opacity-50"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          disabled={disabled}
          aria-label={`Delete ${item.title}`}
          title="Delete draft"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function categoryStyle(name: string, categories: UserCategoryDTO[]) {
  const category = categories.find((item) => item.name.toLowerCase() === name.toLowerCase());
  return {
    label: category?.name || name || "Work",
    color: category?.color || "#5BAE91",
  };
}
