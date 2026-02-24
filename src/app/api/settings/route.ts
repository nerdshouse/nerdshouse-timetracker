import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const COMPANY_LOGO_KEY = "company_logo_url";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get("key") || COMPANY_LOGO_KEY;
  const setting = await prisma.setting.findUnique({
    where: { key },
  });
  return NextResponse.json({ key, value: setting?.value ?? null });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json();
  const { key = COMPANY_LOGO_KEY, value } = body as { key?: string; value?: string };
  if (key !== COMPANY_LOGO_KEY) {
    return NextResponse.json({ error: "Only company_logo_url is configurable" }, { status: 400 });
  }
  const setting = await prisma.setting.upsert({
    where: { key },
    create: { key, value: value ?? "" },
    update: { value: value ?? "" },
  });
  return NextResponse.json({ setting });
}
