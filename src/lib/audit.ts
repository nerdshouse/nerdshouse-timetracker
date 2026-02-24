import { prisma } from "@/lib/db";

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  userId: string,
  details?: string
) {
  await prisma.auditLog.create({
    data: { action, entityType, entityId, userId, details: details ?? null },
  });
}
