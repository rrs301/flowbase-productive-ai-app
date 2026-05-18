import { CalendarDays, Plus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeneratedSidebarAppDTO } from "@/app/ai-template-builder/actions";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Open tasks", value: "24", tone: "bg-clay-100 text-clay-700" },
  { label: "Notes drafted", value: "18", tone: "bg-sage-100 text-sage-700" },
  { label: "Spaces active", value: "7", tone: "bg-amber-100 text-amber-700" },
  { label: "AI templates", value: "12", tone: "bg-violet-100 text-violet-700" },
];

const activity = [
  "Product roadmap board updated",
  "AI summarized weekly planning notes",
  "Calendar focus block moved to 2:00 PM",
];

const taskCards = [
  { title: "Design review", meta: "Today", color: "border-l-clay-400" },
  { title: "Sprint notes", meta: "2 drafts", color: "border-l-sage-400" },
  { title: "Whiteboard ideas", meta: "14 objects", color: "border-l-amber-400" },
];

export function DashboardShell({ generatedSidebarApps = [] }: { generatedSidebarApps?: GeneratedSidebarAppDTO[] }) {
  return (
    <AppShell activePage="dashboard" generatedSidebarApps={generatedSidebarApps}>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-foreground">
              Plan, write, and map your work in one calm place.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A focused home for tasks, notes, whiteboards, pages, and AI-assisted workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-lg bg-card">
              <CalendarDays className="mr-2 size-4 text-sage-600" aria-hidden="true" />
              Today
            </Button>
            <Button className="rounded-lg">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              New space
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <Card key={item.label} className="rounded-lg border-border bg-card shadow-sm">
              <CardContent className="p-5">
                <div className={cn("mb-4 inline-flex rounded-lg px-2.5 py-1 text-xs font-medium", item.tone)}>
                  {item.label}
                </div>
                <p className="text-3xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Workspace pulse</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-3">
              {taskCards.map((item) => (
                <div
                  key={item.title}
                  className={cn("rounded-lg border border-border border-l-4 bg-background p-4", item.color)}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              {activity.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Pinned notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-medium">Launch narrative</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Tighten the product story around focused teams, visual planning, and AI templates.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-medium">Meeting takeaways</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Convert design critique into three kanban actions before Friday.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-lg border-border bg-card shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Whiteboard preview</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="relative min-h-72 overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle_at_1px_1px,rgba(79,65,52,0.16)_1px,transparent_0)] bg-[length:24px_24px]">
                <div className="absolute left-6 top-8 rounded-lg border border-clay-200 bg-clay-100 px-4 py-3 text-sm font-medium text-clay-800 shadow-sm">
                  Ideas
                </div>
                <div className="absolute left-[34%] top-24 rounded-lg border border-sage-200 bg-sage-100 px-4 py-3 text-sm font-medium text-sage-800 shadow-sm">
                  Tasks
                </div>
                <div className="absolute bottom-8 right-8 rounded-lg border border-amber-200 bg-amber-100 px-4 py-3 text-sm font-medium text-amber-800 shadow-sm">
                  Templates
                </div>
                <div className="absolute left-24 top-24 h-px w-36 rotate-12 bg-border" />
                <div className="absolute bottom-24 right-28 h-px w-40 -rotate-12 bg-border" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
