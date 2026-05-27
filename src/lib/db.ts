import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[db] DATABASE_URL is not set. Add it to .env.local or your Vercel project.");
  }
}

const sql = neon(connectionString || "postgresql://placeholder:placeholder@placeholder.neon.tech/placeholder?sslmode=require");
export const db = drizzle(sql, { schema });
export { schema };
