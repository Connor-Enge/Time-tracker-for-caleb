"use client";

import type { ClientUser, ScheduledShift, Settings, Shift } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const api = {
  signup: (body: { email: string; password: string; name?: string }) =>
    request<{ user: ClientUser }>("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ user: ClientUser }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: ClientUser; activeShift: Shift | null }>("/api/auth/me"),

  listShifts: (userId?: string) =>
    request<{ shifts: Shift[] }>(`/api/shifts${userId ? `?userId=${userId}` : ""}`),
  createShift: (body: Partial<Shift> & { clockIn: string; userId?: string }) =>
    request<{ shift: Shift }>("/api/shifts", { method: "POST", body: JSON.stringify(body) }),
  updateShift: (id: string, patch: Partial<Shift>) =>
    request<{ shift: Shift }>(`/api/shifts/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteShift: (id: string) =>
    request<{ ok: true }>(`/api/shifts/${id}`, { method: "DELETE" }),

  clockIn: (body?: { job?: string; notes?: string }) =>
    request<{ shift: Shift }>("/api/clock", { method: "POST", body: JSON.stringify({ action: "in", ...body }) }),
  clockOut: () =>
    request<{ shift: Shift | null }>("/api/clock", { method: "POST", body: JSON.stringify({ action: "out" }) }),
  cancelActive: () =>
    request<{ shift: null }>("/api/clock", { method: "POST", body: JSON.stringify({ action: "cancel" }) }),
  addBreak: (minutes: number) =>
    request<{ shift: Shift | null }>("/api/clock", {
      method: "POST",
      body: JSON.stringify({ action: "break", minutes }),
    }),

  listScheduled: (userId?: string) =>
    request<{ scheduled: ScheduledShift[] }>(`/api/scheduled${userId ? `?userId=${userId}` : ""}`),
  createScheduled: (body: Omit<ScheduledShift, "id"> & { userId?: string }) =>
    request<{ scheduled: ScheduledShift }>("/api/scheduled", { method: "POST", body: JSON.stringify(body) }),
  updateScheduled: (id: string, patch: Partial<ScheduledShift>) =>
    request<{ scheduled: ScheduledShift }>(`/api/scheduled/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteScheduled: (id: string) =>
    request<{ ok: true }>(`/api/scheduled/${id}`, { method: "DELETE" }),

  updateSettings: (patch: Partial<Settings> & { name?: string }) =>
    request<{ user: ClientUser }>("/api/settings", { method: "PATCH", body: JSON.stringify(patch) }),

  listUsers: () => request<{ users: ClientUser[] }>("/api/admin/users"),
  adminSummary: () =>
    request<{
      rows: {
        user: ClientUser;
        week: { start: string; end: string; totals: { hours: number; regular: number; overtime: number; pay: number } };
        period: {
          start: string;
          end: string;
          totals: { totalHours: number; regular: number; overtime: number; gross: number; tax: number; net: number };
        };
      }[];
      grand: { hours: number; regular: number; overtime: number; gross: number; net: number };
    }>("/api/admin/summary"),
  getUser: (id: string) =>
    request<{ user: ClientUser; shifts: Shift[]; scheduled: ScheduledShift[] }>(`/api/admin/users/${id}`),
  updateUser: (id: string, patch: { name?: string; role?: "admin" | "employee"; active?: boolean; hourlyRate?: number }) =>
    request<{ user: ClientUser }>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
};
