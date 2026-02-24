import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const lock = body.lock === true;

  const timeLog = await prisma.timeLog.findUnique({ where: { id } });
  if (!timeLog) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.timeLog.update({
    where: { id },
    data: {
      isLocked: lock,
      lockedAt: lock ? new Date() : null,
      lockedById: lock ? session.userId : null,
    },
  });
  await logAudit(lock ? "lock" : "unlock", "time_log", id, session.userId, undefined);
  return NextResponse.json({ timeLog: updated });
}
