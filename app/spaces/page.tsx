import { currentUser } from "@clerk/nextjs/server";
import { FolderKanban } from "lucide-react";
import { redirect } from "next/navigation";

import { listSpacesData } from "@/app/spaces/actions";
import { SpacesWorkspace } from "@/app/spaces/spaces-workspace";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function SpacesPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const data = await listSpacesData();

  return (
    <section className="mx-auto flex h-screen max-h-screen w-full max-w-[104rem] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="shrink-0 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <FolderKanban className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase leading-5 text-primary">Pages & Spaces</p>
              <h1 className="truncate text-2xl font-semibold leading-tight text-foreground">
                Organize every working document by space.
              </h1>
            </div>
          </div>
        </header>

        <SpacesWorkspace initialData={data} />
    </section>
  );
}
