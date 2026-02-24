import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { logActivity } from "@/lib/activity";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const { name, email, password } = body;
  if (!name || !email) return NextResponse.json({ error: "name and email required" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });

  const passwordHash = password ? await hashPassword(password) : null;
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: "DEVELOPER",
      ...(passwordHash && { passwordHash }),
    },
  });
  await logActivity("developer_added", session.userId, user.id, "team", `${session.name} added developer '${user.name}'`);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
