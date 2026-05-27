"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "./AppProvider";
import { useToast } from "./Toast";
import { dayKey, formatHours, shiftHours } from "@/lib/time";
import { Card } from "./PageHeader";
import { ScheduledShift } from "@/lib/types";

export function CalendarView() {
  const { user, shifts, scheduled, addScheduled, updateScheduled, deleteScheduled } = useApp();
  const toast = useToast();
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ startTime: "09:00", endTime: "17:00", job: "", notes: "" });

  const weekStartsOn = user?.settings.weekStartsOn ?? 0;

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const shiftsByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of shifts) {
      m[dayKey(s.clockIn)] = (m[dayKey(s.clockIn)] || 0) + shiftHours(s);
    }
    return m;
  }, [shifts]);

  const scheduledByDay = useMemo(() => {
    const m: Record<string, ScheduledShift[]> = {};
    for (const s of scheduled) (m[s.date] ??= []).push(s);
    return m;
  }, [scheduled]);

  const weekdayLabels = useMemo(() => {
    const base = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return weekStartsOn === 0 ? base : [...base.slice(1), base[0]];
  }, [weekStartsOn]);

  const selectedKey = dayKey(selected);
  const selectedShifts = shifts.filter((s) => dayKey(s.clockIn) === selectedKey);
  const selectedScheduled = scheduled.filter((s) => s.date === selectedKey);

  const upcoming = useMemo(() => {
    const today = dayKey(new Date());
    return scheduled
      .filter((s) => s.date >= today)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 6);
  }, [scheduled]);

  function startAdd() {
    setEditingId(null);
    setForm({ startTime: "09:00", endTime: "17:00", job: "", notes: "" });
    setAdding(true);
  }

  function startEdit(s: ScheduledShift) {
    setAdding(false);
    setEditingId(s.id);
    setForm({ startTime: s.startTime, endTime: s.endTime, job: s.job || "", notes: s.notes || "" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.startTime || !form.endTime) {
      toast.error("Start and end time required");
      return;
    }
    try {
      if (editingId) {
        await updateScheduled(editingId, {
          startTime: form.startTime,
          endTime: form.endTime,
          job: form.job || undefined,
          notes: form.notes || undefined,
        });
        toast.success("Schedule updated");
      } else {
        await addScheduled({
          date: selectedKey,
          startTime: form.startTime,
          endTime: form.endTime,
          job: form.job || undefined,
          notes: form.notes || undefined,
        });
        toast.success("Shift scheduled");
      }
      setAdding(false);
      setEditingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function removeScheduled(s: ScheduledShift) {
    if (!confirm("Remove this scheduled shift?")) return;
    try {
      await deleteScheduled(s.id);
      toast.success("Scheduled shift removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setCursor((c) => addMonths(c, -1))}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => {
              setCursor(new Date());
              setSelected(new Date());
            }}
            className="text-lg font-semibold"
          >
            {format(cursor, "MMMM yyyy")}
          </button>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {weekdayLabels.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const k = dayKey(d);
            const inMonth = isSameMonth(d, cursor);
            const isSel = isSameDay(d, selected);
            const isToday = isSameDay(d, new Date());
            const worked = shiftsByDay[k];
            const sched = scheduledByDay[k];
            const fulfilled = !!worked && !!sched;
            const missed = !!sched && !worked && d < new Date() && !isToday;

            let dot = "";
            if (worked && !sched) dot = "bg-emerald-500";
            else if (fulfilled) dot = "bg-brand-500";
            else if (sched && !worked) dot = missed ? "bg-rose-500" : "bg-amber-400";

            return (
              <button
                key={k}
                onClick={() => setSelected(d)}
                className={[
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition",
                  inMonth ? "" : "text-slate-300 dark:text-slate-700",
                  isSel
                    ? "bg-brand-600 text-white shadow-sm"
                    : isToday
                      ? "ring-1 ring-brand-500"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                <span className="font-medium">{format(d, "d")}</span>
                {worked && (
                  <span
                    className={`mt-0.5 text-[10px] tabular-nums ${
                      isSel ? "text-white/90" : "text-slate-500"
                    }`}
                  >
                    {formatHours(worked)}
                  </span>
                )}
                {dot && <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${dot}`} />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
          <Legend className="bg-emerald-500" label="Worked" />
          <Legend className="bg-amber-400" label="Scheduled" />
          <Legend className="bg-brand-500" label="Fulfilled" />
          <Legend className="bg-rose-500" label="Missed" />
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Selected</div>
            <div className="text-lg font-semibold">{format(selected, "EEEE, MMM d")}</div>
          </div>
          {!adding && !editingId && (
            <button
              onClick={startAdd}
              className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
            >
              <Plus size={16} /> Schedule
            </button>
          )}
        </div>

        {(adding || editingId) && (
          <form onSubmit={submit} className="mb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                <span className="text-slate-500">Start</span>
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-500">End</span>
                <input
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
            <input
              placeholder="Job / project"
              value={form.job}
              onChange={(e) => setForm({ ...form, job: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <input
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-xl bg-brand-600 py-2 text-sm font-medium text-white">
                {editingId ? "Save changes" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setEditingId(null);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {selectedScheduled.length === 0 && selectedShifts.length === 0 && (
            <p className="text-sm text-slate-500">Nothing scheduled or worked.</p>
          )}
          {selectedScheduled.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30"
            >
              <div>
                <div className="text-sm font-medium">
                  {s.startTime}–{s.endTime}{" "}
                  <span className="text-xs text-slate-500">scheduled</span>
                </div>
                {s.job && <div className="text-xs text-slate-500">{s.job}</div>}
                {s.notes && <div className="text-xs text-slate-500">{s.notes}</div>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(s)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  aria-label="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => removeScheduled(s)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {selectedShifts.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/30"
            >
              <div className="text-sm font-medium">
                {new Date(s.clockIn).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                {" – "}
                {s.clockOut
                  ? new Date(s.clockOut).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                  : "running"}
                <span className="ml-2 text-xs text-slate-500">{formatHours(shiftHours(s))}</span>
              </div>
              {s.job && <div className="text-xs text-slate-500">{s.job}</div>}
              {s.breakMinutes ? (
                <div className="text-xs text-slate-500">{s.breakMinutes}m break</div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Upcoming</div>
          <div className="space-y-1.5">
            {upcoming.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  const d = new Date(s.date + "T00:00");
                  setCursor(d);
                  setSelected(d);
                }}
                className="flex w-full items-center justify-between text-left text-sm"
              >
                <span>{format(new Date(s.date + "T00:00"), "EEE, MMM d")}</span>
                <span className="tabular-nums text-slate-500">
                  {s.startTime}–{s.endTime}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </div>
  );
}
