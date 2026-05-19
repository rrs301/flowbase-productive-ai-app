"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

const workspaceRoutes = [
  "/dashboard",
  "/ai-assistant",
  "/calendar",
  "/kanban",
  "/notes",
  "/whiteboard",
  "/spaces",
  "/ai-template-builder",
  "/settings",
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldUseWorkspaceShell = workspaceRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!shouldUseWorkspaceShell) {
    return children;
  }

  return <AppShell>{children}</AppShell>;
}
