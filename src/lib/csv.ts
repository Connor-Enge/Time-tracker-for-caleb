"use client";

import { format } from "date-fns";
import { Shift } from "./types";
import { shiftHours } from "./time";

function escape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(escape).join(",")).join("\r\n");
}

export function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = toCSV(rows);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function shiftsToCSV(shifts: Shift[], hourlyRate: number, employeeName: string) {
  const header = [
    "Employee",
    "Date",
    "Clock In",
    "Clock Out",
    "Break (min)",
    "Hours",
    "Job",
    "Notes",
    "Pay",
  ];
  const rows = shifts
    .slice()
    .sort((a, b) => (a.clockIn < b.clockIn ? -1 : 1))
    .map((s) => {
      const h = shiftHours(s);
      const ci = new Date(s.clockIn);
      const co = s.clockOut ? new Date(s.clockOut) : null;
      return [
        employeeName,
        format(ci, "yyyy-MM-dd"),
        format(ci, "HH:mm"),
        co ? format(co, "HH:mm") : "",
        s.breakMinutes || 0,
        h.toFixed(2),
        s.job || "",
        s.notes || "",
        (h * hourlyRate).toFixed(2),
      ];
    });
  return [header, ...rows];
}
