import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ClientProjectDetail } from "./ClientProjectDetail";

export default async function ClientProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  return <ClientProjectDetail session={session} projectId={id} />;
}
