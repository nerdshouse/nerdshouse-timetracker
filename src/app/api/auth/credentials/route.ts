import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/** PATCH: change own password (currentPassword, newPassword). Client/Developer can change anytime. */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: "currentPassword and newPassword required" }, { status: 400 });
  if (newPassword.length < 6)
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.passwordHash)
    return NextResponse.json({ error: "No password set. Use login reset flow." }, { status: 400 });

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  return NextResponse.json({ ok: true });
}
