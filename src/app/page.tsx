import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { redirectForRole } from "@/lib/auth/permissions";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(redirectForRole(session.role));
}
