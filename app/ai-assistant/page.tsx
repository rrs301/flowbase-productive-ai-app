import { currentUser } from "@clerk/nextjs/server";
import { Bot } from "lucide-react";
import { redirect } from "next/navigation";

import { AiAssistantWorkspace } from "@/app/ai-assistant/ai-assistant-workspace";
import { getAssistantSnapshot } from "@/app/ai-assistant/actions";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function AiAssistantPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const snapshot = await getAssistantSnapshot();

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-[104rem] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex shrink-0 flex-col gap-2 border-b border-border pb-4">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Bot className="size-4 text-violet-500" aria-hidden="true" />
            AI Assistant
          </p>
          <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            Chat, plan, and act across your workspace.
          </h1>
        </header>

        <AiAssistantWorkspace initialSnapshot={snapshot} />
    </section>
  );
}
