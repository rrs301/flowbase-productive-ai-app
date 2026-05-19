import { currentUser } from "@clerk/nextjs/server";
import { CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";

import { listCalendarItems } from "@/app/calendar/actions";
import { CalendarBoard } from "@/app/calendar/calendar-board";
import { listCategoriesForScopes } from "@/app/settings/actions";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function CalendarPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const [items, categories] = await Promise.all([
    listCalendarItems(),
    listCategoriesForScopes(["calendar", "reminder"]),
  ]);

  return (
    <section className="mx-auto flex w-full max-w-[95rem] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <CalendarDays className="size-4 text-sage-600" aria-hidden="true" />
              Calendar
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-foreground">
              Schedule the work, hold the maybes.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Add tasks and reminders to dates, keep unscheduled drafts nearby, and drag work into place when the plan firms up.
            </p>
          </div>
        </header>

        <CalendarBoard initialItems={items} categories={categories} />
    </section>
  );
}
