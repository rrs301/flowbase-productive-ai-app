import { currentUser } from "@clerk/nextjs/server";
import { Settings } from "lucide-react";
import { redirect } from "next/navigation";

import { listSettingsPageData } from "@/app/settings/actions";
import { SettingsWorkspace } from "@/app/settings/settings-workspace";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const settingsData = await listSettingsPageData();

  return (
    <section className="mx-auto flex w-full max-w-[92rem] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border pb-5">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Settings className="size-4 text-stone-500" aria-hidden="true" />
            Settings
          </p>
          <div>
            <h1 className="text-2xl font-semibold leading-tight text-foreground">Tune your Flowbase workspace.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage profile, plan, categories, AI defaults, privacy, and the little preferences that make the app feel like yours.
            </p>
          </div>
        </header>

        <SettingsWorkspace initialData={settingsData} />
    </section>
  );
}
