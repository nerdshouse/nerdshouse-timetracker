import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id }, include: { assignedTo: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = session.role === "OWNER" || (session.role === "DEVELOPER" && task.assignedToId === session.userId);
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const update: Record<string, unknown> = {};
  if (body.title != null) update.title = body.title;
  if (body.description != null) update.description = body.description;
  if (body.status != null) update.status = body.status;
  if (body.priority != null) update.priority = body.priority;
  if (body.assignedToId != null && session.role === "OWNER") update.assignedToId = body.assignedToId;

  const updated = await prisma.task.update({
    where: { id },
    data: update,
    include: {
      project: true,
      assignedTo: { select: { id: true, name: true } },
    },
  });
  if (body.status != null) {
    await logActivity("task_status_updated", session.userId, id, "task", `${session.name} set task '${task.title}' to ${body.status}`);
  }
  return NextResponse.json({ task: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.task.delete({ where: { id } });
  await logActivity("task_deleted", session.userId, id, "task", `${session.name} deleted task '${task.title}'`);
  return NextResponse.json({ ok: true });
}
