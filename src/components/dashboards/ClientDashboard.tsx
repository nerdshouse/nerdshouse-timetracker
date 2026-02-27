"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FolderKanban, CreditCard, FileText, Users, Settings } from "lucide-react";
import type { SessionPayload } from "@/lib/auth/session";
import { SidebarLayout } from "@/components/layouts/SidebarLayout";
import { StatusBadge, PriorityBadge, PercentBadge } from "@/components/ui/badges";
import { LiveTimer } from "@/components/ui/LiveTimer";
import { Modal } from "@/components/ui/Modal";
import { TaskForm } from "@/components/forms/TaskForm";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { formatDuration, msToHours } from "@/lib/utils/format";
import { downloadProjectReportPdf, downloadClientTimeReportPdf } from "@/lib/pdf-report";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  hourlyRate: number;
  totalHoursBought: number;
  boughtDate?: string | null;
  client: { name: string };
  hoursTopUps?: Array<{ hours: number; ratePerHour: number; boughtDate?: string | null }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assignedTo: { id: string; name: string };
    timeLogs: { durationMs: number }[];
    activeTimers: { startTime: string; elapsedMs: number; user: { name: string } }[];
  }>;
};

type ActiveTimer = {
  taskId: string;
  startTime: string;
  elapsedMs: number;
  task: { id: string; title: string };
  user: { id: string; name: string };
};

const TABS = [
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "report", label: "Report", icon: FileText },
  { id: "budget", label: "Budget", icon: CreditCard },
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

export function ClientDashboard({ session }: { session: SessionPayload }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "projects";
  const tab = ["projects", "report", "budget", "team", "settings"].includes(tabParam) ? tabParam : "projects";
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientHoursTotal, setClientHoursTotal] = useState<number>(0);
  const [, setTimers] = useState<ActiveTimer[]>([]);
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  const [assignTaskProjectId, setAssignTaskProjectId] = useState<string | null>(null);
  const [developers, setDevelopers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/client-hours")
      .then((r) => r.json())
      .then((d) => setClientHoursTotal(d.totalHours ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = () =>
      fetch("/api/timers")
        .then((r) => r.json())
        .then((d) => setTimers(d.timers || []))
        .catch(() => {});
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (assignTaskOpen) {
      fetch("/api/developers")
        .then((r) => r.json())
        .then((d) => setDevelopers(d.developers || []))
        .catch(() => {});
    }
  }, [assignTaskOpen]);

  const refreshProjects = () =>
    fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(d.projects || []));

  const navLinks = TABS.map((t) => ({ href: `/client?tab=${t.id}`, label: t.label }));

  function closeAssignModal() {
    setAssignTaskOpen(false);
    setAssignTaskProjectId(null);
  }

  return (
    <SidebarLayout session={session} navItems={navLinks} accent="purple">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">Client Dashboard</h1>
          <button
            onClick={() => setAssignTaskOpen(true)}
            className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
          >
            Assign task
          </button>
        </div>

      <div>
        {tab === "projects" && (
          <div className="space-y-6">
            {clientHoursTotal > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Your hours pool</h2>
                <p className="text-2xl font-bold text-slate-800">
                  {clientHoursTotal.toFixed(1)} hours available (shared across all projects)
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Total used across projects: {(projects.reduce((s, p) => s + p.tasks.reduce((a, t) => a + t.timeLogs.reduce((x, l) => x + l.durationMs, 0), 0), 0) / (1000 * 60 * 60)).toFixed(1)} hours
                </p>
              </div>
            )}
            {projects.map((proj) => {
              const usedMs = proj.tasks.reduce(
                (s, t) => s + t.timeLogs.reduce((a, l) => a + l.durationMs, 0),
                0
              );
              const hoursUsed = msToHours(usedMs);
              const totalH = clientHoursTotal > 0 ? clientHoursTotal : proj.totalHoursBought;
              const percent = totalH > 0 ? (hoursUsed / totalH) * 100 : 0;
              const percentColor =
                percent < 70 ? "text-green-600" : percent <= 90 ? "text-amber-600" : "text-rose-600";
              return (
                <div key={proj.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <Link href={`/client/project/${proj.id}`} className="text-lg font-semibold text-slate-800 hover:text-purple-600 hover:underline">
                      {proj.name}
                    </Link>
                  </div>
                  <div className="mb-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Hours used: {hoursUsed.toFixed(1)}</span>
                      <span className={`font-medium ${percentColor}`}>{percent.toFixed(1)}% of pool used</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200">
                      <div
                        className={`h-2.5 rounded-full ${
                          percent < 70 ? "bg-green-500" : percent <= 90 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Tasks & current status</p>
                  <ul className="space-y-2">
                    {proj.tasks.map((t) => {
                      const taskTimeMs = t.timeLogs.reduce((a, l) => a + l.durationMs, 0);
                      const activeTimer = t.activeTimers?.[0];
                      return (
                        <li
                          key={t.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-800">{t.title}</span>
                            <StatusBadge status={t.status as "todo" | "in_progress" | "review" | "done"} />
                            <PriorityBadge priority={t.priority as "low" | "medium" | "high" | "critical"} />
                            <span className="text-sm text-slate-500">→ {t.assignedTo.name}</span>
                            <span className="font-mono text-sm text-slate-600">{formatDuration(taskTimeMs)}</span>
                          </div>
                          {activeTimer && (
                            <LiveTimer
                              startTime={activeTimer.startTime}
                              elapsedMs={activeTimer.elapsedMs}
                              running={new Date(activeTimer.startTime).getTime() > 1000}
                              taskTitle=""
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {tab === "report" && (
          <ClientReportTab
            projects={projects}
            formatDuration={formatDuration}
            onDownloadTimeReport={() => downloadClientTimeReportPdf(
              projects.map((p) => ({
                name: p.name,
                totalHoursBought: p.totalHoursBought,
                hourlyRate: p.hourlyRate,
                boughtDate: p.boughtDate,
                hoursTopUps: p.hoursTopUps,
              })),
              typeof window !== "undefined" ? `${window.location.origin}/nerdshouse-logo.png` : undefined,
              session.name
            )}
            onDownloadProjectReport={async (projectId: string) => {
              const proj = projects.find((p) => p.id === projectId);
              if (!proj) return;
              const timeRes = await fetch(`/api/time-logs?projectId=${projectId}`);
              const timeData = await timeRes.json();
              const timeLogs = timeData.timeLogs || [];
              await downloadProjectReportPdf(
                { ...proj, client: proj.client },
                timeLogs,
                typeof window !== "undefined" ? `${window.location.origin}/nerdshouse-logo.png` : undefined,
                session.name
              );
            }}
          />
        )}

        {tab === "budget" && <ClientBudgetTab projects={projects} />}
        {tab === "team" && <ClientTeamTab onRefresh={refreshProjects} />}
        {tab === "settings" && <ClientSettingsTab />}
      </div>

      <Modal open={assignTaskOpen} onClose={closeAssignModal} title="Assign task">
        {!assignTaskProjectId ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Select the project you want to add a task to.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700">Project</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5"
                value={assignTaskProjectId ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  setAssignTaskProjectId(id || null);
                }}
              >
                <option value="">Choose a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeAssignModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <TaskForm
            projectId={assignTaskProjectId}
            developers={developers}
            onSave={refreshProjects}
            onClose={closeAssignModal}
          />
        )}
      </Modal>
      </div>
    </SidebarLayout>
  );
}

function ClientReportTab({
  projects,
  formatDuration,
  onDownloadTimeReport,
  onDownloadProjectReport,
}: {
  projects: Project[];
  formatDuration: (ms: number) => string;
  onDownloadTimeReport: () => void;
  onDownloadProjectReport: (projectId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Full report</h2>
          <p className="mt-1 text-sm text-slate-500">All projects, tasks, status and time in one view.</p>
        </div>
        <button
          type="button"
          onClick={onDownloadTimeReport}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          Download time report (PDF)
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-medium text-slate-700">Project</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Task</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Assignee</th>
              <th className="px-4 py-3 text-right font-medium text-slate-700">Time logged</th>
              <th className="px-4 py-3 text-right font-medium text-slate-700">PDF</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((proj) => {
              return proj.tasks.map((t, taskIndex) => {
                const taskMs = t.timeLogs.reduce((a, l) => a + l.durationMs, 0);
                return (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{proj.name}</td>
                    <td className="px-4 py-3 text-slate-700">{t.title}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status as "todo" | "in_progress" | "review" | "done"} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.assignedTo.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{formatDuration(taskMs)}</td>
                    <td className="px-4 py-3 text-right">
                      {taskIndex === 0 ? (
                        <button
                          type="button"
                          onClick={() => onDownloadProjectReport(proj.id)}
                          className="text-sm text-purple-600 hover:underline"
                        >
                          Download
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientSettingsTab() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-md">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Settings</h2>
      <p className="text-sm text-slate-600">
        You sign in with Google. To use a different account, sign out and sign in again with the desired Google account.
      </p>
    </div>
  );
}

function ClientTeamTab({ onRefresh }: { onRefresh: () => void }) {
  const [members, setMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/team/members")
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add");
        return;
      }
      setMembers((m) => [...m, data.user]);
      setName("");
      setEmail("");
      setOpen(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Team members</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          Add team member
        </button>
      </div>
      <ul className="space-y-2">
        {members.map((u) => (
          <li key={u.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium">{u.name}</span>
            <span className="text-slate-500">{u.email}</span>
          </li>
        ))}
      </ul>
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Add team member">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="They sign in with Google" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50">{saving ? "Adding…" : "Add"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ClientBudgetTab({ projects }: { projects: Project[] }) {
  let totalHoursBought = 0;
  let totalHoursUsed = 0;
  projects.forEach((p) => {
    const usedMs = p.tasks.reduce(
      (s, t) => s + t.timeLogs.reduce((a, l) => a + l.durationMs, 0),
      0
    );
    totalHoursBought += p.totalHoursBought;
    totalHoursUsed += msToHours(usedMs);
  });
  const overallPercent = totalHoursBought > 0 ? (totalHoursUsed / totalHoursBought) * 100 : 0;
  const ringColor =
    overallPercent < 70 ? "text-green-500" : overallPercent <= 90 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Hours overview</h2>
        <div className="flex flex-wrap items-center gap-8">
          <ProgressRing percent={overallPercent} size={120} strokeWidth={8} colorClass={ringColor} />
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Total hours used:</span> {totalHoursUsed.toFixed(1)}</p>
            <p><span className="font-medium">Hours in pool:</span> {totalHoursBought.toFixed(1)}</p>
            <p><PercentBadge percent={overallPercent} /></p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((proj) => {
          const usedMs = proj.tasks.reduce(
            (s, t) => s + t.timeLogs.reduce((a, l) => a + l.durationMs, 0),
            0
          );
          const hoursUsed = msToHours(usedMs);
          const percent = proj.totalHoursBought > 0 ? (hoursUsed / proj.totalHoursBought) * 100 : 0;
          const projRingColor =
            percent < 70 ? "text-green-500" : percent <= 90 ? "text-amber-500" : "text-rose-500";
          return (
            <div key={proj.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-semibold text-slate-800">{proj.name}</h3>
              <div className="flex items-center gap-4">
                <ProgressRing percent={percent} size={64} colorClass={projRingColor} />
                <div className="text-sm">
                  <p>Hours used: {hoursUsed.toFixed(1)}</p>
                  <p><PercentBadge percent={percent} /></p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs">
                {proj.tasks.map((t) => {
                  const taskMs = t.timeLogs.reduce((a, l) => a + l.durationMs, 0);
                  return (
                    <li key={t.id} className="flex justify-between">
                      <span>{t.title}</span>
                      <span>{formatDuration(taskMs)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
