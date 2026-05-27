import type { DbScheduled, DbShift, DbUser } from "./schema";
import type { ClientUser, ScheduledShift, Shift } from "./types";

export function dbShiftToClient(s: DbShift): Shift {
  return {
    id: s.id,
    clockIn: s.clockIn.toISOString(),
    clockOut: s.clockOut ? s.clockOut.toISOString() : null,
    breakMinutes: s.breakMinutes,
    notes: s.notes ?? undefined,
    job: s.job ?? undefined,
  };
}

export function dbScheduledToClient(s: DbScheduled): ScheduledShift {
  return {
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    job: s.job ?? undefined,
    notes: s.notes ?? undefined,
  };
}

export function dbUserToClient(u: DbUser): ClientUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as "admin" | "employee",
    active: u.active,
    settings: {
      employeeName: u.name,
      hourlyRate: u.hourlyRate,
      overtimeMultiplier: u.overtimeMultiplier,
      overtimeRule: u.overtimeRule as ClientUser["settings"]["overtimeRule"],
      payPeriodType: u.payPeriodType as ClientUser["settings"]["payPeriodType"],
      payPeriodAnchor: u.payPeriodAnchor || new Date().toISOString().slice(0, 10),
      weekStartsOn: (u.weekStartsOn === 1 ? 1 : 0) as 0 | 1,
      taxWithholdingPercent: u.taxWithholdingPercent,
      currency: u.currency,
    },
  };
}
