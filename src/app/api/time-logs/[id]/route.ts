import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const timeLog = await prisma.timeLog.findUnique({
    where: { id },
    include: { task: true },
  });
  if (!timeLog) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (timeLog.isLocked) {
    return NextResponse.json({ error: "Time entry is locked and cannot be edited" }, { status: 403 });
  }
  if (session.role === "DEVELOPER" && timeLog.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { durationMs, note, isShared } = body as { durationMs?: number; note?: string; isShared?: boolean };
  const updates: { durationMs?: number; startTime?: Date; endTime?: Date; note?: string; isShared?: boolean } = {};
  if (durationMs != null && durationMs > 0) {
    updates.durationMs = durationMs;
    const mid = (new Date(timeLog.startTime).getTime() + new Date(timeLog.endTime).getTime()) / 2;
    updates.startTime = new Date(mid - durationMs / 2);
    updates.endTime = new Date(mid + durationMs / 2);
  }
  if (note !== undefined) updates.note = note?.trim() || undefined;
  if (isShared !== undefined) updates.isShared = Boolean(isShared);

  const updated = await prisma.timeLog.update({
    where: { id },
    data: updates,
  });
  await logAudit("update", "time_log", id, session.userId, JSON.stringify(updates));
  return NextResponse.json({ timeLog: updated });
}
