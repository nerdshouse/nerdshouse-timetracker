import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase-admin";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { redirectForRole } from "@/lib/auth/permissions";

/**
 * POST /api/auth/google
 * Body: { idToken: string } (Google ID token from client Firebase Auth)
 * Verifies token, finds user by email in DB (must be added by admin), creates session.
 */
export async function POST(request: NextRequest) {
  try {
    let body: { idToken?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { idToken } = body;
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    const auth = getAuth(getAdminApp());
    const decoded = await auth.verifyIdToken(idToken);
    const email = (decoded.email ?? "").trim().toLowerCase();
    const name = (decoded.name ?? decoded.email ?? "User").trim();
    if (!email) {
      return NextResponse.json({ error: "Google account has no email" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Access denied. Your email is not registered. Please ask an admin to add you." },
        { status: 403 }
      );
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    return NextResponse.json({ redirectTo: redirectForRole(user.role) });
  } catch (e) {
    console.error("[auth/google] 500:", e);
    const message = e instanceof Error ? e.message : "Sign-in failed";
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Sign-in failed. Please try again." },
      { status: 500 }
    );
  }
}
