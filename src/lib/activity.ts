import { prisma } from "@/lib/db";

type EntityType = "project" | "task" | "timer" | "team";

export async function logActivity(
  type: string,
  userId: string,
  entityId: string,
  entityType: EntityType,
  message: string
) {
  await prisma.activityLog.create({
    data: { type, userId, entityId, entityType, message },
  });
}
