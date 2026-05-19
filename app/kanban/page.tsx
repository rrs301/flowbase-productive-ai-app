import { currentUser } from "@clerk/nextjs/server";
import { Columns3 } from "lucide-react";
import { redirect } from "next/navigation";

import { listKanbanBoards } from "@/app/kanban/actions";
import { KanbanWorkspace } from "@/app/kanban/kanban-workspace";
import { listCategoriesForScopes } from "@/app/settings/actions";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function KanbanPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const [boards, categories] = await Promise.all([
    listKanbanBoards(),
    listCategoriesForScopes(["task"]),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Columns3 className="size-4 text-amber-600" aria-hidden="true" />
              Task / Kanban
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold leading-tight text-foreground">
              Shape the work as it moves.
            </h1>
          </div>
        </header>

        <KanbanWorkspace initialBoards={boards} categories={categories} />
    </section>
  );
}
