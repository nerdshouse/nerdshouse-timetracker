import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10));
  const entityType = searchParams.get("entityType");
  const action = searchParams.get("action");

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(action ? { action } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
  return NextResponse.json({ logs });
}
