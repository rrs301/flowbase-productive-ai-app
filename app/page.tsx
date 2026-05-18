import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { listSidebarGeneratedApps } from "@/app/ai-template-builder/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function Home() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const sidebarApps = await listSidebarGeneratedApps();

  return <DashboardShell generatedSidebarApps={sidebarApps} />;
}
