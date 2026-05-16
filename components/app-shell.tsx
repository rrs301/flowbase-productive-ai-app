"use client";

import Link from "next/link";
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
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Home",
    items: [
      { label: "Dashboard", href: "/", icon: Home, color: "text-clay-600" },
      { label: "AI Assistant", href: "#", icon: Bot, color: "text-violet-500" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Calendar", href: "/calendar", icon: CalendarDays, color: "text-sage-600" },
      { label: "Task / Kanban", href: "/kanban", icon: Columns3, color: "text-amber-600" },
      { label: "Notes", href: "/notes", icon: FileText, color: "text-sky-600" },
      { label: "Whiteboard", href: "#", icon: PenTool, color: "text-coral-500" },
      { label: "Pages / Spaces", href: "#", icon: Users, color: "text-teal-600" },
    ],
  },
  {
    label: "Build",
    items: [
      { label: "AI Template Builder", href: "#", icon: LayoutTemplate, color: "text-rose-500" },
      { label: "Settings", href: "#", icon: Settings, color: "text-stone-500" },
    ],
  },
];

type AppShellProps = {
  activePage: "dashboard" | "calendar" | "kanban" | "notes";
  children: ReactNode;
};

export function AppShell({ activePage, children }: AppShellProps) {
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
                  const active =
                    (activePage === "dashboard" && item.href === "/") ||
                    (activePage === "calendar" && item.href === "/calendar") ||
                    (activePage === "kanban" && item.href === "/kanban") ||
                    (activePage === "notes" && item.href === "/notes");

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      aria-label={item.label}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group flex h-9 items-center rounded-lg px-2.5 text-[13px] font-medium transition-colors",
                        collapsed ? "justify-center" : "gap-2.5 max-sm:justify-center",
                        active
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
                    </Link>
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
                {/* <Users className="size-3.5" aria-hidden="true" /> */}
                <UserButton />
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

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
