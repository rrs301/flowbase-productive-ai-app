import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Columns3,
  FileText,
  LayoutTemplate,
  LucideIcon,
  PenLine,
  PenTool,
  Plus,
  Sparkles,
} from "lucide-react";

import type { DashboardData } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  data: DashboardData;
};

const featureIcons: Record<string, LucideIcon> = {
  calendar: CalendarDays,
  kanban: Columns3,
  notes: FileText,
  whiteboard: PenTool,
  "ai-assistant": Bot,
  "ai-template-builder": LayoutTemplate,
};

const actionIcons: Record<string, LucideIcon> = {
  "Create Task": Plus,
  "Add Calendar Reminder": CalendarDays,
  "Create Note": PenLine,
  "Open Whiteboard": PenTool,
  "Ask AI Assistant": Bot,
  "Generate AI Template": LayoutTemplate,
};

const toneClasses = {
  sage: {
    dot: "bg-sage-400",
    chip: "bg-sage-100 text-sage-800",
    text: "text-sage-700",
    tile: "border-sage-200 bg-sage-100/70",
  },
  clay: {
    dot: "bg-clay-400",
    chip: "bg-clay-100 text-clay-800",
    text: "text-clay-700",
    tile: "border-clay-200 bg-clay-100/80",
  },
  amber: {
    dot: "bg-amber-400",
    chip: "bg-amber-100 text-amber-800",
    text: "text-amber-700",
    tile: "border-amber-200 bg-amber-100/75",
  },
  sky: {
    dot: "bg-sky-400",
    chip: "bg-sky-100 text-sky-800",
    text: "text-sky-700",
    tile: "border-sky-200 bg-sky-100/75",
  },
  violet: {
    dot: "bg-violet-400",
    chip: "bg-violet-100 text-violet-800",
    text: "text-violet-700",
    tile: "border-violet-200 bg-violet-100/75",
  },
  rose: {
    dot: "bg-rose-400",
    chip: "bg-rose-100 text-rose-800",
    text: "text-rose-700",
    tile: "border-rose-200 bg-rose-100/75",
  },
};

const heroMetrics = [
  { label: "Tasks", value: "total" },
  { label: "Complete", value: "progress" },
  { label: "Upcoming", value: "upcoming" },
] as const;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCalendarDate(date: string, time: string | null) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour = 12, minute = 0] = time?.split(":").map(Number) ?? [];
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: time ? "numeric" : undefined,
    minute: time ? "2-digit" : undefined,
  }).format(new Date(year, month - 1, day, hour, minute));
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, action }: { title: string; icon: LucideIcon; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-card text-primary shadow-sm">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}

export function DashboardShell({ data }: DashboardShellProps) {
  const heroMetricValues = {
    total: data.taskSummary.total,
    progress: `${data.taskSummary.progress}%`,
    upcoming: data.upcoming.length,
  };

  return (
    <section className="mx-auto flex w-full max-w-[100rem] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-lg border border-border bg-[linear-gradient(135deg,hsl(11_94%_94%)_0%,hsl(153_58%_91%)_43%,hsl(190_70%_92%)_100%)] p-5 shadow-[0_18px_50px_rgba(70,54,40,0.08)] sm:p-6 lg:p-8">
          <div className="absolute right-0 top-0 h-24 w-44 rounded-bl-full bg-amber-200/60" aria-hidden="true" />
          <div className="absolute bottom-0 right-16 h-16 w-36 rounded-t-full bg-rose-100/80" aria-hidden="true" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_28rem] lg:items-end">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-clay-700">
                <Sparkles className="size-4" aria-hidden="true" />
                Dashboard
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                Welcome back, {data.userName}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Your workspace is awake: tasks, calendar, pages, and AI work are gathered here for a clear start.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild className="rounded-lg shadow-sm">
                  <Link href="/kanban">
                    <Plus className="mr-2 size-4" aria-hidden="true" />
                    New task
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-lg border-white/70 bg-white/75">
                  <Link href="/calendar">
                    <CalendarDays className="mr-2 size-4 text-sage-600" aria-hidden="true" />
                    Calendar
                  </Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/60 bg-white/45 p-2 backdrop-blur-sm">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="rounded-lg bg-white/70 p-3">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{heroMetricValues[metric.value]}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {data.features.map((feature) => {
            const Icon = featureIcons[feature.key];
            const tone = toneClasses[feature.tone];
            return (
              <div key={feature.key} className={cn("rounded-lg border p-4 shadow-sm", tone.tile)}>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/75 shadow-sm">
                    <Icon className={cn("size-5", tone.text)} aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      "rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold",
                      feature.status === "Disabled" ? "text-muted-foreground" : tone.text,
                    )}
                  >
                    {feature.status}
                  </span>
                </div>
                <div className="mt-4 min-w-0">
                  <p className="truncate text-sm font-semibold">{feature.name}</p>
                  <p className="mt-2 text-2xl font-semibold leading-none">{feature.stat}</p>
                  <p className="mt-2 truncate text-xs text-muted-foreground">{feature.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <section>
            <SectionHeader title="Quick access" icon={ArrowRight} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.quickActions.map((action) => {
                const Icon = actionIcons[action.label] ?? ArrowRight;
                const tone = toneClasses[action.tone];
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={cn(
                      "group rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md",
                      tone.tile,
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/75 shadow-sm">
                        <Icon className={cn("size-4", tone.text)} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{action.label}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <SectionHeader title="Task summary" icon={BarChart3} />
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Total", data.taskSummary.total, "bg-sky-100/70"],
                  ["Completed", data.taskSummary.completed, "bg-sage-100/80"],
                  ["Pending", data.taskSummary.pending, "bg-amber-100/75"],
                  ["Overdue", data.taskSummary.overdue, "bg-rose-100/75"],
                ].map(([label, value, className]) => (
                  <div key={label} className={cn("rounded-lg p-3", className)}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  <span className="text-muted-foreground">{data.taskSummary.progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,hsl(8_82%_62%),hsl(38_91%_56%),hsl(158_46%_58%))] transition-[width]" style={{ width: `${data.taskSummary.progress}%` }} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section>
            <SectionHeader title="Upcoming calendar" icon={CalendarDays} />
            <div className="space-y-3">
              {data.upcoming.length ? (
                data.upcoming.map((item) => (
                  <Link
                    key={item.id}
                    href="/calendar"
                    className="flex items-center gap-3 rounded-lg border border-border bg-card/80 p-3 transition hover:bg-card hover:shadow-sm"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background">
                      <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{formatCalendarDate(item.date, item.time)}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">
                      {item.type}
                    </span>
                  </Link>
                ))
              ) : (
                <EmptyState>No upcoming calendar tasks or reminders yet.</EmptyState>
              )}
            </div>
          </section>

          <section className="rounded-lg bg-card/70 p-5 shadow-sm ring-1 ring-border">
            <SectionHeader title="Recent activity" icon={Clock3} />
            <div className="space-y-1">
              {data.recentActivity.length ? (
                data.recentActivity.map((item) => {
                  const tone = toneClasses[item.tone];
                  return (
                    <Link key={item.id} href={item.href} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-background">
                      <span className={cn("size-2.5 rounded-full", tone.dot)} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.label} · {formatDateTime(item.occurredAt)}
                        </p>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <EmptyState>Your recent activity will appear here once you create something.</EmptyState>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <section>
            <SectionHeader title="Recent pages" icon={FileText} />
            <div className="grid gap-3 sm:grid-cols-2">
              {data.recentPages.length ? (
                data.recentPages.map((page) => {
                  const tone = toneClasses[page.tone];
                  return (
                    <Link
                      key={page.id}
                      href={page.href}
                      className={cn("rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-sm", tone.tile)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{page.title}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{page.meta}</p>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium", tone.chip)}>{page.type}</span>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Updated {formatDateTime(page.updatedAt)}</p>
                    </Link>
                  );
                })
              ) : (
                <div className="sm:col-span-2">
                  <EmptyState>Notes, boards, whiteboards, and templates will appear here.</EmptyState>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-violet-200 bg-violet-100/45 p-5 shadow-sm">
            <SectionHeader title="AI insights" icon={Sparkles} />
            <div className="space-y-3">
              {data.insights.map((insight, index) => (
                <div key={insight} className="flex gap-3 rounded-lg bg-white/70 p-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-200/70 text-xs font-semibold text-violet-700">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-muted-foreground">{insight}</p>
                </div>
              ))}
              {data.taskSummary.completed > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-sage-100/70 px-3 py-2 text-sm font-medium text-sage-800">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {data.taskSummary.completed} task{data.taskSummary.completed === 1 ? "" : "s"} completed.
                </div>
              )}
            </div>
          </section>
        </div>
    </section>
  );
}
