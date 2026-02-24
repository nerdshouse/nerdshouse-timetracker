import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await prisma.client.findUnique({
    where: { userId: session.userId },
  });
  if (!client) return NextResponse.json({ members: [] });
  const members = await prisma.clientTeamMember.findMany({
    where: { clientId: client.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ members: members.map((m: (typeof members)[number]) => m.user) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = await prisma.client.findUnique({
    where: { userId: session.userId },
  });
  if (!client) return NextResponse.json({ error: "Client account not found" }, { status: 404 });

  const body = await request.json();
  const { name, email, password } = body;
  if (!name || !email || !password) return NextResponse.json({ error: "name, email and password required" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: "CLIENT",
      passwordHash,
    },
  });
  await prisma.clientTeamMember.create({
    data: { clientId: client.id, userId: user.id },
  });
  await logActivity("client_team_added", session.userId, user.id, "team", `${session.name} added team member '${user.name}'`);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
