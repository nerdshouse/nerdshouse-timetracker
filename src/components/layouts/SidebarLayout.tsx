"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import type { SessionPayload } from "@/lib/auth/session";

type NavItem = { href: string; label: string };

type SidebarLayoutProps = {
  session: SessionPayload;
  navItems: NavItem[];
  children: React.ReactNode;
  accent?: "teal" | "blue" | "purple";
};

export function SidebarLayout({ session, navItems, children, accent = "teal" }: SidebarLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const accentBg = accent === "teal" ? "bg-teal-600" : accent === "blue" ? "bg-blue-600" : "bg-purple-600";
  const accentHover = accent === "teal" ? "hover:bg-teal-500" : accent === "blue" ? "hover:bg-blue-500" : "hover:bg-purple-500";
  const accentActive = accent === "teal" ? "bg-teal-500/90" : accent === "blue" ? "bg-blue-500/90" : "bg-purple-500/90";

  function isActive(href: string) {
    if (href.includes("?")) {
      const [path, qs] = href.split("?");
      const tab = qs?.replace("tab=", "");
      return pathname === path && (tab ? searchParams.get("tab") === tab : true);
    }
    return pathname === href || (href !== "/owner" && href !== "/client" && pathname.startsWith(href));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 z-40 flex h-full w-56 flex-col border-r border-slate-200 bg-white">
        <div className={`flex h-14 shrink-0 items-center gap-2 px-4 ${accentBg}`}>
          <Clock className="h-6 w-6 text-white" />
          <span className="font-semibold text-white">Time Tracker</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? `${accentActive} text-white` : `text-slate-600 hover:bg-slate-100 ${accentHover} hover:text-white`}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="truncate px-3 py-1 text-sm font-medium text-slate-700">{session.name}</p>
          <p className="truncate px-3 text-xs text-slate-500">{session.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 pl-56">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
