import type { TaskStatus as TaskStatusEnum, TaskPriority as TaskPriorityEnum } from "@prisma/client";

const statusClasses: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-800",
  review: "bg-amber-100 text-amber-800",
  done: "bg-green-100 text-green-800",
};

const priorityClasses: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-teal-100 text-teal-800",
  critical: "bg-rose-200 text-rose-900",
};

export function StatusBadge({ status }: { status: TaskStatusEnum }) {
  const s = status.toLowerCase();
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[s] ?? "bg-slate-100 text-slate-700"}`}>
      {s.replace("_", " ")}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriorityEnum }) {
  const p = priority.toLowerCase();
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityClasses[p] ?? "bg-slate-100"}`}>
      {p}
    </span>
  );
}

export function PercentBadge({ percent }: { percent: number }) {
  const color =
    percent < 70 ? "bg-green-100 text-green-800" : percent <= 90 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {Math.min(100, Math.max(0, percent)).toFixed(1)}%
    </span>
  );
}
