"use client";

import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronsUpDown,
  Columns3,
  FileText,
  Home,
  LayoutTemplate,
  LucideIcon,
  PanelLeftOpen,
  PenTool,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: LucideIcon;
  color: string;
  active?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Home",
    items: [
      { label: "Dashboard", icon: Home, color: "text-clay-600", active: true },
      { label: "AI Assistant", icon: Bot, color: "text-violet-500" },
      { label: "Calendar", icon: CalendarDays, color: "text-sage-600" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Task / Kanban", icon: Columns3, color: "text-amber-600" },
      { label: "Notes", icon: FileText, color: "text-sky-600" },
      { label: "Whiteboard", icon: PenTool, color: "text-coral-500" },
      { label: "Pages / Spaces", icon: Users, color: "text-teal-600" },
    ],
  },
  {
    label: "Build",
    items: [
      { label: "AI Template Builder", icon: LayoutTemplate, color: "text-rose-500" },
      { label: "Settings", icon: Settings, color: "text-stone-500" },
    ],
  },
];

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

export function DashboardShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen overflow-hidden">
        <aside
          className={cn(
            "flex shrink-0 flex-col border-r border-border bg-sidebar px-2.5 py-3.5 shadow-[1px_0_24px_rgba(70,54,40,0.05)] transition-[width] duration-300 ease-out",
            collapsed ? "w-[4.5rem]" : "w-64 max-sm:w-[4.5rem]",
          )}
        >
          <div className="flex h-11 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-4" aria-hidden="true" />
            </div>
            <div
              className={cn(
                "min-w-0 transition-opacity duration-200 max-sm:hidden",
                collapsed && "pointer-events-none opacity-0",
              )}
            >
              <p className="truncate text-[13px] font-semibold leading-5">Flowbase</p>
              <p className="truncate text-xs text-muted-foreground">Cozy workspace</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-3.5" aria-hidden="true" />
              ) : (
                <ChevronLeft className="size-3.5" aria-hidden="true" />
              )}
            </Button>
            <div
              className={cn(
                "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs text-muted-foreground transition-opacity duration-200 max-sm:hidden",
                collapsed && "pointer-events-none opacity-0",
              )}
            >
              <Search className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Search everything</span>
            </div>
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-4" aria-label="Primary navigation">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p
                  className={cn(
                    "px-2.5 text-[10px] font-semibold uppercase leading-5 tracking-[0.08em] text-muted-foreground/75 transition-opacity duration-200",
                    collapsed && "sr-only",
                    "max-sm:sr-only",
                  )}
                >
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.label}
                      href="#"
                      aria-label={item.label}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group flex h-9 items-center rounded-lg px-2.5 text-[13px] font-medium transition-colors",
                        collapsed ? "justify-center" : "gap-2.5 max-sm:justify-center",
                        item.active
                          ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(255,112,87,0.16)]"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", item.color)} aria-hidden="true" />
                      <span
                        className={cn(
                          "min-w-0 truncate transition-[opacity,width] duration-200",
                          collapsed && "w-0 opacity-0",
                          "max-sm:hidden",
                        )}
                      >
                        {item.label}
                      </span>
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="border-t border-border pt-3">
            <div
              className={cn(
                "flex items-center rounded-lg bg-card p-1.5 shadow-sm",
                collapsed ? "justify-center" : "gap-2.5",
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sage-100 text-sage-700">
                <Users className="size-3.5" aria-hidden="true" />
              </div>
              <div
                className={cn(
                  "min-w-0 flex-1 transition-opacity duration-200",
                  "max-sm:hidden",
                  collapsed && "pointer-events-none hidden opacity-0",
                )}
              >
                <p className="truncate text-[13px] font-medium">Studio space</p>
                <p className="truncate text-[11px] text-muted-foreground">5 collaborators</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-7 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground",
                  "max-sm:hidden",
                  collapsed && "hidden",
                )}
                aria-label="Workspace menu"
              >
                <ChevronsUpDown className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
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
                      className={cn(
                        "rounded-lg border border-border border-l-4 bg-background p-4",
                        item.color,
                      )}
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
        </main>
      </div>
    </div>
  );
}
