"use client";

import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { api } from "@/lib/api";
import { ClientUser } from "@/lib/types";
import { useToast } from "./Toast";

export function AddEmployeeDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (user: ClientUser) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    hourlyRate: 20,
    role: "employee" as "employee" | "admin",
  });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { user } = await api.createUser({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name.trim(),
        hourlyRate: form.hourlyRate,
        role: form.role,
      });
      onCreated(user);
      toast.success(`Created ${user.email}`);
      onClose();
      setForm({ name: "", email: "", password: "", hourlyRate: 20, role: "employee" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 px-3 py-6 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold">Add employee</div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-2 text-sm">
          <label className="block">
            <span className="text-slate-500">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block">
            <span className="text-slate-500">Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="off"
              inputMode="email"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block">
            <span className="text-slate-500">Temporary password (min 8 chars)</span>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 pr-9 dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
                aria-label={show ? "Hide" : "Show"}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Share this with the employee — they can change it after signing in.
            </p>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-slate-500">Hourly rate</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="block">
              <span className="text-slate-500">Role</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "employee" | "admin" })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create employee"}
          </button>
        </form>
      </div>
    </div>
  );
}
