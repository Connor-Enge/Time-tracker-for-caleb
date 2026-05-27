import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const PLACEHOLDER =
  "postgresql://placeholder:placeholder@placeholder.neon.tech/placeholder?sslmode=require";

const sql = neon(process.env.DATABASE_URL || PLACEHOLDER);
export const db = drizzle(sql, { schema });
export { schema };
