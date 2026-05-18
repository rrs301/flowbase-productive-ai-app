import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { listSidebarGeneratedApps } from "@/app/ai-template-builder/actions";
import { getDashboardData } from "@/app/dashboard/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function Home() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const [dashboardData, sidebarApps] = await Promise.all([getDashboardData(), listSidebarGeneratedApps()]);

  return <DashboardShell data={dashboardData} generatedSidebarApps={sidebarApps} />;
}
