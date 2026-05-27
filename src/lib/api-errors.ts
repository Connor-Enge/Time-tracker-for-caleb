import { NextResponse } from "next/server";

export function handleApiError(e: unknown) {
  const err = e instanceof Error ? e : new Error(typeof e === "string" ? e : "Server error");
  const msg = err.message || "Server error";
  console.error("[api]", err);

  if (
    /relation .* does not exist/i.test(msg) ||
    /no such table/i.test(msg) ||
    /\b42P01\b/.test(msg)
  ) {
    return NextResponse.json(
      {
        error:
          "Database tables don't exist yet. Run `npm run db:push` locally with your Neon DATABASE_URL, or paste db/init.sql into the Neon SQL editor.",
        code: "schema_missing",
      },
      { status: 503 },
    );
  }
  if (/JWT_SECRET/i.test(msg)) {
    return NextResponse.json(
      {
        error: "Server is missing the JWT_SECRET env var. Add it to your Vercel project and redeploy.",
        code: "jwt_secret_missing",
      },
      { status: 503 },
    );
  }
  if (/placeholder/i.test(msg) || (/database/i.test(msg) && /(connect|connection)/i.test(msg))) {
    return NextResponse.json(
      {
        error:
          "Couldn't reach the database. Check that DATABASE_URL is set in your Vercel project (Production environment).",
        code: "db_unreachable",
      },
      { status: 503 },
    );
  }
  if (/duplicate key/i.test(msg) || /\b23505\b/.test(msg)) {
    return NextResponse.json(
      { error: "That value is already taken.", code: "duplicate" },
      { status: 409 },
    );
  }
  return NextResponse.json({ error: msg }, { status: 500 });
}
