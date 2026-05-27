import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dbShiftToClient } from "@/lib/transform";

export const runtime = "nodejs";

async function loadShiftWithAccess(id: string) {
  const me = await getCurrentUser();
  if (!me) return { error: "Unauthorized" as const, status: 401 };
  const rows = await db.select().from(schema.shifts).where(eq(schema.shifts.id, id)).limit(1);
  const shift = rows[0];
  if (!shift) return { error: "Not found" as const, status: 404 };
  if (shift.userId !== me.id && me.role !== "admin") {
    return { error: "Forbidden" as const, status: 403 };
  }
  return { me, shift };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const res = await loadShiftWithAccess(params.id);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body.clockIn === "string") {
    const d = new Date(body.clockIn);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid clockIn" }, { status: 400 });
    patch.clockIn = d;
  }
  if (body.clockOut === null) {
    patch.clockOut = null;
  } else if (typeof body.clockOut === "string") {
    const d = new Date(body.clockOut);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid clockOut" }, { status: 400 });
    patch.clockOut = d;
  }
  if (typeof body.breakMinutes === "number") {
    patch.breakMinutes = Math.max(0, Math.floor(body.breakMinutes));
  }
  if (body.notes !== undefined) patch.notes = body.notes || null;
  if (body.job !== undefined) patch.job = body.job || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ shift: dbShiftToClient(res.shift) });
  }

  const [updated] = await db
    .update(schema.shifts)
    .set(patch)
    .where(eq(schema.shifts.id, params.id))
    .returning();
  return NextResponse.json({ shift: dbShiftToClient(updated) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const res = await loadShiftWithAccess(params.id);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  await db.delete(schema.shifts).where(eq(schema.shifts.id, params.id));
  return NextResponse.json({ ok: true });
}
