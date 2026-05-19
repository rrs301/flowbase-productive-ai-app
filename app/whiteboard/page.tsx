import { currentUser } from "@clerk/nextjs/server";
import { PenTool } from "lucide-react";
import { redirect } from "next/navigation";

import { createWhiteboard, listWhiteboards } from "@/app/whiteboard/actions";
import { WhiteboardWorkspace } from "@/app/whiteboard/whiteboard-workspace";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function WhiteboardPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  let boards = await listWhiteboards();
  if (!boards.length) {
    boards = [await createWhiteboard()];
  }

  return (
    <section className="flex h-full min-h-[46rem] w-full flex-col overflow-hidden bg-background">
        <header className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <PenTool className="size-4 text-coral-500" aria-hidden="true" />
            Whiteboard
          </p>
        </header>

        <WhiteboardWorkspace initialBoards={boards} />
    </section>
  );
}
