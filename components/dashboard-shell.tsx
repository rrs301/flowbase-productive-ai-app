import Link from "next/link";
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

import type { GeneratedSidebarAppDTO } from "@/app/ai-template-builder/actions";
import type { DashboardData } from "@/app/dashboard/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  data: DashboardData;
  generatedSidebarApps?: GeneratedSidebarAppDTO[];
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
    icon: "bg-sage-100 text-sage-700",
    dot: "bg-sage-400",
    border: "border-l-sage-400",
    chip: "bg-sage-100 text-sage-800",
    text: "text-sage-700",
  },
  clay: {
    icon: "bg-clay-100 text-clay-700",
    dot: "bg-clay-400",
    border: "border-l-clay-400",
    chip: "bg-clay-100 text-clay-800",
    text: "text-clay-700",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
    border: "border-l-amber-400",
    chip: "bg-amber-100 text-amber-800",
    text: "text-amber-700",
  },
  sky: {
    icon: "bg-sky-100 text-sky-700",
    dot: "bg-sky-400",
    border: "border-l-sky-400",
    chip: "bg-sky-100 text-sky-800",
    text: "text-sky-700",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700",
    dot: "bg-violet-400",
    border: "border-l-violet-400",
    chip: "bg-violet-100 text-violet-800",
    text: "text-violet-700",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700",
    dot: "bg-rose-400",
    border: "border-l-rose-400",
    chip: "bg-rose-100 text-rose-800",
    text: "text-rose-700",
  },
};

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

function SectionHeader({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
      <CardTitle className="flex items-center gap-2 text-base">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {title}
      </CardTitle>
    </CardHeader>
  );
}

export function DashboardShell({ data, generatedSidebarApps = [] }: DashboardShellProps) {
  return (
    <AppShell activePage="dashboard" generatedSidebarApps={generatedSidebarApps}>
      <section className="mx-auto flex w-full max-w-[100rem] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="size-4 text-clay-600" aria-hidden="true" />
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-foreground">
              Welcome back, {data.userName}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A live overview of your tasks, schedule, notes, whiteboards, and AI-powered work.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-lg bg-card">
              <Link href="/calendar">
                <CalendarDays className="mr-2 size-4 text-sage-600" aria-hidden="true" />
                Calendar
              </Link>
            </Button>
            <Button asChild className="rounded-lg">
              <Link href="/kanban">
                <Plus className="mr-2 size-4" aria-hidden="true" />
                New task
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {data.features.map((feature) => {
            const Icon = featureIcons[feature.key];
            const tone = toneClasses[feature.tone];
            return (
              <Card key={feature.key} className="rounded-lg border-border bg-card shadow-sm">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tone.icon)}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        feature.status === "Disabled" ? "bg-muted text-muted-foreground" : tone.chip,
                      )}
                    >
                      {feature.status}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{feature.name}</p>
                    <p className="mt-2 text-2xl font-semibold leading-none">{feature.stat}</p>
                    <p className="mt-2 truncate text-xs text-muted-foreground">{feature.detail}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <SectionHeader title="Quick access" icon={ArrowRight} />
            <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-2 xl:grid-cols-3">
              {data.quickActions.map((action) => {
                const Icon = actionIcons[action.label] ?? ArrowRight;
                const tone = toneClasses[action.tone];
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={cn(
                      "group rounded-lg border border-border border-l-4 bg-background p-4 transition hover:-translate-y-0.5 hover:bg-card hover:shadow-sm",
                      tone.border,
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tone.icon)}>
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{action.label}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border bg-card shadow-sm">
            <SectionHeader title="Task summary" icon={BarChart3} />
            <CardContent className="space-y-5 p-5 pt-0">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Total", data.taskSummary.total],
                  ["Completed", data.taskSummary.completed],
                  ["Pending", data.taskSummary.pending],
                  ["Overdue", data.taskSummary.overdue],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-background p-3">
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
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${data.taskSummary.progress}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <SectionHeader title="Upcoming calendar" icon={CalendarDays} />
            <CardContent className="space-y-3 p-5 pt-0">
              {data.upcoming.length ? (
                data.upcoming.map((item) => (
                  <Link
                    key={item.id}
                    href="/calendar"
                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition hover:bg-card hover:shadow-sm"
                  >
                    <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
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
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border bg-card shadow-sm">
            <SectionHeader title="Recent activity" icon={Clock3} />
            <CardContent className="space-y-3 p-5 pt-0">
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
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <SectionHeader title="Recent pages" icon={FileText} />
            <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-2">
              {data.recentPages.length ? (
                data.recentPages.map((page) => {
                  const tone = toneClasses[page.tone];
                  return (
                    <Link
                      key={page.id}
                      href={page.href}
                      className={cn("rounded-lg border border-border border-l-4 bg-background p-4 transition hover:bg-card hover:shadow-sm", tone.border)}
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
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border bg-card shadow-sm">
            <SectionHeader title="AI insights" icon={Sparkles} />
            <CardContent className="space-y-3 p-5 pt-0">
              {data.insights.map((insight, index) => (
                <div key={insight} className="flex gap-3 rounded-lg border border-border bg-background p-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-semibold text-violet-700">
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
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
