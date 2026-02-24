import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { canAccessClient } from "@/lib/auth/permissions";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessClient(session)) redirect("/");
  return <div className="min-h-screen bg-slate-100">{children}</div>;
}
