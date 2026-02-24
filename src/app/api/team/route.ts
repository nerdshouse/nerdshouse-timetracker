import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const developers = await prisma.user.findMany({
    where: { role: "DEVELOPER" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  const clients = await prisma.client.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ developers, clients });
}
