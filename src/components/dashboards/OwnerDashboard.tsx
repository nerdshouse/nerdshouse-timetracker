"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  Clock,
  Activity,
  Users,
  FileBarChart,
  Settings,
  ClipboardList,
} from "lucide-react";
import type { SessionPayload } from "@/lib/auth/session";
import { SidebarLayout } from "@/components/layouts/SidebarLayout";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, PriorityBadge, PercentBadge } from "@/components/ui/badges";
import { LiveTimer } from "@/components/ui/LiveTimer";
import { formatDuration, formatCurrency, msToHours } from "@/lib/utils/format";
import { ProjectForm } from "@/components/forms/ProjectForm";
import { TaskForm } from "@/components/forms/TaskForm";
import { downloadProjectReportPdf } from "@/lib/pdf-report";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "reports", label: "Reports", icon: FileBarChart },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "time", label: "Time Logs", icon: Clock },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "audit", label: "Audit log", icon: ClipboardList },
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientId: string;
  hourlyRate: number;
  totalHoursBought: number;
  boughtDate: string | null;
  client: { name: string; user: { name: string; email: string } };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assignedTo: { id: string; name: string };
    timeLogs: { durationMs: number }[];
  }>;
};

type TimeLog = {
  id: string;
  taskId: string;
  userId: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  entryType?: string;
  note?: string | null;
  isLocked?: boolean;
  isShared?: boolean;
  task: { id: string; title: string; project: { name: string } };
  user: { id: string; name: string };
};

type ActivityLog = {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  user: { name: string };
};

type ActiveTimer = {
  taskId: string;
  startTime: string;
  elapsedMs: number;
  task: { id: string; title: string };
  user: { id: string; name: string };
};

export function OwnerDashboard({ session }: { session: SessionPayload }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") || "overview";
  const tab = ["overview", "projects", "reports", "billing", "time", "activity", "audit", "team", "settings"].includes(tabParam) ? tabParam : "overview";
  const setTab = (t: string) => router.replace(`/owner?tab=${t}`);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalEdit, setProjectModalEdit] = useState<Project | null>(null);
  const [taskModalProjectId, setTaskModalProjectId] = useState<string | null>(null);
  const [addTimeProject, setAddTimeProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [developers, setDevelopers] = useState<Array<{ id: string; name: string }>>([]);

  const refreshProjects = () => fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(d.projects || []));

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
  }, [tab]);

  useEffect(() => {
    if (tab === "projects" || projectModalOpen || taskModalProjectId) {
      fetch("/api/team")
        .then((r) => r.json())
        .then((d) => {
          setClients((d.clients || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
          setDevelopers(d.developers || []);
        })
        .catch(() => {});
    }
  }, [tab, projectModalOpen, taskModalProjectId]);

  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; entityType: string; entityId: string; details: string | null; timestamp: string; user: { name: string } }>>([]);
  const [reportType, setReportType] = useState<"summary" | "detailed" | "workload" | "billing" | "team">("summary");
  const [reportData, setReportData] = useState<unknown>(null);
  useEffect(() => {
    if (tab === "time" || tab === "reports") {
      const q = new URLSearchParams();
      if (reportFromDate) q.set("fromDate", reportFromDate);
      if (reportToDate) q.set("toDate", reportToDate);
      fetch(`/api/time-logs?${q.toString()}`)
        .then((r) => r.json())
        .then((d) => setTimeLogs(d.timeLogs || []))
        .catch(() => {});
    }
  }, [tab, reportFromDate, reportToDate]);

  useEffect(() => {
    if (tab === "activity") {
      fetch("/api/activity")
        .then((r) => r.json())
        .then((d) => setActivityLogs(d.logs || []))
        .catch(() => {});
    }
  }, [tab]);
  useEffect(() => {
    if (tab === "audit") {
      fetch("/api/audit?limit=100")
        .then((r) => r.json())
        .then((d) => setAuditLogs(d.logs || []))
        .catch(() => {});
    }
  }, [tab]);
  useEffect(() => {
    if (tab === "reports") {
      const q = new URLSearchParams({ type: reportType });
      if (reportFromDate) q.set("fromDate", reportFromDate);
      if (reportToDate) q.set("toDate", reportToDate);
      fetch(`/api/reports?${q.toString()}`)
        .then((r) => r.json())
        .then((d) => setReportData(d.data))
        .catch(() => setReportData(null));
    }
  }, [tab, reportType, reportFromDate, reportToDate]);

  useEffect(() => {
    fetch("/api/timers")
      .then((r) => r.json())
      .then((d) => setTimers(d.timers || []))
      .catch(() => {});
    const id = setInterval(() => {
      fetch("/api/timers").then((r) => r.json()).then((d) => setTimers(d.timers || [])).catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, [tab]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const totalRevenue = projects.reduce((sum, p) => {
    const used = p.tasks.reduce((s, t) => s + t.timeLogs.reduce((a, l) => a + l.durationMs, 0), 0);
    const hours = msToHours(used);
    return sum + hours * p.hourlyRate;
  }, 0);
  const totalTasks = projects.reduce((s, p) => s + p.tasks.length, 0);
  const pendingTasks = projects.reduce(
    (s, p) => s + p.tasks.filter((t) => t.status !== "done").length,
    0
  );
  const totalTimeMs = projects.reduce(
    (s, p) => s + p.tasks.reduce((a, t) => a + t.timeLogs.reduce((x, l) => x + l.durationMs, 0), 0),
    0
  );

  const navLinks = TABS.map((t) => ({
    href: `/owner?tab=${t.id}`,
    label: t.label,
  }));

  return (
    <SidebarLayout session={session} navItems={navLinks} accent="teal">
      <div className="mx-auto max-w-5xl">
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Projects" value={projects.length} subtext="Total projects" icon={FolderKanban} iconBg="bg-teal-50" />
              <StatCard label="Pending tasks" value={pendingTasks} subtext={`of ${totalTasks} total`} icon={LayoutDashboard} iconBg="bg-amber-50" />
              <StatCard label="Total time" value={formatDuration(totalTimeMs)} subtext="All projects" icon={Clock} iconBg="bg-blue-50" />
              <StatCard
                label="Revenue earned"
                value={formatCurrency(totalRevenue)}
                subtext="Across all projects"
                icon={CreditCard}
                iconBg="bg-green-50"
              />
            </div>
            {timers.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="mb-3 text-base font-semibold text-slate-800">Active timers</h2>
                <div className="flex flex-wrap gap-3">
                  {timers.map((tm) => (
                    <LiveTimer
                      key={tm.taskId}
                      startTime={tm.startTime}
                      elapsedMs={tm.elapsedMs}
                      running={new Date(tm.startTime).getTime() > 1000}
                      taskTitle={`${tm.task.title} (${tm.user.name})`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "projects" && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Projects</h2>
              <button
                onClick={() => { setProjectModalEdit(null); setProjectModalOpen(true); }}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Add project
              </button>
            </div>
            {projects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                onEdit={() => { setProjectModalEdit(proj); setProjectModalOpen(true); }}
                onAddTask={() => setTaskModalProjectId(proj.id)}
                onAddTime={() => setAddTimeProject(proj)}
                onRefresh={refreshProjects}
              />
            ))}
            <Modal
              open={projectModalOpen}
              onClose={() => { setProjectModalOpen(false); setProjectModalEdit(null); }}
              title={projectModalEdit ? "Edit project" : "New project"}
            >
              <ProjectForm
                initial={projectModalEdit}
                clients={clients}
                onSave={refreshProjects}
                onClose={() => { setProjectModalOpen(false); setProjectModalEdit(null); }}
              />
            </Modal>
            <Modal
              open={!!taskModalProjectId}
              onClose={() => setTaskModalProjectId(null)}
              title="Assign task"
            >
              {taskModalProjectId && (
                <TaskForm
                  projectId={taskModalProjectId}
                  developers={developers}
                  onSave={refreshProjects}
                  onClose={() => setTaskModalProjectId(null)}
                />
              )}
            </Modal>
            <Modal open={!!addTimeProject} onClose={() => setAddTimeProject(null)} title="Add time to project">
              {addTimeProject && (
                <AddTimeForm
                  project={addTimeProject}
                  onSave={refreshProjects}
                  onClose={() => setAddTimeProject(null)}
                />
              )}
            </Modal>
          </div>
        )}

        {tab === "reports" && (
          <ReportsTab
            reportType={reportType}
            reportData={reportData}
            formatDuration={formatDuration}
            formatCurrency={formatCurrency}
            fromDate={reportFromDate}
            toDate={reportToDate}
            onReportTypeChange={setReportType}
            onFromDateChange={setReportFromDate}
            onToDateChange={setReportToDate}
          />
        )}

        {tab === "billing" && (
          <BillingTab projects={projects} />
        )}

        {tab === "time" && (
          <TimeLogsTab
            timeLogs={timeLogs}
            formatDuration={formatDuration}
            fromDate={reportFromDate}
            toDate={reportToDate}
            onFromDateChange={setReportFromDate}
            onToDateChange={setReportToDate}
            onLock={async (id, lock) => {
              await fetch(`/api/time-logs/${id}/lock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lock }) });
              const r = await fetch(`/api/time-logs?fromDate=${reportFromDate}&toDate=${reportToDate}`);
              const d = await r.json();
              setTimeLogs(d.timeLogs || []);
            }}
          />
        )}

        {tab === "activity" && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 px-4 py-3 text-lg font-semibold">Activity log</h2>
            <ul className="divide-y divide-slate-100">
              {activityLogs.map((log) => (
                <li key={log.id} className="px-4 py-3 text-sm">
                  <span className="text-slate-700">{log.message}</span>
                  <span className="ml-2 text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "audit" && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <h2 className="border-b border-slate-200 px-4 py-3 text-lg font-semibold">Audit log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Time</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">User</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Action</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Entity</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100">
                      <td className="px-4 py-2 text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-2">{log.user?.name ?? "—"}</td>
                      <td className="px-4 py-2 font-medium">{log.action}</td>
                      <td className="px-4 py-2">{log.entityType} #{log.entityId.slice(0, 8)}</td>
                      <td className="px-4 py-2 text-slate-500 max-w-xs truncate">{log.details ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "settings" && <SettingsTab />}

        {tab === "team" && <TeamTab />}
      </div>
    </SidebarLayout>
  );
}

function AddTimeForm({
  project,
  onSave,
  onClose,
}: {
  project: Project;
  onSave: () => void;
  onClose: () => void;
}) {
  const [hours, setHours] = useState("");
  const [ratePerHour, setRatePerHour] = useState(String(project.hourlyRate));
  const [boughtDate, setBoughtDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const add = Number(hours) || 0;
  const rate = Number(ratePerHour) || project.hourlyRate;
  const newTotal = project.totalHoursBought + add;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (add <= 0) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addHours: add,
          ratePerHour: rate,
          boughtDate: boughtDate || null,
        }),
      });
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Add purchased hours to <strong>{project.name}</strong>. Current hours: <strong>{project.totalHoursBought}</strong>.
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700">Hours to add</label>
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          placeholder="e.g. 10"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Rate (Rs./hr) at which bought</label>
        <input
          type="number"
          min={0}
          value={ratePerHour}
          onChange={(e) => setRatePerHour(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Bought date</label>
        <input
          type="date"
          value={boughtDate}
          onChange={(e) => setBoughtDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
        />
      </div>
      {add > 0 && (
        <p className="text-sm text-slate-600">New total: <strong>{newTotal}</strong> hours · Amount: Rs. {Math.round(add * rate).toLocaleString("en-IN")}</p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving || add <= 0} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? "Adding..." : "Add time"}
        </button>
      </div>
    </form>
  );
}

function ProjectCard({
  project,
  onEdit,
  onAddTask,
  onAddTime,
  onRefresh,
}: {
  project: Project;
  onEdit: () => void;
  onAddTask: () => void;
  onAddTime: () => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hoursUsed = project.tasks.reduce(
    (s, t) => s + t.timeLogs.reduce((a, l) => a + l.durationMs, 0),
    0
  );
  const hoursUsedH = msToHours(hoursUsed);
  const contractValue = project.hourlyRate * project.totalHoursBought;
  const boughtDateStr = project.boughtDate ? new Date(project.boughtDate).toLocaleDateString() : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900">{project.name}</span>
          <span className="text-sm text-slate-500">{project.client.name}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{project.status}</span>
        </div>
        <span className="text-slate-400">{project.tasks.length} tasks</span>
      </button>
      {open && (
        <div className="border-t border-slate-200 px-4 py-3">
          <p className="mb-2 text-sm text-slate-600">{project.description || "—"}</p>
          <p className="mb-1 text-xs text-slate-500">
            Billing: {formatCurrency(project.hourlyRate)}/hr × {project.totalHoursBought}h = {formatCurrency(contractValue)}
          </p>
          {boughtDateStr && <p className="mb-3 text-xs text-slate-500">Bought date: {boughtDateStr}</p>}
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg bg-slate-200 px-2 py-1.5 text-sm hover:bg-slate-300"
            >
              Edit project
            </button>
            <button
              onClick={onAddTask}
              className="rounded-lg bg-teal-100 px-2 py-1.5 text-sm text-teal-800 hover:bg-teal-200"
            >
              Add task
            </button>
            <button
              onClick={onAddTime}
              className="rounded-lg bg-green-100 px-2 py-1.5 text-sm text-green-800 hover:bg-green-200"
            >
              Add time
            </button>
            <button
              onClick={async () => {
                const res = await fetch(`/api/time-logs?projectId=${project.id}`);
                const d = await res.json();
                const settingsRes = await fetch("/api/settings?key=company_logo_url").catch(() => null);
                const settings = settingsRes?.ok ? await settingsRes.json() : {};
                const logoUrl = (settings.value && settings.value.startsWith("http")) ? settings.value : (typeof window !== "undefined" ? `${window.location.origin}/nerdshouse-logo.png` : undefined);
                await downloadProjectReportPdf(project, d.timeLogs || [], logoUrl, project.client?.name);
              }}
              className="rounded-lg bg-slate-100 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
            >
              Download PDF
            </button>
          </div>
          <ul className="space-y-2">
            {project.tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm"
              >
                <span>{t.title}</span>
                <span className="flex gap-2">
                  <StatusBadge status={t.status as "todo" | "in_progress" | "review" | "done"} />
                  <PriorityBadge priority={t.priority as "low" | "medium" | "high" | "critical"} />
                  <span className="font-mono text-slate-600">
                    {formatDuration(t.timeLogs.reduce((a, l) => a + l.durationMs, 0))}
                  </span>
                  <span>{t.assignedTo.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon.getTime(), end: sun.getTime() };
}

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

function ReportsTab({
  reportType,
  reportData,
  formatDuration,
  formatCurrency,
  fromDate,
  toDate,
  onReportTypeChange,
  onFromDateChange,
  onToDateChange,
}: {
  reportType: "summary" | "detailed" | "workload" | "billing" | "team";
  reportData: unknown;
  formatDuration: (ms: number) => string;
  formatCurrency: (n: number) => string;
  fromDate: string;
  toDate: string;
  onReportTypeChange: (v: "summary" | "detailed" | "workload" | "billing" | "team") => void;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
}) {
  const data = reportData as any[] | null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <span className="text-sm font-medium text-slate-700">Report type</span>
        <select
          value={reportType}
          onChange={(e) => onReportTypeChange(e.target.value as any)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="summary">Summary</option>
          <option value="detailed">Detailed</option>
          <option value="workload">Workload</option>
          <option value="billing">Billing</option>
          <option value="team">Team</option>
        </select>
        <span className="text-sm font-medium text-slate-700">Date range</span>
        <input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <span className="text-slate-400">to</span>
        <input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {reportType === "summary" && Array.isArray(data) && (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50"><th className="px-4 py-2 text-left">Project</th><th className="px-4 py-2 text-left">Client</th><th className="px-4 py-2 text-right">Total hours</th><th className="px-4 py-2 text-right">Entries</th></tr></thead>
            <tbody>
              {data.map((r: { projectName: string; clientName: string; totalHours: string; entries: number }, i: number) => (
                <tr key={i} className="border-t border-slate-100"><td className="px-4 py-2 font-medium">{r.projectName}</td><td className="px-4 py-2">{r.clientName}</td><td className="px-4 py-2 text-right font-mono">{r.totalHours}</td><td className="px-4 py-2 text-right">{r.entries}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {reportType === "detailed" && Array.isArray(data) && (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50"><th className="px-4 py-2 text-left">Task</th><th className="px-4 py-2 text-left">Project</th><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">Start</th><th className="px-4 py-2 text-right">Duration</th><th className="px-4 py-2 text-left">Type</th></tr></thead>
            <tbody>
              {data.map((r: { task: string; project: string; user: string; startTime: string; durationMs: number; entryType: string }) => (
                <tr key={r.startTime + r.task} className="border-t border-slate-100"><td className="px-4 py-2">{r.task}</td><td className="px-4 py-2">{r.project}</td><td className="px-4 py-2">{r.user}</td><td className="px-4 py-2">{new Date(r.startTime).toLocaleString()}</td><td className="px-4 py-2 text-right font-mono">{formatDuration(r.durationMs)}</td><td className="px-4 py-2">{r.entryType}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {reportType === "workload" && Array.isArray(data) && (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50"><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-right">Total hours</th><th className="px-4 py-2 text-left">By project</th></tr></thead>
            <tbody>
              {data.map((r: { userName: string; totalHours: string; byProject: Record<string, number> }, i: number) => (
                <tr key={i} className="border-t border-slate-100"><td className="px-4 py-2 font-medium">{r.userName}</td><td className="px-4 py-2 text-right font-mono">{r.totalHours}</td><td className="px-4 py-2 text-slate-600">{Object.entries(r.byProject || {}).map(([p, ms]) => `${p}: ${formatDuration(ms)}`).join(", ")}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {reportType === "billing" && Array.isArray(data) && (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50"><th className="px-4 py-2 text-left">Project</th><th className="px-4 py-2 text-left">Client</th><th className="px-4 py-2 text-right">Hours</th><th className="px-4 py-2 text-right">Rate</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
            <tbody>
              {data.map((r: { projectName: string; clientName: string; totalHours: number; hourlyRate: number; amount: number }, i: number) => (
                <tr key={i} className="border-t border-slate-100"><td className="px-4 py-2 font-medium">{r.projectName}</td><td className="px-4 py-2">{r.clientName}</td><td className="px-4 py-2 text-right">{r.totalHours.toFixed(2)}</td><td className="px-4 py-2 text-right">{formatCurrency(r.hourlyRate)}</td><td className="px-4 py-2 text-right font-medium">{formatCurrency(r.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {reportType === "team" && Array.isArray(data) && (
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50"><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">Email</th><th className="px-4 py-2 text-right">Total hours</th><th className="px-4 py-2 text-right">Entries</th></tr></thead>
            <tbody>
              {data.map((r: { userName: string; userEmail: string; totalHours: string; entryCount: number }, i: number) => (
                <tr key={i} className="border-t border-slate-100"><td className="px-4 py-2 font-medium">{r.userName}</td><td className="px-4 py-2 text-slate-600">{r.userEmail}</td><td className="px-4 py-2 text-right font-mono">{r.totalHours}</td><td className="px-4 py-2 text-right">{r.entryCount}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {(!data || !Array.isArray(data) || data.length === 0) && <p className="p-4 text-slate-500">No data for this report. Adjust date range or ensure time entries exist.</p>}
      </div>
    </div>
  );
}

function TimeLogsTab({
  timeLogs,
  formatDuration,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onLock,
}: {
  timeLogs: TimeLog[];
  formatDuration: (ms: number) => string;
  fromDate: string;
  toDate: string;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
  onLock: (id: string, lock: boolean) => Promise<void>;
}) {
  function downloadTimeLogCsv() {
    const headers = ["Project", "Task", "Developer", "Start", "End", "Duration (ms)", "Duration", "Type", "Locked"];
    const rows = timeLogs.map((l) => [
      (l.task as { project?: { name: string } }).project?.name ?? "",
      l.task?.title ?? "",
      l.user?.name ?? "",
      l.startTime,
      l.endTime,
      l.durationMs,
      formatDuration(l.durationMs),
      l.entryType ?? "realtime",
      l.isLocked ? "Yes" : "No",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `time-logs-${fromDate || "all"}-${toDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-semibold">Time logs</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <span className="text-slate-400">to</span>
          <input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" onClick={downloadTimeLogCsv} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            Download time log (CSV)
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2 text-left">Project / Task</th>
              <th className="px-4 py-2 text-left">Developer</th>
              <th className="px-4 py-2 text-left">Start</th>
              <th className="px-4 py-2 text-left">End</th>
              <th className="px-4 py-2 text-right">Duration</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-center">Lock</th>
            </tr>
          </thead>
          <tbody>
            {timeLogs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100">
                <td className="px-4 py-2">{log.task.project?.name} / {log.task.title}</td>
                <td className="px-4 py-2">{log.user.name}</td>
                <td className="px-4 py-2">{new Date(log.startTime).toLocaleString()}</td>
                <td className="px-4 py-2">{new Date(log.endTime).toLocaleString()}</td>
                <td className="px-4 py-2 text-right font-mono">{formatDuration(log.durationMs)}</td>
                <td className="px-4 py-2">{log.entryType ?? "realtime"}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => onLock(log.id, !log.isLocked)}
                    className={`rounded px-2 py-1 text-xs font-medium ${log.isLocked ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"} hover:opacity-80`}
                  >
                    {log.isLocked ? "Unlock" : "Lock"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingTab({ projects }: { projects: Project[] }) {
  const rows = projects.map((p) => {
    const usedMs = p.tasks.reduce((s, t) => s + t.timeLogs.reduce((a, l) => a + l.durationMs, 0), 0);
    const hoursUsed = msToHours(usedMs);
    const revenue = hoursUsed * p.hourlyRate;
    const percent = (hoursUsed / p.totalHoursBought) * 100;
    const remainingH = Math.max(0, p.totalHoursBought - hoursUsed);
    const remainingRs = remainingH * p.hourlyRate;
    return {
      name: p.name,
      client: p.client.name,
      rate: p.hourlyRate,
      hoursBought: p.totalHoursBought,
      hoursUsed,
      percent,
      revenue,
      remainingH,
      remainingRs,
    };
  });

  function downloadBillingCsv() {
    const headers = ["Project", "Client", "Rate", "Hours bought", "Hours used", "% used", "Revenue", "Remaining (h)", "Remaining (Rs)"];
    const csvRows = rows.map((r) => [
      r.name,
      r.client,
      r.rate,
      r.hoursBought,
      r.hoursUsed.toFixed(1),
      r.percent.toFixed(1),
      formatCurrency(r.revenue),
      r.remainingH.toFixed(1),
      formatCurrency(r.remainingRs),
    ]);
    const csv = [headers.join(","), ...csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `billing-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex justify-end border-b border-slate-200 bg-slate-50 px-4 py-2">
        <button
          type="button"
          onClick={downloadBillingCsv}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Download billing log (CSV)
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-4 py-3 text-left">Project</th>
            <th className="px-4 py-3 text-left">Client</th>
            <th className="px-4 py-3 text-right">Rate</th>
            <th className="px-4 py-3 text-right">Hours bought</th>
            <th className="px-4 py-3 text-right">Hours used</th>
            <th className="px-4 py-3 text-right">% used</th>
            <th className="px-4 py-3 text-right">Revenue</th>
            <th className="px-4 py-3 text-right">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-slate-100">
              <td className="px-4 py-2 font-medium">{r.name}</td>
              <td className="px-4 py-2">{r.client}</td>
              <td className="px-4 py-2 text-right">{formatCurrency(r.rate)}</td>
              <td className="px-4 py-2 text-right">{r.hoursBought}</td>
              <td className="px-4 py-2 text-right">{r.hoursUsed.toFixed(1)}</td>
              <td className="px-4 py-2 text-right"><span className="inline-block"><PercentBadge percent={r.percent} /></span></td>
              <td className="px-4 py-2 text-right">{formatCurrency(r.revenue)}</td>
              <td className="px-4 py-2 text-right">{r.remainingH.toFixed(1)}h / {formatCurrency(r.remainingRs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsTab() {
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/settings?key=company_logo_url")
      .then((r) => r.json())
      .then((d) => setLogoUrl(d.value ?? ""))
      .catch(() => {});
  }, []);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "company_logo_url", value: logoUrl.trim() }),
      });
      if (!res.ok) {
        setMessage("Failed to save");
        return;
      }
      setMessage("Saved. Use this logo in PDFs and reports.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">Custom company logo</h2>
      <p className="mb-4 text-sm text-slate-500">Enter a full URL to your logo image (e.g. https://yoursite.com/logo.png). It will be used as the watermark in PDF reports.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Logo URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
            placeholder="https://..."
          />
        </div>
        {message && <p className="text-sm text-teal-600">{message}</p>}
        <button type="submit" disabled={saving} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

function TeamTab() {
  const [developers, setDevelopers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string; user: { id: string; name: string; email: string } }>>([]);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addDeveloperOpen, setAddDeveloperOpen] = useState(false);
  const [addHoursToClientOpen, setAddHoursToClientOpen] = useState(false);

  const refresh = () => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => {
        setDevelopers(d.developers || []);
        setClients(d.clients || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Developers</h3>
            <button
              type="button"
              onClick={() => setAddDeveloperOpen(true)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add developer
            </button>
          </div>
          <ul className="space-y-2">
            {developers.map((d) => (
              <li key={d.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{d.name}</span>
                <span className="text-slate-500">{d.email}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Clients</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddHoursToClientOpen(true)}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Add hours to client
              </button>
              <button
                type="button"
                onClick={() => setAddClientOpen(true)}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Add client
              </button>
            </div>
          </div>
          <ul className="space-y-2">
            {clients.map((c) => (
              <li key={c.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="text-slate-500">{c.user.email}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Modal open={addDeveloperOpen} onClose={() => setAddDeveloperOpen(false)} title="Add developer">
        <AddDeveloperForm onSave={refresh} onClose={() => setAddDeveloperOpen(false)} />
      </Modal>
      <Modal open={addClientOpen} onClose={() => setAddClientOpen(false)} title="Add client">
        <AddClientForm onSave={refresh} onClose={() => setAddClientOpen(false)} />
      </Modal>
      <Modal open={addHoursToClientOpen} onClose={() => setAddHoursToClientOpen(false)} title="Add hours to client">
        <AddHoursToClientForm clients={clients} onSave={refresh} onClose={() => setAddHoursToClientOpen(false)} />
      </Modal>
    </div>
  );
}

function AddHoursToClientForm({
  clients,
  onSave,
  onClose,
}: {
  clients: Array<{ id: string; name: string }>;
  onSave: () => void;
  onClose: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [hours, setHours] = useState("");
  const [ratePerHour, setRatePerHour] = useState("");
  const [boughtDate, setBoughtDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const h = Number(hours);
    if (!clientId || h <= 0) {
      setError("Select a client and enter positive hours.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/client-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          hours: h,
          ratePerHour: ratePerHour ? Number(ratePerHour) : undefined,
          boughtDate: boughtDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add hours");
        return;
      }
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Client</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          required
        >
          <option value="">Select client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Hours to add</label>
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Rate (Rs./hr, optional)</label>
        <input
          type="number"
          min={0}
          value={ratePerHour}
          onChange={(e) => setRatePerHour(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Bought date</label>
        <input
          type="date"
          value={boughtDate}
          onChange={(e) => setBoughtDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
        />
      </div>
      <p className="text-sm text-slate-500">Hours are added to the client pool and can be used across all their projects.</p>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? "Adding..." : "Add hours"}
        </button>
      </div>
    </form>
  );
}

function AddDeveloperForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/team/developers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add developer");
        return;
      }
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Password (optional; they can set later)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          placeholder="Min 6 characters"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Adding..." : "Add developer"}
        </button>
      </div>
    </form>
  );
}

function AddClientForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/team/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          contactEmail: contactEmail.trim() || undefined,
          password: password || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add client");
        return;
      }
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Login email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          placeholder="Used to sign in"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Password (optional; they can set later)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          placeholder="Min 6 characters"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Contact email (optional)</label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          placeholder="Defaults to login email"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
          {saving ? "Adding..." : "Add client"}
        </button>
      </div>
    </form>
  );
}
