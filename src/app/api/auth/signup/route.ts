import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashPassword, isValidEmail, setSessionCookie } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let body: { email?: string; password?: string; name?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const name = (body.name ?? "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error:
            "Server is missing DATABASE_URL. Add it to your Vercel project (Production) and redeploy.",
          code: "db_url_missing",
        },
        { status: 503 },
      );
    }
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        {
          error: "Server is missing JWT_SECRET. Add it to your Vercel project and redeploy.",
          code: "jwt_secret_missing",
        },
        { status: 503 },
      );
    }

    const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const userCountRows = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
    const isFirstUser = userCountRows.length === 0;
    const promote = process.env.PROMOTE_FIRST_USER_TO_ADMIN !== "false";
    const role = isFirstUser && promote ? "admin" : "employee";

    const passwordHash = await hashPassword(password);
    const today = new Date().toISOString().slice(0, 10);

    const [created] = await db
      .insert(schema.users)
      .values({
        email,
        passwordHash,
        name: name || email.split("@")[0],
        role,
        payPeriodAnchor: today,
      })
      .returning();

    await setSessionCookie({
      sub: created.id,
      email: created.email,
      role: created.role as "admin" | "employee",
    });

    return NextResponse.json({
      user: { id: created.id, email: created.email, name: created.name, role: created.role },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
