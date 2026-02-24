"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/auth/session";

type HeaderProps = {
  session: SessionPayload;
  title: string;
  subtitle?: string;
  gradient: string; // e.g. "from-red-600 to-red-800"
  navLinks?: { href: string; label: string }[];
};

export function DashboardHeader({ session, title, subtitle, gradient, navLinks }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className={`rounded-2xl bg-gradient-to-r ${gradient} px-6 py-5 text-white shadow-md`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-white/90">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {navLinks?.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/25"
            >
              {link.label}
            </Link>
          ))}
          <span className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white/95">{session.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
