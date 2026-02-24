import { prisma } from "@/lib/db";
import { getAdminDb } from "@/lib/firestore-server";
import { NextResponse } from "next/server";

/**
 * GET /api/db – test Prisma and Firestore connections.
 */
export async function GET() {
  const result: {
    prisma: { ok: boolean; error?: string; detail?: string };
    firestore: { ok: boolean; error?: string; detail?: string };
  } = {
    prisma: { ok: false },
    firestore: { ok: false },
  };

  // Test Prisma
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.prisma = { ok: true, detail: "connected" };
  } catch (e) {
    result.prisma = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // Test Firestore (Admin)
  try {
    const db = getAdminDb();
    await db.listCollections();
    result.firestore = { ok: true, detail: "connected" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isNotFound =
      msg.includes("NOT_FOUND") || (e as { code?: number })?.code === 5;
    result.firestore = {
      ok: false,
      error: msg,
      detail: isNotFound
        ? "Firestore database not created. In Firebase Console → Build → Firestore Database → Create database (choose a location, then start in production or test mode)."
        : undefined,
    };
  }

  const ok = result.prisma.ok && result.firestore.ok;
  return NextResponse.json(result, { status: ok ? 200 : 503 });
}
