import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
  const logs = await prisma.activityLog.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
  return NextResponse.json({ logs });
}
