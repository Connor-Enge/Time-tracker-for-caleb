"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ClientUser,
  ScheduledShift,
  Settings,
  Shift,
} from "@/lib/types";

type State = {
  ready: boolean;
  user: ClientUser | null;
  activeShift: Shift | null;
  shifts: Shift[];
  scheduled: ScheduledShift[];
};

type Ctx = State & {
  refresh: () => Promise<void>;
  clockIn: (opts?: { job?: string; notes?: string }) => Promise<void>;
  clockOut: () => Promise<void>;
  cancelActive: () => Promise<void>;
  addBreak: (minutes: number) => Promise<void>;
  addManualShift: (shift: Omit<Shift, "id">) => Promise<void>;
  updateShift: (id: string, patch: Partial<Shift>) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;
  addScheduled: (s: Omit<ScheduledShift, "id">) => Promise<void>;
  updateScheduled: (id: string, patch: Partial<ScheduledShift>) => Promise<void>;
  deleteScheduled: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings> & { name?: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

const AUTH_PAGES = new Set(["/login", "/signup"]);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<State>({
    ready: false,
    user: null,
    activeShift: null,
    shifts: [],
    scheduled: [],
  });

  const refresh = useCallback(async () => {
    if (pathname && AUTH_PAGES.has(pathname)) {
      setState((s) => ({ ...s, ready: true, user: null, activeShift: null, shifts: [], scheduled: [] }));
      return;
    }
    try {
      const me = await api.me();
      const [{ shifts }, { scheduled }] = await Promise.all([api.listShifts(), api.listScheduled()]);
      setState({ ready: true, user: me.user, activeShift: me.activeShift, shifts, scheduled });
    } catch {
      setState({ ready: true, user: null, activeShift: null, shifts: [], scheduled: [] });
    }
  }, [pathname]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const api_clockIn = useCallback(async (opts?: { job?: string; notes?: string }) => {
    const { shift } = await api.clockIn(opts);
    setState((s) => {
      const existing = s.shifts.find((x) => x.id === shift.id);
      const shifts = existing ? s.shifts.map((x) => (x.id === shift.id ? shift : x)) : [...s.shifts, shift];
      return { ...s, shifts, activeShift: shift };
    });
  }, []);

  const api_clockOut = useCallback(async () => {
    const { shift } = await api.clockOut();
    setState((s) => ({
      ...s,
      shifts: shift ? s.shifts.map((x) => (x.id === shift.id ? shift : x)) : s.shifts,
      activeShift: null,
    }));
  }, []);

  const api_cancel = useCallback(async () => {
    const activeId = state.activeShift?.id;
    await api.cancelActive();
    setState((s) => ({
      ...s,
      shifts: activeId ? s.shifts.filter((x) => x.id !== activeId) : s.shifts,
      activeShift: null,
    }));
  }, [state.activeShift?.id]);

  const api_break = useCallback(async (minutes: number) => {
    const { shift } = await api.addBreak(minutes);
    if (!shift) return;
    setState((s) => ({
      ...s,
      shifts: s.shifts.map((x) => (x.id === shift.id ? shift : x)),
      activeShift: s.activeShift?.id === shift.id ? shift : s.activeShift,
    }));
  }, []);

  const api_addManual = useCallback(async (shift: Omit<Shift, "id">) => {
    const { shift: created } = await api.createShift(shift);
    setState((s) => ({ ...s, shifts: [...s.shifts, created] }));
  }, []);

  const api_updateShift = useCallback(async (id: string, patch: Partial<Shift>) => {
    const { shift } = await api.updateShift(id, patch);
    setState((s) => ({
      ...s,
      shifts: s.shifts.map((x) => (x.id === id ? shift : x)),
      activeShift: s.activeShift?.id === id ? (shift.clockOut ? null : shift) : s.activeShift,
    }));
  }, []);

  const api_deleteShift = useCallback(async (id: string) => {
    await api.deleteShift(id);
    setState((s) => ({
      ...s,
      shifts: s.shifts.filter((x) => x.id !== id),
      activeShift: s.activeShift?.id === id ? null : s.activeShift,
    }));
  }, []);

  const api_addScheduled = useCallback(async (sNew: Omit<ScheduledShift, "id">) => {
    const { scheduled } = await api.createScheduled(sNew);
    setState((s) => ({ ...s, scheduled: [...s.scheduled, scheduled] }));
  }, []);

  const api_updateScheduled = useCallback(async (id: string, patch: Partial<ScheduledShift>) => {
    const { scheduled } = await api.updateScheduled(id, patch);
    setState((s) => ({ ...s, scheduled: s.scheduled.map((x) => (x.id === id ? scheduled : x)) }));
  }, []);

  const api_deleteScheduled = useCallback(async (id: string) => {
    await api.deleteScheduled(id);
    setState((s) => ({ ...s, scheduled: s.scheduled.filter((x) => x.id !== id) }));
  }, []);

  const api_updateSettings = useCallback(async (patch: Partial<Settings> & { name?: string }) => {
    const { user } = await api.updateSettings(patch);
    setState((s) => ({ ...s, user }));
  }, []);

  const api_logout = useCallback(async () => {
    await api.logout();
    setState({ ready: true, user: null, activeShift: null, shifts: [], scheduled: [] });
    router.push("/login");
  }, [router]);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      refresh,
      clockIn: api_clockIn,
      clockOut: api_clockOut,
      cancelActive: api_cancel,
      addBreak: api_break,
      addManualShift: api_addManual,
      updateShift: api_updateShift,
      deleteShift: api_deleteShift,
      addScheduled: api_addScheduled,
      updateScheduled: api_updateScheduled,
      deleteScheduled: api_deleteScheduled,
      updateSettings: api_updateSettings,
      logout: api_logout,
    }),
    [
      state,
      refresh,
      api_clockIn,
      api_clockOut,
      api_cancel,
      api_break,
      api_addManual,
      api_updateShift,
      api_deleteShift,
      api_addScheduled,
      api_updateScheduled,
      api_deleteScheduled,
      api_updateSettings,
      api_logout,
    ],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
