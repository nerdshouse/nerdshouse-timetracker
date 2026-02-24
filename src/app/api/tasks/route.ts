import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { projectId, title, description, status, priority, assignedToId } = body;
  if (!projectId || !title || !assignedToId) {
    return NextResponse.json({ error: "projectId, title, assignedToId required" }, { status: 400 });
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (session.role === "CLIENT") {
    const client = await prisma.client.findUnique({ where: { userId: session.userId } });
    if (!client || project.clientId !== client.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "DEVELOPER") return NextResponse.json({ error: "Only Owner or Client can create tasks" }, { status: 403 });

  const task = await prisma.task.create({
    data: {
      projectId,
      title,
      description: description || null,
      status: (status as "todo" | "in_progress" | "review" | "done") || "todo",
      priority: (priority as "low" | "medium" | "high" | "critical") || "medium",
      assignedToId,
      createdById: session.userId,
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });
  await logActivity("task_created", session.userId, task.id, "task", `${session.name} created task '${task.title}' and assigned to ${task.assignedTo.name}`);
  return NextResponse.json({ task });
}
