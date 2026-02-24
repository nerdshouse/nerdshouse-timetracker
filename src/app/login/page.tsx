"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      if (data.redirectTo) {
        router.push(data.redirectTo);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-white">
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Time Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">Nerd&apos;s House</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                required
                autoComplete="current-password"
              />
            </div>
          </div>
          {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p>}
          <p className="mt-3 text-xs text-slate-500">
            Demo: alex@company.com / password123
          </p>
          <button
            type="submit"
            disabled={loggingIn}
            className="mt-6 w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loggingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
