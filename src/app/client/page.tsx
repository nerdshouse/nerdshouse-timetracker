import { ClientDashboard } from "@/components/dashboards/ClientDashboard";
import { getSession } from "@/lib/auth/session";

export default async function ClientPage() {
  const session = await getSession();
  if (!session) return null;
  return <ClientDashboard session={session} />;
}
