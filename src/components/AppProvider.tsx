"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  loadError: string | null;
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
const EMPTY: State = {
  ready: true,
  loadError: null,
  user: null,
  activeShift: null,
  shifts: [],
  scheduled: [],
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<State>({ ...EMPTY, ready: false });
  const hasFetchedRef = useRef(false);
  const onAuthPageRef = useRef(false);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loadError: null }));
    try {
      const data = await api.bootstrap();
      setState({
        ready: true,
        loadError: null,
        user: data.user,
        activeShift: data.activeShift,
        shifts: data.shifts,
        scheduled: data.scheduled,
      });
      hasFetchedRef.current = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      const unauth = /unauthor/i.test(msg);
      setState({
        ready: true,
        loadError: unauth ? null : msg,
        user: null,
        activeShift: null,
        shifts: [],
        scheduled: [],
      });
      if (unauth) {
        router.replace("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    const isAuthPage = pathname ? AUTH_PAGES.has(pathname) : false;
    if (isAuthPage) {
      onAuthPageRef.current = true;
      setState((s) => (s.ready ? s : { ...EMPTY }));
      return;
    }
    const cameFromAuth = onAuthPageRef.current;
    onAuthPageRef.current = false;
    if (!hasFetchedRef.current || cameFromAuth) {
      refresh();
    }
  }, [pathname, refresh]);

  const clockIn = useCallback(async (opts?: { job?: string; notes?: string }) => {
    const { shift } = await api.clockIn(opts);
    setState((s) => {
      const exists = s.shifts.find((x) => x.id === shift.id);
      const shifts = exists ? s.shifts.map((x) => (x.id === shift.id ? shift : x)) : [...s.shifts, shift];
      return { ...s, shifts, activeShift: shift };
    });
  }, []);

  const clockOut = useCallback(async () => {
    const { shift } = await api.clockOut();
    setState((s) => ({
      ...s,
      shifts: shift ? s.shifts.map((x) => (x.id === shift.id ? shift : x)) : s.shifts,
      activeShift: null,
    }));
  }, []);

  const cancelActive = useCallback(async () => {
    const activeId = state.activeShift?.id;
    await api.cancelActive();
    setState((s) => ({
      ...s,
      shifts: activeId ? s.shifts.filter((x) => x.id !== activeId) : s.shifts,
      activeShift: null,
    }));
  }, [state.activeShift?.id]);

  const addBreak = useCallback(async (minutes: number) => {
    const { shift } = await api.addBreak(minutes);
    if (!shift) return;
    setState((s) => ({
      ...s,
      shifts: s.shifts.map((x) => (x.id === shift.id ? shift : x)),
      activeShift: s.activeShift?.id === shift.id ? shift : s.activeShift,
    }));
  }, []);

  const addManualShift = useCallback(async (shift: Omit<Shift, "id">) => {
    const { shift: created } = await api.createShift(shift);
    setState((s) => ({ ...s, shifts: [...s.shifts, created] }));
  }, []);

  const updateShift = useCallback(async (id: string, patch: Partial<Shift>) => {
    const { shift } = await api.updateShift(id, patch);
    setState((s) => ({
      ...s,
      shifts: s.shifts.map((x) => (x.id === id ? shift : x)),
      activeShift:
        s.activeShift?.id === id ? (shift.clockOut ? null : shift) : s.activeShift,
    }));
  }, []);

  const deleteShift = useCallback(async (id: string) => {
    await api.deleteShift(id);
    setState((s) => ({
      ...s,
      shifts: s.shifts.filter((x) => x.id !== id),
      activeShift: s.activeShift?.id === id ? null : s.activeShift,
    }));
  }, []);

  const addScheduled = useCallback(async (sNew: Omit<ScheduledShift, "id">) => {
    const { scheduled } = await api.createScheduled(sNew);
    setState((s) => ({ ...s, scheduled: [...s.scheduled, scheduled] }));
  }, []);

  const updateScheduled = useCallback(async (id: string, patch: Partial<ScheduledShift>) => {
    const { scheduled } = await api.updateScheduled(id, patch);
    setState((s) => ({ ...s, scheduled: s.scheduled.map((x) => (x.id === id ? scheduled : x)) }));
  }, []);

  const deleteScheduled = useCallback(async (id: string) => {
    await api.deleteScheduled(id);
    setState((s) => ({ ...s, scheduled: s.scheduled.filter((x) => x.id !== id) }));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings> & { name?: string }) => {
    const { user } = await api.updateSettings(patch);
    setState((s) => ({ ...s, user }));
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    hasFetchedRef.current = false;
    setState({ ...EMPTY });
    router.push("/login");
  }, [router]);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      refresh,
      clockIn,
      clockOut,
      cancelActive,
      addBreak,
      addManualShift,
      updateShift,
      deleteShift,
      addScheduled,
      updateScheduled,
      deleteScheduled,
      updateSettings,
      logout,
    }),
    [
      state,
      refresh,
      clockIn,
      clockOut,
      cancelActive,
      addBreak,
      addManualShift,
      updateShift,
      deleteShift,
      addScheduled,
      updateScheduled,
      deleteScheduled,
      updateSettings,
      logout,
    ],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
