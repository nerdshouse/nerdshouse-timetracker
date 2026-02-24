import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");

  if (session.role === "OWNER") {
    const projects = await prisma.project.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(status ? { status: status as "active" | "on_hold" | "completed" } : {}),
      },
      include: {
        client: { include: { user: { select: { name: true, email: true } } } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true } },
            timeLogs: { select: { durationMs: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ projects });
  }

  if (session.role === "DEVELOPER") {
    const projects = await prisma.project.findMany({
      where: {
        tasks: { some: { assignedToId: session.userId } },
        ...(status ? { status: status as "active" | "on_hold" | "completed" } : {}),
      },
      include: {
        client: { select: { name: true } },
        tasks: {
          where: { assignedToId: session.userId },
          include: {
            assignedTo: { select: { id: true, name: true } },
            timeLogs: { select: { durationMs: true } },
            activeTimers: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ projects });
  }

  if (session.role === "CLIENT") {
    const primaryClient = await prisma.client.findUnique({
      where: { userId: session.userId },
    });
    const teamMember = await prisma.clientTeamMember.findUnique({
      where: { userId: session.userId },
      include: { client: true },
    });
    const client = primaryClient ?? teamMember?.client;
    if (!client) return NextResponse.json({ projects: [] });
    const projects = await prisma.project.findMany({
      where: {
        clientId: client.id,
        ...(status ? { status: status as "active" | "on_hold" | "completed" } : {}),
      },
      include: {
        client: { include: { user: { select: { name: true } } } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true } },
            timeLogs: { select: { durationMs: true } },
            activeTimers: true,
          },
        },
        hoursTopUps: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ projects });
  }

  return NextResponse.json({ projects: [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const { name, description, status, clientId, hourlyRate, totalHoursBought, boughtDate } = body;
  if (!name || !clientId || hourlyRate == null || totalHoursBought == null) {
    return NextResponse.json({ error: "name, clientId, hourlyRate, totalHoursBought required" }, { status: 400 });
  }
  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      status: status || "active",
      clientId,
      hourlyRate: Number(hourlyRate),
      totalHoursBought: Number(totalHoursBought),
      ...(boughtDate != null && { boughtDate: boughtDate ? new Date(boughtDate) : null }),
    },
  });
  await logActivity("project_created", session.userId, project.id, "project", `${session.name} created project '${project.name}'`);
  return NextResponse.json({ project });
}
