import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconBg?: string;
};

export function StatCard({ label, value, subtext, icon: Icon, iconBg = "bg-slate-100" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {subtext != null && <p className="mt-1 text-xs text-slate-400">{subtext}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${iconBg}`}>
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
      </div>
    </div>
  );
}
