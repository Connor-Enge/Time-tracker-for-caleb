import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dbScheduledToClient, dbShiftToClient, dbUserToClient } from "@/lib/transform";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userRows = await db.select().from(schema.users).where(eq(schema.users.id, params.id)).limit(1);
  const user = userRows[0];
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [shifts, scheduled] = await Promise.all([
    db.select().from(schema.shifts).where(eq(schema.shifts.userId, params.id)).orderBy(schema.shifts.clockIn),
    db
      .select()
      .from(schema.scheduledShifts)
      .where(eq(schema.scheduledShifts.userId, params.id))
      .orderBy(schema.scheduledShifts.date),
  ]);

  return NextResponse.json({
    user: dbUserToClient(user),
    shifts: shifts.map(dbShiftToClient),
    scheduled: scheduled.map(dbScheduledToClient),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (body.role === "admin" || body.role === "employee") patch.role = body.role;
  if (typeof body.active === "boolean") patch.active = body.active;
  if (typeof body.hourlyRate === "number" && body.hourlyRate >= 0) patch.hourlyRate = body.hourlyRate;

  if (Object.keys(patch).length === 0) {
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, params.id)).limit(1);
    return NextResponse.json({ user: rows[0] ? dbUserToClient(rows[0]) : null });
  }

  const [updated] = await db.update(schema.users).set(patch).where(eq(schema.users.id, params.id)).returning();
  return NextResponse.json({ user: dbUserToClient(updated) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (params.id === me.id) {
    return NextResponse.json({ error: "You can't delete your own account here." }, { status: 400 });
  }
  await db.delete(schema.users).where(eq(schema.users.id, params.id));
  return NextResponse.json({ ok: true });
}
