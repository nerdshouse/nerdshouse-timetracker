"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SidebarLayout } from "@/components/layouts/SidebarLayout";
import { StatusBadge } from "@/components/ui/badges";
import { formatDuration } from "@/lib/utils/format";
import { downloadProjectReportPdf } from "@/lib/pdf-report";
import type { SessionPayload } from "@/lib/auth/session";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client: { name: string };
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
  startTime: string;
  endTime: string;
  durationMs: number;
  task: { id: string; title: string };
  user: { id: string; name: string };
};

export function ClientProjectDetail({ session, projectId }: { session: SessionPayload; projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project))
      .catch(() => setProject(null));
  }, [projectId]);

  useEffect(() => {
    const q = new URLSearchParams({ projectId });
    if (fromDate) q.set("fromDate", fromDate);
    if (toDate) q.set("toDate", toDate);
    fetch(`/api/time-logs?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => setTimeLogs(d.timeLogs || []))
      .catch(() => setTimeLogs([]));
  }, [projectId, fromDate, toDate]);

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  const totalTimeMs = timeLogs.reduce((s: number, l: (typeof timeLogs)[number]) => s + l.durationMs, 0);
  const navItems = [{ href: "/client", label: "Back to Dashboard" }];

  return (
    <SidebarLayout session={session} navItems={navItems} accent="purple">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/client"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-purple-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-slate-800">{project.name}</h1>
          <button
            type="button"
            onClick={async () => {
              await downloadProjectReportPdf(
                { ...project, totalHoursBought: 0, hourlyRate: 0, client: project.client },
                timeLogs,
                typeof window !== "undefined" ? `${window.location.origin}/nerdshouse-logo.png` : undefined,
                session.name
              );
            }}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Download report (PDF)
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-sm font-medium text-slate-700">Filter time by date range</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Total time for this project (filtered)</h2>
          <p className="text-2xl font-bold text-slate-800">{formatDuration(totalTimeMs)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">Tasks & time utilized</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Task</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Assignee</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700">Time utilized</th>
                </tr>
              </thead>
              <tbody>
                {project.tasks.map((t) => {
                  const taskMs = timeLogs
                    .filter((l: (typeof timeLogs)[number]) => l.task?.id === t.id)
                    .reduce((a: number, l: (typeof timeLogs)[number]) => a + l.durationMs, 0);
                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{t.title}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status as "todo" | "in_progress" | "review" | "done"} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.assignedTo.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">{formatDuration(taskMs)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {timeLogs.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">Time log (filtered)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Task</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Developer</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Start</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">End</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-700">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {timeLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100">
                      <td className="px-4 py-2">{log.task?.title ?? "—"}</td>
                      <td className="px-4 py-2">{log.user?.name ?? "—"}</td>
                      <td className="px-4 py-2">{new Date(log.startTime).toLocaleString()}</td>
                      <td className="px-4 py-2">{new Date(log.endTime).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatDuration(log.durationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
