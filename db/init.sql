-- Time Tracker schema. Run this in the Neon SQL editor if you don't want to use `npm run db:push`.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'employee',
  hourly_rate real NOT NULL DEFAULT 20,
  overtime_multiplier real NOT NULL DEFAULT 1.5,
  overtime_rule text NOT NULL DEFAULT 'weekly40',
  pay_period_type text NOT NULL DEFAULT 'biweekly',
  pay_period_anchor text NOT NULL DEFAULT '',
  week_starts_on integer NOT NULL DEFAULT 0,
  tax_withholding_percent real NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  break_minutes integer NOT NULL DEFAULT 0,
  notes text,
  job text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shifts_user_clockin_idx ON shifts(user_id, clock_in);

CREATE TABLE IF NOT EXISTS scheduled_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  job text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scheduled_user_date_idx ON scheduled_shifts(user_id, date);
