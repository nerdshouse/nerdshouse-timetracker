import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "password123";

async function main() {
  const ownerHash = await hashPassword(DEFAULT_PASSWORD);
  // 1 Owner, 2 Developers, 2 Clients
  const owner = await prisma.user.upsert({
    where: { email: "alex@company.com" },
    update: { passwordHash: ownerHash },
    create: {
      name: "Alex Morgan",
      email: "alex@company.com",
      role: "OWNER",
      passwordHash: ownerHash,
    },
  });

  const dev1 = await prisma.user.upsert({
    where: { email: "jordan@company.com" },
    update: { passwordHash: await hashPassword(DEFAULT_PASSWORD) },
    create: {
      name: "Jordan Lee",
      email: "jordan@company.com",
      role: "DEVELOPER",
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
    },
  });

  const dev2 = await prisma.user.upsert({
    where: { email: "sam@company.com" },
    update: { passwordHash: await hashPassword(DEFAULT_PASSWORD) },
    create: {
      name: "Sam Chen",
      email: "sam@company.com",
      role: "DEVELOPER",
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
    },
  });

  const clientUser1 = await prisma.user.upsert({
    where: { email: "taylor@swiftinc.com" },
    update: { passwordHash: await hashPassword(DEFAULT_PASSWORD) },
    create: {
      name: "Taylor Swift",
      email: "taylor@swiftinc.com",
      role: "CLIENT",
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
    },
  });

  const clientUser2 = await prisma.user.upsert({
    where: { email: "morgan@industries.com" },
    update: { passwordHash: await hashPassword(DEFAULT_PASSWORD) },
    create: {
      name: "Morgan Industries",
      email: "morgan@industries.com",
      role: "CLIENT",
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
    },
  });

  const client1 = await prisma.client.upsert({
    where: { userId: clientUser1.id },
    update: {},
    create: {
      name: "Taylor Swift Inc.",
      contactEmail: "taylor@swiftinc.com",
      userId: clientUser1.id,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { userId: clientUser2.id },
    update: {},
    create: {
      name: "Morgan Industries",
      contactEmail: "morgan@industries.com",
      userId: clientUser2.id,
    },
  });

  // 2 Projects
  const project1 = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      name: "E-Commerce Platform",
      description: "Full e-commerce solution with cart and payments",
      status: "active",
      clientId: client1.id,
      hourlyRate: 1200,
      totalHoursBought: 50,
      boughtDate: new Date(),
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: "seed-project-2" },
    update: {},
    create: {
      id: "seed-project-2",
      name: "CRM Dashboard",
      description: "Customer relationship management dashboard",
      status: "active",
      clientId: client2.id,
      hourlyRate: 1500,
      totalHoursBought: 30,
      boughtDate: new Date(),
    },
  });

  // 5 Tasks
  const task1 = await prisma.task.upsert({
    where: { id: "seed-task-1" },
    update: {},
    create: {
      id: "seed-task-1",
      projectId: project1.id,
      title: "Setup product catalog",
      description: "Create product listing and filters",
      status: "done",
      priority: "high",
      assignedToId: dev1.id,
      createdById: owner.id,
    },
  });

  const task2 = await prisma.task.upsert({
    where: { id: "seed-task-2" },
    update: {},
    create: {
      id: "seed-task-2",
      projectId: project1.id,
      title: "Implement checkout flow",
      description: "Cart and payment integration",
      status: "in_progress",
      priority: "critical",
      assignedToId: dev1.id,
      createdById: clientUser1.id,
    },
  });

  const task3 = await prisma.task.upsert({
    where: { id: "seed-task-3" },
    update: {},
    create: {
      id: "seed-task-3",
      projectId: project1.id,
      title: "Admin dashboard",
      description: "Back-office product and order management",
      status: "todo",
      priority: "medium",
      assignedToId: dev2.id,
      createdById: owner.id,
    },
  });

  const task4 = await prisma.task.upsert({
    where: { id: "seed-task-4" },
    update: {},
    create: {
      id: "seed-task-4",
      projectId: project2.id,
      title: "Lead pipeline view",
      description: "Kanban view for leads",
      status: "review",
      priority: "high",
      assignedToId: dev2.id,
      createdById: owner.id,
    },
  });

  const task5 = await prisma.task.upsert({
    where: { id: "seed-task-5" },
    update: {},
    create: {
      id: "seed-task-5",
      projectId: project2.id,
      title: "Reports and analytics",
      description: "Charts and export",
      status: "todo",
      priority: "low",
      assignedToId: dev1.id,
      createdById: clientUser2.id,
    },
  });

  // 4 historical time logs (durations in ms: 1h=3600000, 30m=1800000, etc.)
  const oneHour = 3600000;
  const thirtyMin = 1800000;
  const fortyFiveMin = 45 * 60000;
  const twentyMin = 20 * 60000;

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 2);

  await prisma.timeLog.createMany({
    data: [
      {
        taskId: task1.id,
        userId: dev1.id,
        startTime: new Date(baseDate.getTime() - oneHour),
        endTime: baseDate,
        durationMs: oneHour,
      },
      {
        taskId: task2.id,
        userId: dev1.id,
        startTime: new Date(baseDate.getTime() + oneHour),
        endTime: new Date(baseDate.getTime() + oneHour + thirtyMin),
        durationMs: thirtyMin,
      },
      {
        taskId: task4.id,
        userId: dev2.id,
        startTime: new Date(baseDate.getTime() + 2 * oneHour),
        endTime: new Date(baseDate.getTime() + 2 * oneHour + fortyFiveMin),
        durationMs: fortyFiveMin,
      },
      {
        taskId: task5.id,
        userId: dev1.id,
        startTime: new Date(baseDate.getTime() - 2 * oneHour),
        endTime: new Date(baseDate.getTime() - 2 * oneHour + twentyMin),
        durationMs: twentyMin,
      },
    ],
  });

  // 3 activity log entries
  await prisma.activityLog.createMany({
    data: [
      {
        type: "project_created",
        userId: owner.id,
        entityId: project1.id,
        entityType: "project",
        message: "Alex Morgan created project 'E-Commerce Platform'",
      },
      {
        type: "task_assigned",
        userId: owner.id,
        entityId: task2.id,
        entityType: "task",
        message: "Alex Morgan assigned task 'Implement checkout flow' to Jordan Lee",
      },
      {
        type: "timer_stopped",
        userId: dev1.id,
        entityId: task1.id,
        entityType: "timer",
        message: "Jordan Lee stopped timer on task 'Setup product catalog' (1h 0m logged)",
      },
    ],
  });

  console.log("Seed completed: 1 owner, 2 devs, 2 clients, 2 projects, 5 tasks, 4 time logs, 3 activity logs");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
