"use client";

import { useState, useEffect } from "react";

type Client = { id: string; name: string };

type ProjectFormProps = {
  initial?: { id: string; name: string; description: string | null; status: string; clientId: string; hourlyRate: number; totalHoursBought: number; boughtDate?: string | null } | null;
  clients: Client[];
  onSave: () => void;
  onClose: () => void;
};

export function ProjectForm({ initial, clients, onSave, onClose }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [clientId, setClientId] = useState(initial?.clientId ?? (clients[0]?.id ?? ""));
  const [hourlyRate, setHourlyRate] = useState(String(initial?.hourlyRate ?? 1200));
  const [totalHoursBought, setTotalHoursBought] = useState(String(initial?.totalHoursBought ?? 50));
  const [boughtDate, setBoughtDate] = useState(
    initial?.boughtDate ? new Date(initial.boughtDate).toISOString().slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);

  const rate = Number(hourlyRate) || 0;
  const hours = Number(totalHoursBought) || 0;
  const contractValue = rate * hours;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?.id) {
        await fetch(`/api/projects/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: description || null,
            status,
            clientId,
            hourlyRate: rate,
            totalHoursBought: hours,
            boughtDate: boughtDate ? boughtDate : null,
          }),
        });
      } else {
        await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: description || null,
            status,
            clientId,
            hourlyRate: rate,
            totalHoursBought: hours,
            boughtDate: boughtDate || null,
          }),
        });
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
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          rows={2}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Client</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Hourly rate (Rs.)</label>
          <input
            type="number"
            min={0}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Hours purchased</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={totalHoursBought}
            onChange={(e) => setTotalHoursBought(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Bought date</label>
        <input
          type="date"
          value={boughtDate}
          onChange={(e) => setBoughtDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <p className="mt-0.5 text-xs text-slate-500">Optional: when hours were purchased</p>
      </div>
      <p className="text-sm text-slate-600">
        Contract value: Rs. {contractValue.toLocaleString("en-IN")}
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
          {saving ? "Saving..." : initial ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
