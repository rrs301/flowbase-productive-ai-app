import { currentUser } from "@clerk/nextjs/server";
import { LayoutTemplate } from "lucide-react";
import { redirect } from "next/navigation";

import { AiTemplateBuilderWorkspace } from "@/app/ai-template-builder/ai-template-builder-workspace";
import { listGeneratedApps } from "@/app/ai-template-builder/actions";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function AiTemplateBuilderPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const apps = await listGeneratedApps();

  return (
    <section className="mx-auto flex w-full max-w-[104rem] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <LayoutTemplate className="size-4 text-rose-500" aria-hidden="true" />
              AI Template Builder
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-foreground">
              Turn a prompt into a single-page productivity app.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Generate trackers, planners, dashboards, and lightweight templates as private JSON-powered mini apps.
            </p>
          </div>
        </header>

        <AiTemplateBuilderWorkspace initialApps={apps} />
    </section>
  );
}
