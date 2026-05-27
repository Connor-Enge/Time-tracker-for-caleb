import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser, hashPassword, isValidEmail } from "@/lib/auth";
import { dbUserToClient } from "@/lib/transform";

export const runtime = "nodejs";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.select().from(schema.users).orderBy(schema.users.createdAt);
  return NextResponse.json({ users: rows.map(dbUserToClient) });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  const hourlyRate = Number.isFinite(body.hourlyRate) ? Number(body.hourlyRate) : 20;
  const role = body.role === "admin" ? "admin" : "employee";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const today = new Date().toISOString().slice(0, 10);
  const [created] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash,
      name: name || email.split("@")[0],
      role,
      hourlyRate: Math.max(0, hourlyRate),
      payPeriodAnchor: today,
    })
    .returning();

  return NextResponse.json({ user: dbUserToClient(created) });
}
