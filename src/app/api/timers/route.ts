import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const timers = await prisma.activeTimer.findMany({
    include: {
      task: { select: { id: true, title: true } },
      user: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ timers });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "OWNER" && session.role !== "DEVELOPER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, taskId } = body as { action: string; taskId: string };
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (session.role === "DEVELOPER" && task.assignedToId !== session.userId) {
    return NextResponse.json({ error: "Not assigned to this task" }, { status: 403 });
  }

  const existing = await prisma.activeTimer.findUnique({
    where: { taskId },
    include: { user: true },
  });

  if (action === "start") {
    if (existing) {
      return NextResponse.json({ error: "Timer already running for this task" }, { status: 400 });
    }
    // Optional: one active timer per developer
    const myTimer = await prisma.activeTimer.findFirst({
      where: { userId: session.userId },
    });
    if (myTimer && session.role === "DEVELOPER") {
      return NextResponse.json(
        { error: "You already have an active timer. Stop or pause it first." },
        { status: 400 }
      );
    }
    await prisma.activeTimer.create({
      data: {
        taskId,
        userId: session.userId,
        startTime: new Date(),
        elapsedMs: 0,
      },
    });
    await logActivity("timer_started", session.userId, taskId, "timer", `${session.name} started timer on '${task.title}'`);
    return NextResponse.json({ ok: true });
  }

  if (action === "pause") {
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: "No active timer for you on this task" }, { status: 400 });
    }
    const now = Date.now();
    const start = new Date(existing.startTime).getTime();
    const newElapsed = existing.elapsedMs + (now - start);
    await prisma.activeTimer.update({
      where: { taskId },
      data: { startTime: new Date(0), elapsedMs: newElapsed }, // epoch = paused
    });
    await logActivity("timer_paused", session.userId, taskId, "timer", `${session.name} paused timer on '${task.title}'`);
    return NextResponse.json({ ok: true });
  }

  if (action === "resume") {
    if (!existing || existing.userId !== session.userId) {
      return NextResponse.json({ error: "No active timer for you on this task" }, { status: 400 });
    }
    await prisma.activeTimer.update({
      where: { taskId },
      data: { startTime: new Date(), elapsedMs: existing.elapsedMs },
    });
    await logActivity("timer_resumed", session.userId, taskId, "timer", `${session.name} resumed timer on '${task.title}'`);
    return NextResponse.json({ ok: true });
  }

  if (action === "stop") {
    if (!existing || (session.role === "DEVELOPER" && existing.userId !== session.userId)) {
      return NextResponse.json({ error: "No active timer for you on this task" }, { status: 400 });
    }
    const now = Date.now();
    const start = new Date(existing.startTime).getTime();
    const durationMs = start > 1000 ? existing.elapsedMs + (now - start) : existing.elapsedMs;
    const log = await prisma.timeLog.create({
      data: {
        taskId,
        userId: existing.userId,
        startTime: new Date(now - durationMs),
        endTime: new Date(now),
        durationMs,
        entryType: "realtime",
      },
    });
    await logAudit("create", "time_log", log.id, session.userId, JSON.stringify({ taskId, durationMs, entryType: "realtime" }));
    await prisma.activeTimer.delete({ where: { taskId } });
    const mins = Math.floor(durationMs / 60000);
    await logActivity("timer_stopped", existing.userId, taskId, "timer", `${session.name} stopped timer on '${task.title}' (${mins}m logged)`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
