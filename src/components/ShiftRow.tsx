"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useApp } from "./AppProvider";
import { useToast } from "./Toast";
import { formatHours, formatMoney, shiftHours } from "@/lib/time";
import { Shift } from "@/lib/types";
import { api } from "@/lib/api";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ShiftRow({
  shift,
  hourlyRate,
  currency,
  onUpdated,
  onDeleted,
}: {
  shift: Shift;
  hourlyRate?: number;
  currency?: string;
  onUpdated?: (s: Shift) => void;
  onDeleted?: (id: string) => void;
}) {
  const app = useApp();
  const toast = useToast();
  const rate = hourlyRate ?? app.user?.settings.hourlyRate ?? 0;
  const cur = currency ?? app.user?.settings.currency ?? "USD";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    clockIn: toLocalInput(shift.clockIn),
    clockOut: toLocalInput(shift.clockOut),
    breakMinutes: shift.breakMinutes,
    job: shift.job || "",
    notes: shift.notes || "",
  });

  const hours = shiftHours(shift);
  const pay = hours * rate;

  async function save() {
    try {
      const ci = new Date(form.clockIn);
      const co = form.clockOut ? new Date(form.clockOut) : null;
      if (Number.isNaN(ci.getTime())) {
        toast.error("Invalid clock-in time");
        return;
      }
      if (co && Number.isNaN(co.getTime())) {
        toast.error("Invalid clock-out time");
        return;
      }
      const patch = {
        clockIn: ci.toISOString(),
        clockOut: co ? co.toISOString() : null,
        breakMinutes: Math.max(0, Number(form.breakMinutes) || 0),
        job: form.job || undefined,
        notes: form.notes || undefined,
      };
      if (onUpdated) {
        const { shift: updated } = await api.updateShift(shift.id, patch);
        onUpdated(updated);
      } else {
        await app.updateShift(shift.id, patch);
      }
      setEditing(false);
      toast.success("Shift updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function remove() {
    if (!confirm("Delete this shift?")) return;
    try {
      if (onDeleted) {
        await api.deleteShift(shift.id);
        onDeleted(shift.id);
      } else {
        await app.deleteShift(shift.id);
      }
      toast.success("Shift deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{format(new Date(shift.clockIn), "EEE, MMM d")}</div>
          <div className="text-xs text-slate-500">
            {format(new Date(shift.clockIn), "h:mm a")} –{" "}
            {shift.clockOut ? format(new Date(shift.clockOut), "h:mm a") : "in progress"}
            {shift.breakMinutes ? ` · ${shift.breakMinutes}m break` : ""}
          </div>
          {shift.job && <div className="text-xs text-slate-500">{shift.job}</div>}
          {shift.notes && <div className="text-xs text-slate-500">{shift.notes}</div>}
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums">{formatHours(hours)}</div>
          <div className="text-xs text-slate-500">{formatMoney(pay, cur)}</div>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-1">
        <button
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Edit"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={remove}
          className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
          aria-label="Delete"
        >
          <Trash2 size={15} />
        </button>
      </div>
      {editing && (
        <div className="mt-2 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label>
              <span className="text-slate-500">Clock In</span>
              <input
                type="datetime-local"
                value={form.clockIn}
                onChange={(e) => setForm({ ...form, clockIn: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label>
              <span className="text-slate-500">Clock Out</span>
              <input
                type="datetime-local"
                value={form.clockOut}
                onChange={(e) => setForm({ ...form, clockOut: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label>
              <span className="text-slate-500">Break (min)</span>
              <input
                type="number"
                min={0}
                value={form.breakMinutes}
                onChange={(e) => setForm({ ...form, breakMinutes: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label>
              <span className="text-slate-500">Job</span>
              <input
                value={form.job}
                onChange={(e) => setForm({ ...form, job: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>
          <input
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex-1 rounded-xl bg-brand-600 py-2 text-sm font-medium text-white"
            >
              Save changes
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
