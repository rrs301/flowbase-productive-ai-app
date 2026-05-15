import { DashboardShell } from "@/components/dashboard-shell";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function Home() {
  await syncCurrentUserToDatabase();

  return <DashboardShell />;
}
