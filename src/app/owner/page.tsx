import { OwnerDashboard } from "@/components/dashboards/OwnerDashboard";
import { getSession } from "@/lib/auth/session";

export default async function OwnerPage() {
  const session = await getSession();
  if (!session) return null;
  return <OwnerDashboard session={session} />;
}
