import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

/** GET: client hours top-ups (owner: by clientId; client: own) */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const clientIdParam = searchParams.get("clientId");

  if (session.role === "OWNER") {
    const clientId = clientIdParam || undefined;
    const topUps = await prisma.clientHoursTopUp.findMany({
      where: clientId ? { clientId } : {},
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true } } },
    });
    type ByClientItem = {
      client: { id: string; name: string };
      topUps: typeof topUps;
      totalHours: number;
    };
    const byClient = topUps.reduce(
      (acc: Record<string, ByClientItem>, t: (typeof topUps)[number]): Record<string, ByClientItem> => {
        const id = t.clientId;
        if (!acc[id]) acc[id] = { client: t.client, topUps: [], totalHours: 0 };
        acc[id].topUps.push(t);
        acc[id].totalHours += t.hours;
        return acc;
      },
      {} as Record<string, ByClientItem>,
    );
    return NextResponse.json({ topUps, byClient: Object.values(byClient) });
  }

  if (session.role === "CLIENT") {
    const client = await prisma.client.findUnique({ where: { userId: session.userId } });
    const teamMember = await prisma.clientTeamMember.findUnique({
      where: { userId: session.userId },
      include: { client: true },
    });
    const resolved = client ?? teamMember?.client;
    if (!resolved) return NextResponse.json({ topUps: [], totalHours: 0 });
    const topUps = await prisma.clientHoursTopUp.findMany({
      where: { clientId: resolved.id },
      orderBy: { createdAt: "desc" },
    });
    const totalHours = topUps.reduce((s: number, t: (typeof topUps)[number]) => s + t.hours, 0);
    return NextResponse.json({ topUps, totalHours });
  }

  return NextResponse.json({ topUps: [] });
}

/** POST: owner add hours to client */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { clientId, hours, ratePerHour, boughtDate } = body;
  if (!clientId || hours == null || Number(hours) <= 0)
    return NextResponse.json({ error: "clientId and positive hours required" }, { status: 400 });

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const rate = ratePerHour != null ? Number(ratePerHour) : 0;
  const topUp = await prisma.clientHoursTopUp.create({
    data: {
      clientId,
      hours: Number(hours),
      ratePerHour: rate,
      boughtDate: boughtDate ? new Date(boughtDate) : null,
    },
  });
  await logActivity("client_hours_added", session.userId, clientId, "team", `${session.name} added ${topUp.hours} hours to client '${client.name}'`);
  return NextResponse.json({ topUp });
}
