import { DeveloperDashboard } from "@/components/dashboards/DeveloperDashboard";
import { getSession } from "@/lib/auth/session";

export default async function DeveloperPage() {
  const session = await getSession();
  if (!session) return null;
  return <DeveloperDashboard session={session} />;
}
