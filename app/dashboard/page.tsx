import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getDashboardData } from "@/app/dashboard/actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  await syncCurrentUserToDatabase();
  const dashboardData = await getDashboardData();

  return <DashboardShell data={dashboardData} />;
}
