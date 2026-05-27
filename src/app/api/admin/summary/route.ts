import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dbShiftToClient, dbUserToClient } from "@/lib/transform";
import {
  computePeriodTotals,
  computeWeekTotals,
  getPayPeriodRange,
  getWeekRange,
} from "@/lib/time";

export const runtime = "nodejs";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [users, allShifts] = await Promise.all([
    db.select().from(schema.users).orderBy(schema.users.createdAt),
    db.select().from(schema.shifts),
  ]);

  const shiftsByUser = new Map<string, ReturnType<typeof dbShiftToClient>[]>();
  for (const s of allShifts) {
    const list = shiftsByUser.get(s.userId) ?? [];
    list.push(dbShiftToClient(s));
    shiftsByUser.set(s.userId, list);
  }

  const now = new Date();

  const rows = users.map((u) => {
    const client = dbUserToClient(u);
    const shifts = shiftsByUser.get(u.id) ?? [];
    const week = getWeekRange(now, client.settings.weekStartsOn);
    const period = getPayPeriodRange(
      now,
      client.settings.payPeriodType,
      client.settings.payPeriodAnchor,
      client.settings.weekStartsOn,
    );
    const weekTotals = computeWeekTotals(shifts, week.start, client.settings);
    const periodTotals = computePeriodTotals(shifts, period.start, period.end, client.settings);
    return {
      user: client,
      week: { start: week.start.toISOString(), end: week.end.toISOString(), totals: weekTotals },
      period: { start: period.start.toISOString(), end: period.end.toISOString(), totals: periodTotals },
    };
  });

  const grand = rows.reduce(
    (acc, r) => {
      acc.hours += r.period.totals.totalHours;
      acc.regular += r.period.totals.regular;
      acc.overtime += r.period.totals.overtime;
      acc.gross += r.period.totals.gross;
      acc.net += r.period.totals.net;
      return acc;
    },
    { hours: 0, regular: 0, overtime: 0, gross: 0, net: 0 },
  );

  return NextResponse.json({ rows, grand });
}
