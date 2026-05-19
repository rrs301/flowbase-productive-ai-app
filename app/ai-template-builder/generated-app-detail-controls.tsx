"use client";

import { PanelLeft, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteGeneratedApp, toggleGeneratedAppSidebar } from "@/app/ai-template-builder/actions";
import type { GeneratedAppDTO } from "@/app/ai-template-builder/actions";
import { Button } from "@/components/ui/button";
import { refreshSidebarApps } from "@/lib/sidebar-events";

type GeneratedAppDetailControlsProps = {
  app: GeneratedAppDTO;
};

export function GeneratedAppDetailControls({ app }: GeneratedAppDetailControlsProps) {
  const router = useRouter();
  const [isInSidebar, setIsInSidebar] = useState(app.isInSidebar);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleSidebar() {
    setError("");
    startTransition(async () => {
      try {
        const updated = await toggleGeneratedAppSidebar(app.id, !isInSidebar);
        setIsInSidebar(updated.isInSidebar);
        refreshSidebarApps();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update the sidebar.");
      }
    });
  }

  function deleteApp() {
    setError("");
    startTransition(async () => {
      try {
        await deleteGeneratedApp(app.id);
        refreshSidebarApps();
        router.push("/ai-template-builder");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete the app.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="rounded-lg bg-card" disabled={isPending} onClick={toggleSidebar}>
          <PanelLeft className="mr-2 size-4" aria-hidden="true" />
          {isInSidebar ? "Remove Sidebar" : "Add to Sidebar"}
        </Button>
        <Button type="button" variant="ghost" className="rounded-lg text-destructive hover:text-destructive" disabled={isPending} onClick={deleteApp}>
          <Trash2 className="mr-2 size-4" aria-hidden="true" />
          Delete
        </Button>
      </div>
      {error && <p className="max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
