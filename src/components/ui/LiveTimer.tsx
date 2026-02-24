"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/utils/format";

type LiveTimerProps = {
  startTime: string; // ISO
  elapsedMs: number;
  running: boolean;
  taskTitle?: string;
};

export function LiveTimer({ startTime, elapsedMs, running, taskTitle }: LiveTimerProps) {
  const [liveMs, setLiveMs] = useState(elapsedMs);
  const displayMs = running ? liveMs : elapsedMs;

  useEffect(() => {
    if (!running) return;
    const start = new Date(startTime).getTime();
    const tick = () => setLiveMs(elapsedMs + (Date.now() - start));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, startTime, elapsedMs]);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2">
      {running && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
      )}
      {taskTitle && <span className="font-medium text-slate-700">{taskTitle}</span>}
      <span className="font-mono text-lg tabular-nums text-slate-900">
        {formatDuration(displayMs)}
      </span>
    </div>
  );
}
