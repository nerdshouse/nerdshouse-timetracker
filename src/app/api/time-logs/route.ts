import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");
  const taskId = searchParams.get("taskId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const sharedOnly = searchParams.get("shared") === "1";

  const dateFilter =
    fromDate || toDate
      ? {
          startTime: {
            ...(fromDate && { gte: new Date(fromDate + "T00:00:00.000Z") }),
            ...(toDate && { lte: new Date(toDate + "T23:59:59.999Z") }),
          },
        }
      : {};

  if (session.role === "OWNER") {
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        ...dateFilter,
        ...(sharedOnly ? { isShared: true } : {}),
        ...(taskId ? { taskId } : {}),
        ...(projectId ? { task: { projectId } } : {}),
      },
      include: {
        task: { select: { id: true, title: true, projectId: true, project: { select: { name: true } } } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "desc" },
      take: 200,
    });
    return NextResponse.json({ timeLogs });
  }

  if (session.role === "DEVELOPER") {
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        ...dateFilter,
        ...(taskId ? { taskId } : {}),
        ...(projectId ? { task: { projectId } } : {}),
        OR: [{ userId: session.userId }, { isShared: true }],
      },
      include: {
        task: { select: { id: true, title: true, project: { select: { name: true } } } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "desc" },
      take: 200,
    });
    return NextResponse.json({ timeLogs });
  }

  if (session.role === "CLIENT") {
    const primaryClient = await prisma.client.findUnique({ where: { userId: session.userId } });
    const teamMember = await prisma.clientTeamMember.findUnique({
      where: { userId: session.userId },
      include: { client: true },
    });
    const client = primaryClient ?? teamMember?.client;
    if (!client) return NextResponse.json({ timeLogs: [] });
    const timeLogs = await prisma.timeLog.findMany({
      where: {
        task: { project: { clientId: client.id } },
        ...dateFilter,
        ...(taskId ? { taskId } : {}),
        ...(projectId ? { task: { projectId } } : {}),
      },
      include: {
        task: { select: { id: true, title: true, project: { select: { name: true } } } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "desc" },
      take: 200,
    });
    return NextResponse.json({ timeLogs });
  }

  return NextResponse.json({ timeLogs: [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "OWNER" && session.role !== "DEVELOPER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { taskId, durationMs, entryType, loggedDate, note, isShared } = body as {
    taskId?: string;
    durationMs?: number;
    entryType?: "manual" | "duration_only";
    loggedDate?: string;
    note?: string;
    isShared?: boolean;
  };
  if (!taskId || durationMs == null || durationMs <= 0) {
    return NextResponse.json({ error: "taskId and positive durationMs required" }, { status: 400 });
  }
  const type = entryType === "duration_only" ? "duration_only" : "manual";

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (session.role === "DEVELOPER" && task.assignedToId !== session.userId) {
    return NextResponse.json({ error: "Not assigned to this task" }, { status: 403 });
  }

  const date = loggedDate ? new Date(loggedDate + "T12:00:00.000Z") : new Date();
  const startTime = new Date(date.getTime() - Number(durationMs));
  const endTime = new Date(date.getTime());

  const log = await prisma.timeLog.create({
    data: {
      taskId,
      userId: session.userId,
      startTime: type === "duration_only" ? date : startTime,
      endTime: type === "duration_only" ? date : endTime,
      durationMs: Number(durationMs),
      entryType: type,
      note: note?.trim() || null,
      isShared: Boolean(isShared),
    },
  });
  await logActivity("time_logged", session.userId, taskId, "timer", `${session.name} logged ${Math.round(Number(durationMs) / 60000)}m (${type}) on '${task.title}'`);
  await logAudit("create", "time_log", log.id, session.userId, JSON.stringify({ taskId, durationMs, entryType: type }));
  return NextResponse.json({ timeLog: log });
}
