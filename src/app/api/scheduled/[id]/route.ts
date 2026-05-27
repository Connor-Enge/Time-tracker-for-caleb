import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dbScheduledToClient } from "@/lib/transform";

export const runtime = "nodejs";

async function load(id: string) {
  const me = await getCurrentUser();
  if (!me) return { error: "Unauthorized" as const, status: 401 };
  const rows = await db
    .select()
    .from(schema.scheduledShifts)
    .where(eq(schema.scheduledShifts.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "Not found" as const, status: 404 };
  if (row.userId !== me.id && me.role !== "admin") {
    return { error: "Forbidden" as const, status: 403 };
  }
  return { me, row };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const res = await load(params.id);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  for (const k of ["date", "startTime", "endTime", "job", "notes"] as const) {
    if (body[k] !== undefined) patch[k] = body[k] || null;
  }
  if (patch.date === null) delete patch.date;
  if (Object.keys(patch).length === 0) return NextResponse.json({ scheduled: dbScheduledToClient(res.row) });
  const [updated] = await db
    .update(schema.scheduledShifts)
    .set(patch)
    .where(eq(schema.scheduledShifts.id, params.id))
    .returning();
  return NextResponse.json({ scheduled: dbScheduledToClient(updated) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const res = await load(params.id);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  await db.delete(schema.scheduledShifts).where(eq(schema.scheduledShifts.id, params.id));
  return NextResponse.json({ ok: true });
}
