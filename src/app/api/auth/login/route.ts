import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { redirectForRole } from "@/lib/auth/permissions";
import { verifyPassword, hashPassword } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  try {
    let body: { userId?: string; email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { userId, email, password } = body;

    // Legacy: login by userId (no password)
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true },
      });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
      return NextResponse.json({ redirectTo: redirectForRole(user.role) });
    }

    // Email + password login
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: emailNorm },
      select: { id: true, name: true, email: true, role: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    // If no password set yet (e.g. before seed), accept default and set it
    if (!user.passwordHash) {
      const defaultPassword = "password123";
      if (password !== defaultPassword) {
        return NextResponse.json({ error: "This account has no password set. Try password: password123" }, { status: 401 });
      }
      const hash = await hashPassword(defaultPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash },
      });
      await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
      return NextResponse.json({ redirectTo: redirectForRole(user.role) });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    await createSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
    return NextResponse.json({ redirectTo: redirectForRole(user.role) });
  } catch (e) {
    console.error("[auth/login] 500:", e);
    const message = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
