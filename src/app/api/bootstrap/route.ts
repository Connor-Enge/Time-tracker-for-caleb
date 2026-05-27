import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { dbScheduledToClient, dbShiftToClient, dbUserToClient } from "@/lib/transform";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [userRows, shiftRows, scheduledRows] = await Promise.all([
    db.select().from(schema.users).where(eq(schema.users.id, session.sub)).limit(1),
    db.select().from(schema.shifts).where(eq(schema.shifts.userId, session.sub)).orderBy(schema.shifts.clockIn),
    db
      .select()
      .from(schema.scheduledShifts)
      .where(eq(schema.scheduledShifts.userId, session.sub))
      .orderBy(schema.scheduledShifts.date),
  ]);

  const user = userRows[0];
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = shiftRows.find((s) => s.clockOut === null);

  return NextResponse.json({
    user: dbUserToClient(user),
    activeShift: active ? dbShiftToClient(active) : null,
    shifts: shiftRows.map(dbShiftToClient),
    scheduled: scheduledRows.map(dbScheduledToClient),
  });
}
