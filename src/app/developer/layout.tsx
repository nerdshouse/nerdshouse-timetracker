import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { canAccessDeveloper } from "@/lib/auth/permissions";

export default async function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessDeveloper(session)) redirect("/");
  return <div className="min-h-screen bg-slate-100">{children}</div>;
}
