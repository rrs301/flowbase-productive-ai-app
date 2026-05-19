"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  FolderKanban,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { listSidebarGeneratedApps, toggleGeneratedAppSidebar } from "@/app/ai-template-builder/actions";
import type { GeneratedSidebarAppDTO } from "@/app/ai-template-builder/actions";
import { Button } from "@/components/ui/button";
import { getGeneratedAppIcon } from "@/lib/generated-app-icons";
import { sidebarAppsRefreshEvent } from "@/lib/sidebar-events";
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
      { label: "Dashboard", href: "/dashboard", icon: Home, color: "text-clay-600" },
      { label: "AI Assistant", href: "/ai-assistant", icon: Bot, color: "text-violet-500" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Calendar", href: "/calendar", icon: CalendarDays, color: "text-sage-600" },
      { label: "Task / Kanban", href: "/kanban", icon: Columns3, color: "text-amber-600" },
      { label: "Notes", href: "/notes", icon: FileText, color: "text-sky-600" },
      { label: "Whiteboard", href: "/whiteboard", icon: PenTool, color: "text-coral-500" },
      { label: "Pages / Spaces", href: "/spaces", icon: FolderKanban, color: "text-violet-500" },
    ],
  },
  {
    label: "Build",
    items: [
      { label: "AI Template Builder", href: "/ai-template-builder", icon: LayoutTemplate, color: "text-rose-500" },
      { label: "Settings", href: "/settings", icon: Settings, color: "text-stone-500" },
    ],
  },
];

type AppShellProps = {
  generatedSidebarApps?: GeneratedSidebarAppDTO[];
  children: ReactNode;
};

const emptyGeneratedSidebarApps: GeneratedSidebarAppDTO[] = [];

function getActivePage(pathname: string) {
  if (pathname.startsWith("/ai-template-builder")) return "ai-template-builder";
  return pathname.split("/")[1] || "dashboard";
}

export function AppShell({ generatedSidebarApps = emptyGeneratedSidebarApps, children }: AppShellProps) {
  const pathname = usePathname();
  const activePage = useMemo(() => getActivePage(pathname), [pathname]);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarApps, setSidebarApps] = useState(generatedSidebarApps);

  const refreshSidebarApps = useCallback(() => {
    let cancelled = false;

    listSidebarGeneratedApps()
      .then((apps) => {
        if (!cancelled) setSidebarApps(apps);
      })
      .catch(() => {
        if (!cancelled) setSidebarApps(generatedSidebarApps);
      });

    return () => {
      cancelled = true;
    };
  }, [generatedSidebarApps]);

  useEffect(() => {
    const cancelRefresh = refreshSidebarApps();
    const handleRefresh = () => {
      refreshSidebarApps();
    };

    window.addEventListener(sidebarAppsRefreshEvent, handleRefresh);

    return () => {
      cancelRefresh();
      window.removeEventListener(sidebarAppsRefreshEvent, handleRefresh);
    };
  }, [refreshSidebarApps]);

  function removeGeneratedSidebarApp(appId: number) {
    setSidebarApps((current) => current.filter((app) => app.id !== appId));
    toggleGeneratedAppSidebar(appId, false).catch(() => setSidebarApps(generatedSidebarApps));
  }

  return (
    <div className="h-screen bg-background text-foreground">
      <div className="flex h-screen overflow-hidden">
        <aside
          className={cn(
            "flex h-screen max-h-screen shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar px-2.5 py-3.5 shadow-[1px_0_24px_rgba(70,54,40,0.05)] transition-[width] duration-300 ease-out",
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

          <nav className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" aria-label="Primary navigation">
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
                    (activePage === "dashboard" && item.href === "/dashboard") ||
                    (activePage === "ai-assistant" && item.href === "/ai-assistant") ||
                    (activePage === "calendar" && item.href === "/calendar") ||
                    (activePage === "kanban" && item.href === "/kanban") ||
                    (activePage === "notes" && item.href === "/notes") ||
                    (activePage === "whiteboard" && item.href === "/whiteboard") ||
                    (activePage === "spaces" && item.href === "/spaces") ||
                    (activePage === "ai-template-builder" && item.href === "/ai-template-builder") ||
                    (activePage === "settings" && item.href === "/settings");

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      scroll={false}
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
            {sidebarApps.length > 0 && (
              <div className="space-y-1">
                <p
                  className={cn(
                    "px-2.5 text-[10px] font-semibold uppercase leading-5 tracking-[0.08em] text-muted-foreground/75 transition-opacity duration-200",
                    collapsed && "sr-only",
                    "max-sm:sr-only",
                  )}
                >
                  Generated
                </p>
                {sidebarApps.map((app) => {
                  const Icon = getGeneratedAppIcon(app.icon);
                  return (
                    <div key={app.id} className="group flex items-center">
                      <Link
                        href={`/ai-template-builder/${app.id}`}
                        scroll={false}
                        aria-label={app.appName}
                        title={collapsed ? app.appName : undefined}
                        className={cn(
                          "flex h-9 min-w-0 flex-1 items-center rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          collapsed ? "justify-center" : "gap-2.5 max-sm:justify-center",
                        )}
                      >
                        <Icon className="size-4 shrink-0" style={{ color: app.color }} aria-hidden="true" />
                        <span
                          className={cn(
                            "min-w-0 truncate transition-[opacity,width] duration-200",
                            collapsed && "w-0 opacity-0",
                            "max-sm:hidden",
                          )}
                        >
                          {app.appName}
                        </span>
                      </Link>
                      <button
                        type="button"
                        className={cn(
                          "mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-background hover:text-foreground group-hover:opacity-100",
                          collapsed && "hidden",
                          "max-sm:hidden",
                        )}
                        aria-label={`Remove ${app.appName} from sidebar`}
                        title={`Remove ${app.appName} from sidebar`}
                        onClick={() => removeGeneratedSidebarApp(app.id)}
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </nav>

          <div className="shrink-0 border-t border-border pt-3">
            <div
              className={cn(
                "flex items-center rounded-lg bg-card p-1.5 shadow-sm",
                collapsed ? "justify-center" : "gap-2.5",
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sage-100 text-sage-700">
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
