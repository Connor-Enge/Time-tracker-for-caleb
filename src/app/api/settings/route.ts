import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dbUserToClient } from "@/lib/transform";

export const runtime = "nodejs";

const OVERTIME_RULES = new Set(["none", "daily8", "weekly40", "both"]);
const PAY_PERIODS = new Set(["weekly", "biweekly", "semimonthly", "monthly"]);

export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.hourlyRate === "number" && body.hourlyRate >= 0) patch.hourlyRate = body.hourlyRate;
  if (typeof body.overtimeMultiplier === "number" && body.overtimeMultiplier >= 1)
    patch.overtimeMultiplier = body.overtimeMultiplier;
  if (typeof body.overtimeRule === "string" && OVERTIME_RULES.has(body.overtimeRule))
    patch.overtimeRule = body.overtimeRule;
  if (typeof body.payPeriodType === "string" && PAY_PERIODS.has(body.payPeriodType))
    patch.payPeriodType = body.payPeriodType;
  if (typeof body.payPeriodAnchor === "string") patch.payPeriodAnchor = body.payPeriodAnchor;
  if (body.weekStartsOn === 0 || body.weekStartsOn === 1) patch.weekStartsOn = body.weekStartsOn;
  if (typeof body.taxWithholdingPercent === "number" && body.taxWithholdingPercent >= 0)
    patch.taxWithholdingPercent = body.taxWithholdingPercent;
  if (typeof body.currency === "string" && body.currency.length <= 5) patch.currency = body.currency;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ user: dbUserToClient(me) });
  }

  const [updated] = await db.update(schema.users).set(patch).where(eq(schema.users.id, me.id)).returning();
  return NextResponse.json({ user: dbUserToClient(updated) });
}
