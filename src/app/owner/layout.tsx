import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { canAccessOwner } from "@/lib/auth/permissions";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessOwner(session)) redirect("/");
  return <div className="min-h-screen bg-slate-100">{children}</div>;
}
