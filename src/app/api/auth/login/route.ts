import { NextResponse } from "next/server";

/**
 * Email/password login removed. Use Google Sign-In only.
 * POST /api/auth/login now returns 400 and directs to use the login page (Google).
 */
export async function POST() {
  return NextResponse.json(
    { error: "Use Google Sign-In on the login page." },
    { status: 400 }
  );
}
