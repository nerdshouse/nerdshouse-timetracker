"use client";

import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, FolderKanban, Clock, Timer, PlusCircle } from "lucide-react";
import type { SessionPayload } from "@/lib/auth/session";
import { SidebarLayout } from "@/components/layouts/SidebarLayout";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { LiveTimer } from "@/components/ui/LiveTimer";
import { Modal } from "@/components/ui/Modal";
import { formatDuration } from "@/lib/utils/format";

const POMODORO_WORK_MS = 25 * 60 * 1000;

type Project = {
  id: string;
  name: string;
  client: { name: string };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assignedTo: { id: string; name: string };
    timeLogs: { durationMs: number }[];
    activeTimers: unknown[];
  }>;
};

type ActiveTimer = {
  taskId: string;
  startTime: string;
  elapsedMs: number;
  task: { id: string; title: string };
  user: { id: string; name: string };
};

export function DeveloperDashboard({ session }: { session: SessionPayload }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [filterProject, setFilterProject] = useState<string>("");
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [pomodoroTick, setPomodoroTick] = useState(0);
  const [tickNow, setTickNow] = useState(0);
  const [pomodoroStartMs, setPomodoroStartMs] = useState<number | null>(null);
  useEffect(() => {
    if (!pomodoroEnabled || !timers.length) return;
    const id = setInterval(() => {
      setPomodoroTick((n) => n + 1);
      setTickNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [pomodoroEnabled, timers.length]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
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

  const myTimers = timers.filter((t) => t.user.id === session.userId);
  const myTasks = projects.flatMap((p) => p.tasks);
  const activeTimer = myTimers[0];
  const pomodoroElapsed = activeTimer && pomodoroStartMs != null
    ? Math.min(tickNow - pomodoroStartMs, POMODORO_WORK_MS)
    : 0;
  const pomodoroRemaining = Math.max(0, POMODORO_WORK_MS - pomodoroElapsed);
  void pomodoroTick;

  useEffect(() => {
    if (!pomodoroEnabled || !activeTimer) {
      const t = setTimeout(() => setPomodoroStartMs(null), 0);
      return () => clearTimeout(t);
    }
    if (pomodoroStartMs == null) {
      const now = Date.now();
      const t = setTimeout(() => {
        setPomodoroStartMs(now);
        setTickNow(now);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [pomodoroEnabled, activeTimer, pomodoroStartMs]);

  const pomodoroFiredRef = useRef(false);

  async function timerAction(action: string, taskId: string) {
    await fetch("/api/timers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, taskId }),
    });
    const res = await fetch("/api/timers");
    const d = await res.json();
    setTimers(d.timers || []);
  }

  useEffect(() => {
    if (!pomodoroEnabled || !activeTimer || pomodoroRemaining > 0) {
      if (pomodoroRemaining > 0) pomodoroFiredRef.current = false;
      return;
    }
    if (pomodoroFiredRef.current) return;
    pomodoroFiredRef.current = true;
    const taskId = activeTimer.taskId;
    const t = setTimeout(() => {
      timerAction("stop", taskId);
      setPomodoroEnabled(false);
      setPomodoroStartMs(null);
    }, 0);
    return () => clearTimeout(t);
  }, [pomodoroRemaining, pomodoroEnabled, activeTimer]);
  const totalTimeMs = myTasks.reduce(
    (s, t) => s + t.timeLogs.reduce((a, l) => a + l.durationMs, 0),
    0
  );
  const filteredProjects = filterProject
    ? projects.filter((p) => p.id === filterProject)
    : projects;

  async function updateTaskStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const res = await fetch("/api/projects");
    const d = await res.json();
    setProjects(d.projects || []);
  }

  const refreshProjects = () =>
    fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(d.projects || []));

  const navItems = [{ href: "/developer", label: "Dashboard" }];

  return (
    <SidebarLayout session={session} navItems={navItems} accent="blue">
      <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Developer Dashboard</h1>
        <button
          onClick={() => setLogTimeOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" /> Log time
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My tasks" value={myTasks.length} subtext="Assigned to you" icon={LayoutDashboard} iconBg="bg-blue-50" />
        <StatCard label="Time logged" value={formatDuration(totalTimeMs)} subtext="Total" icon={Clock} iconBg="bg-slate-100" />
        <StatCard label="Active timers" value={myTimers.length} subtext="Running now" icon={Timer} iconBg="bg-green-50" />
        <StatCard label="Projects" value={projects.length} subtext="With your tasks" icon={FolderKanban} iconBg="bg-slate-100" />
      </div>

      {myTimers.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Active timers</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pomodoroEnabled}
                onChange={(e) => setPomodoroEnabled(e.target.checked)}
                className="rounded border-slate-300"
              />
              Pomodoro (25 min)
            </label>
          </div>
          {pomodoroEnabled && activeTimer && (
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Pomodoro: {Math.floor(pomodoroRemaining / 60000)}:{String(Math.floor((pomodoroRemaining % 60000) / 1000)).padStart(2, "0")} remaining
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {myTimers.map((tm) => {
              const running = new Date(tm.startTime).getTime() > 1000;
              return (
                <div key={tm.taskId} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <LiveTimer
                    startTime={tm.startTime}
                    elapsedMs={tm.elapsedMs}
                    running={running}
                    taskTitle={tm.task.title}
                  />
                  <div className="flex gap-1">
                    {running ? (
                      <>
                        <button
                          onClick={() => timerAction("pause", tm.taskId)}
                          className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => timerAction("stop", tm.taskId)}
                          className="rounded bg-rose-100 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-200"
                        >
                          Stop
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => timerAction("resume", tm.taskId)}
                          className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-200"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => timerAction("stop", tm.taskId)}
                          className="rounded bg-rose-100 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-200"
                        >
                          Stop
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Tasks by project</h2>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-4">
          {filteredProjects.map((proj) => (
            <div key={proj.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-semibold text-slate-800">{proj.name}</h3>
              <ul className="space-y-2">
                {proj.tasks.map((t) => {
                  const taskTimeMs = t.timeLogs.reduce((a, l) => a + l.durationMs, 0);
                  const hasActiveTimer = myTimers.some((tm) => tm.taskId === t.id);
                  return (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.title}</span>
                        <StatusBadge status={t.status as "todo" | "in_progress" | "review" | "done"} />
                        <PriorityBadge priority={t.priority as "low" | "medium" | "high" | "critical"} />
                        <span className="font-mono text-sm text-slate-600">{formatDuration(taskTimeMs)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={t.status}
                          onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="todo">Todo</option>
                          <option value="in_progress">In progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </select>
                        {!hasActiveTimer ? (
                          <button
                            onClick={() => timerAction("start", t.id)}
                            className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-200"
                          >
                            Start timer
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Modal open={logTimeOpen} onClose={() => setLogTimeOpen(false)} title="Log time">
        <LogTimeForm
          tasks={myTasks}
          onSave={() => { refreshProjects(); setLogTimeOpen(false); }}
          onClose={() => setLogTimeOpen(false)}
        />
      </Modal>
      </div>
    </SidebarLayout>
  );
}

function LogTimeForm({
  tasks,
  onSave,
  onClose,
}: {
  tasks: Project["tasks"];
  onSave: () => void;
  onClose: () => void;
}) {
  const [taskId, setTaskId] = useState("");
  const [minutes, setMinutes] = useState("");
  const [entryType, setEntryType] = useState<"manual" | "duration_only">("manual");
  const [loggedDate, setLoggedDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mins = Number(minutes);
    if (!taskId || !(mins > 0)) {
      setError("Select a task and enter positive minutes.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/time-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          durationMs: mins * 60 * 1000,
          entryType,
          loggedDate: loggedDate || undefined,
          note: note.trim() || undefined,
          isShared,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to log time");
        return;
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Task</label>
        <select
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          required
        >
          <option value="">Select task...</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Duration (minutes)</label>
        <input
          type="number"
          min={1}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          placeholder="e.g. 30"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Entry type</label>
        <select
          value={entryType}
          onChange={(e) => setEntryType(e.target.value as "manual" | "duration_only")}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
        >
          <option value="manual">Manual (start/end time)</option>
          <option value="duration_only">Duration only</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Date</label>
        <input
          type="date"
          value={loggedDate}
          onChange={(e) => setLoggedDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2"
          placeholder="What did you work on?"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="rounded border-slate-300" />
        Share with team (visible to others)
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving…" : "Log time"}
        </button>
      </div>
    </form>
  );
}
