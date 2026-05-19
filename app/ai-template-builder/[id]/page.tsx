import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft, PanelLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { getGeneratedApp } from "@/app/ai-template-builder/actions";
import { GeneratedAppDetailControls } from "@/app/ai-template-builder/generated-app-detail-controls";
import { GeneratedAppPreview } from "@/app/ai-template-builder/generated-app-preview";
import { Button } from "@/components/ui/button";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

type GeneratedAppPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GeneratedAppPage({ params }: GeneratedAppPageProps) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const { id } = await params;
  const appId = Number(id);
  if (!Number.isInteger(appId) || appId <= 0) {
    notFound();
  }

  let app;
  try {
    app = await getGeneratedApp(appId);
  } catch {
    notFound();
  }

  return (
    <section className="mx-auto flex w-full max-w-[104rem] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="mb-3 rounded-lg px-2">
              <Link href="/ai-template-builder">
                <ArrowLeft className="mr-1.5 size-3.5" aria-hidden="true" />
                Template Builder
              </Link>
            </Button>
            <h1 className="truncate text-2xl font-semibold leading-tight text-foreground">{app.appName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{app.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GeneratedAppDetailControls app={app} />
            <Button asChild variant="outline" className="rounded-lg bg-card">
              <Link href="/ai-template-builder">
                <PanelLeft className="mr-2 size-4" aria-hidden="true" />
                All apps
              </Link>
            </Button>
          </div>
        </header>

        <GeneratedAppPreview appId={app.id} definition={app.definition} appState={app.appState} />
    </section>
  );
}
