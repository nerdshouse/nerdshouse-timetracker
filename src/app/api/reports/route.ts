import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "summary"; // summary | detailed | workload | billing | team
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const projectId = searchParams.get("projectId");
  const userId = searchParams.get("userId");

  const dateFilter =
    fromDate || toDate
      ? {
          startTime: {
            ...(fromDate && { gte: new Date(fromDate + "T00:00:00.000Z") }),
            ...(toDate && { lte: new Date(toDate + "T23:59:59.999Z") }),
          },
        }
      : {};

  const timeLogs = await prisma.timeLog.findMany({
    where: {
      ...dateFilter,
      ...(projectId ? { task: { projectId } } : {}),
      ...(userId ? { userId } : {}),
    },
    include: {
      task: { select: { id: true, title: true, projectId: true, project: { select: { id: true, name: true, hourlyRate: true, clientId: true, client: { select: { name: true } } } } } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { startTime: "desc" },
    take: 500,
  });

  type TimeLogItem = (typeof timeLogs)[number];
  type ByProjectSummary = { project: TimeLogItem["task"]["project"]; totalMs: number; entries: number };
  type ByUserWorkload = { user: { id: string; name: string; email: string }; totalMs: number; byProject: Record<string, number> };
  type ByProjectBilling = { project: TimeLogItem["task"]["project"]; totalMs: number };
  type ByUserTeam = { user: { id: string; name: string; email: string }; totalMs: number; entries: typeof timeLogs };

  if (type === "summary") {
    const byProject = timeLogs.reduce((acc: Record<string, ByProjectSummary>, l: TimeLogItem) => {
      const pid = l.task.project.id;
      if (!acc[pid]) acc[pid] = { project: l.task.project, totalMs: 0, entries: 0 };
      acc[pid].totalMs += l.durationMs;
      acc[pid].entries += 1;
      return acc;
    }, {} as Record<string, ByProjectSummary>);
    const summary = (Object.values(byProject) as ByProjectSummary[]).map((s) => ({
      projectId: s.project.id,
      projectName: s.project.name,
      clientName: s.project.client?.name,
      totalHours: (s.totalMs / (1000 * 60 * 60)).toFixed(2),
      entries: s.entries,
    }));
    return NextResponse.json({ type: "summary", data: summary });
  }

  if (type === "detailed") {
    const detailed = timeLogs.map((l) => ({
      id: l.id,
      task: l.task.title,
      project: l.task.project?.name,
      user: l.user.name,
      startTime: l.startTime,
      endTime: l.endTime,
      durationMs: l.durationMs,
      entryType: l.entryType,
      note: l.note,
      isLocked: l.isLocked,
    }));
    return NextResponse.json({ type: "detailed", data: detailed });
  }

  if (type === "workload") {
    const byUser = timeLogs.reduce((acc: Record<string, ByUserWorkload>, l: TimeLogItem) => {
      const uid = l.userId;
      if (!acc[uid]) acc[uid] = { user: l.user, totalMs: 0, byProject: {} };
      acc[uid].totalMs += l.durationMs;
      const pname = l.task.project?.name ?? "Other";
      acc[uid].byProject[pname] = (acc[uid].byProject[pname] || 0) + l.durationMs;
      return acc;
    }, {} as Record<string, ByUserWorkload>);
    const workload = (Object.values(byUser) as ByUserWorkload[]).map((w) => ({
      userId: w.user.id,
      userName: w.user.name,
      totalHours: (w.totalMs / (1000 * 60 * 60)).toFixed(2),
      byProject: w.byProject,
    }));
    return NextResponse.json({ type: "workload", data: workload });
  }

  if (type === "billing") {
    const byProject = timeLogs.reduce((acc: Record<string, ByProjectBilling>, l: TimeLogItem) => {
      const pid = l.task.projectId;
      if (!acc[pid]) acc[pid] = { project: l.task.project, totalMs: 0 };
      acc[pid].totalMs += l.durationMs;
      return acc;
    }, {} as Record<string, ByProjectBilling>);
    const billing = (Object.values(byProject) as ByProjectBilling[]).map((b) => ({
      projectId: b.project.id,
      projectName: b.project.name,
      clientName: b.project.client?.name,
      totalHours: b.totalMs / (1000 * 60 * 60),
      hourlyRate: b.project.hourlyRate,
      amount: (b.totalMs / (1000 * 60 * 60)) * b.project.hourlyRate,
    }));
    return NextResponse.json({ type: "billing", data: billing });
  }

  if (type === "team") {
    const byUser = timeLogs.reduce((acc: Record<string, ByUserTeam>, l: TimeLogItem) => {
      const uid = l.userId;
      if (!acc[uid]) acc[uid] = { user: l.user, totalMs: 0, entries: [] };
      acc[uid].totalMs += l.durationMs;
      acc[uid].entries.push(l);
      return acc;
    }, {} as Record<string, ByUserTeam>);
    const team = (Object.values(byUser) as ByUserTeam[]).map((t) => ({
      userId: t.user.id,
      userName: t.user.name,
      userEmail: t.user.email,
      totalHours: (t.totalMs / (1000 * 60 * 60)).toFixed(2),
      entryCount: t.entries.length,
    }));
    return NextResponse.json({ type: "team", data: team });
  }

  return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
}
