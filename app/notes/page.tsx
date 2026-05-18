import { currentUser } from "@clerk/nextjs/server";
import { FileText } from "lucide-react";
import { redirect } from "next/navigation";

import { listSidebarGeneratedApps } from "@/app/ai-template-builder/actions";
import { listNotes } from "@/app/notes/actions";
import { NotesWorkspace } from "@/app/notes/notes-workspace";
import { AppShell } from "@/components/app-shell";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function NotesPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const [notes, sidebarApps] = await Promise.all([listNotes(), listSidebarGeneratedApps()]);

  return (
    <AppShell activePage="notes" generatedSidebarApps={sidebarApps}>
      <section className="mx-auto flex h-screen max-h-screen w-full max-w-[100rem] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="shrink-0 px-1 py-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <FileText className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase leading-5 text-primary">Notes</p>
              <h1 className="truncate text-2xl font-semibold leading-tight text-foreground">
                Capture the shape of your thinking.
              </h1>
            </div>
          </div>
        </header>

        <NotesWorkspace initialNotes={notes} />
      </section>
    </AppShell>
  );
}
