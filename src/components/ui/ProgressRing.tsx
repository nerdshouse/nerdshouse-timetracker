"use client";

type ProgressRingProps = {
  percent: number; // 0–100
  size?: number;
  strokeWidth?: number;
  colorClass?: string; // e.g. "text-green-500"
};

export function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 6,
  colorClass = "text-green-500",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        className="text-slate-200"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className={colorClass}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ transition: "stroke-dashoffset 0.3s ease" }}
      />
    </svg>
  );
}
