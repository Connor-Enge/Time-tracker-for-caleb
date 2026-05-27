import {
  boolean,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  role: text("role").notNull().default("employee"),
  hourlyRate: real("hourly_rate").notNull().default(20),
  overtimeMultiplier: real("overtime_multiplier").notNull().default(1.5),
  overtimeRule: text("overtime_rule").notNull().default("weekly40"),
  payPeriodType: text("pay_period_type").notNull().default("biweekly"),
  payPeriodAnchor: text("pay_period_anchor").notNull().default(""),
  weekStartsOn: integer("week_starts_on").notNull().default(0),
  taxWithholdingPercent: real("tax_withholding_percent").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shifts = pgTable("shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clockIn: timestamp("clock_in", { withTimezone: true }).notNull(),
  clockOut: timestamp("clock_out", { withTimezone: true }),
  breakMinutes: integer("break_minutes").notNull().default(0),
  notes: text("notes"),
  job: text("job"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scheduledShifts = pgTable("scheduled_shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  job: text("job"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DbUser = typeof users.$inferSelect;
export type NewDbUser = typeof users.$inferInsert;
export type DbShift = typeof shifts.$inferSelect;
export type NewDbShift = typeof shifts.$inferInsert;
export type DbScheduled = typeof scheduledShifts.$inferSelect;
export type NewDbScheduled = typeof scheduledShifts.$inferInsert;
