import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { include: { user: { select: { name: true, email: true } } } },
      tasks: {
        include: {
          assignedTo: { select: { id: true, name: true } },
          timeLogs: { select: { durationMs: true } },
          activeTimers: true,
        },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.role === "DEVELOPER") {
    const hasAccess = project.tasks.some((t: (typeof project.tasks)[number]) => t.assignedToId === session.userId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "CLIENT") {
    const primaryClient = await prisma.client.findUnique({ where: { userId: session.userId } });
    const teamMember = await prisma.clientTeamMember.findUnique({
      where: { userId: session.userId },
      include: { client: true },
    });
    const client = primaryClient ?? teamMember?.client;
    if (!client || project.clientId !== client.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ project });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const current = await prisma.project.findUnique({ where: { id }, select: { totalHoursBought: true, hourlyRate: true } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let totalHoursBought: number | undefined;
  const addHours = body.addHours != null ? Number(body.addHours) : null;
  const addRate = body.ratePerHour != null ? Number(body.ratePerHour) : current.hourlyRate;
  const addBoughtDate = body.boughtDate ? new Date(body.boughtDate) : null;

  if (addHours != null && addHours > 0) {
    totalHoursBought = current.totalHoursBought + addHours;
    await prisma.hoursTopUp.create({
      data: {
        projectId: id,
        hours: addHours,
        ratePerHour: addRate,
        boughtDate: addBoughtDate,
      },
    });
  } else if (body.totalHoursBought != null) {
    totalHoursBought = Number(body.totalHoursBought);
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(body.name != null && { name: body.name }),
      ...(body.description != null && { description: body.description }),
      ...(body.status != null && { status: body.status }),
      ...(body.clientId != null && { clientId: body.clientId }),
      ...(body.hourlyRate != null && { hourlyRate: Number(body.hourlyRate) }),
      ...(totalHoursBought != null && { totalHoursBought }),
      ...(body.boughtDate != null && body.addHours == null && { boughtDate: body.boughtDate ? new Date(body.boughtDate) : null }),
    },
  });
  await logActivity("project_updated", session.userId, id, "project", `${session.name} updated project '${project.name}'`);
  return NextResponse.json({ project });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.project.delete({ where: { id } });
  await logActivity("project_deleted", session.userId, id, "project", `${session.name} deleted project '${project.name}'`);
  return NextResponse.json({ ok: true });
}
