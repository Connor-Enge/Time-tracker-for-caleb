import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dbShiftToClient } from "@/lib/transform";

export const runtime = "nodejs";

type Action =
  | { action: "in"; job?: string; notes?: string }
  | { action: "out" }
  | { action: "cancel" }
  | { action: "break"; minutes: number };

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Action | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const active = await db
    .select()
    .from(schema.shifts)
    .where(and(eq(schema.shifts.userId, me.id), isNull(schema.shifts.clockOut)))
    .limit(1);

  if (body.action === "in") {
    if (active[0]) {
      return NextResponse.json({ shift: dbShiftToClient(active[0]) });
    }
    const [created] = await db
      .insert(schema.shifts)
      .values({
        userId: me.id,
        clockIn: new Date(),
        clockOut: null,
        breakMinutes: 0,
        job: body.job || null,
        notes: body.notes || null,
      })
      .returning();
    return NextResponse.json({ shift: dbShiftToClient(created) });
  }

  if (!active[0]) return NextResponse.json({ shift: null });

  if (body.action === "out") {
    const [updated] = await db
      .update(schema.shifts)
      .set({ clockOut: new Date() })
      .where(eq(schema.shifts.id, active[0].id))
      .returning();
    return NextResponse.json({ shift: dbShiftToClient(updated) });
  }

  if (body.action === "cancel") {
    await db.delete(schema.shifts).where(eq(schema.shifts.id, active[0].id));
    return NextResponse.json({ shift: null });
  }

  if (body.action === "break") {
    const add = Math.max(0, Math.floor(body.minutes || 0));
    const [updated] = await db
      .update(schema.shifts)
      .set({ breakMinutes: active[0].breakMinutes + add })
      .where(eq(schema.shifts.id, active[0].id))
      .returning();
    return NextResponse.json({ shift: dbShiftToClient(updated) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
