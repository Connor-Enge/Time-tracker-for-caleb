# Time Tracker

Mobile-first hourly time tracker for employees, with a calendar, pay management,
and an admin panel for managers. Built with Next.js (App Router), Tailwind CSS,
Drizzle ORM, and Neon Postgres. Designed to deploy on Vercel.

## Features

- Email + password login with httpOnly cookie JWT sessions
- Two roles: `employee` and `admin`. The first user to sign up is auto-promoted
  to admin (controlled by `PROMOTE_FIRST_USER_TO_ADMIN`)
- **Clock In / Clock Out** with live running timer, breaks, optional job tag,
  and cancel-active-shift
- **Calendar** showing worked / scheduled / fulfilled / missed days, with
  per-day shift details and inline scheduling
- **Timesheet** with manual entry, edit, and delete; grouped by day with day
  totals
- **Pay** view with weekly + per-pay-period totals, regular vs overtime hours,
  configurable overtime rules (none / daily 8h / weekly 40h / both), overtime
  multiplier, tax withholding estimate, and currency
- **Settings** for hourly rate, OT, pay period (weekly / biweekly / semi-monthly
  / monthly), week start day, currency, name
- **Admin** panel to view all employees, promote/demote admins, deactivate
  accounts, and drill into any employee's hours and pay
- Mobile-first UI with bottom tab navigation, safe-area handling, dark mode

## 1. Set up Neon (Postgres)

1. Create a free account at https://neon.tech.
2. Create a new project. Neon will show a connection string that looks like
   `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`.
3. Copy the **pooled** connection string (Neon shows two — pooled is best for
   serverless/Vercel).

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local dev:

```bash
cp .env.example .env.local
```

Fill in:

- `DATABASE_URL` — the Neon pooled connection string
- `JWT_SECRET` — a long random string. Generate one with:
  ```bash
  openssl rand -hex 64
  ```
- `PROMOTE_FIRST_USER_TO_ADMIN` — keep as `true` so the first signup becomes
  admin. Set to `false` after your admin account exists.

## 3. Create the database schema

You have two options. Either one works.

**Option A — Drizzle (recommended):**

```bash
npm install
npm run db:push
```

**Option B — Paste SQL into Neon's SQL editor:**

Open `db/init.sql` in this repo and run its contents in the Neon SQL editor.

## 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first account you create will become the admin.

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. Go to https://vercel.com → New Project → import the repo.
3. In **Project Settings → Environment Variables**, add:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PROMOTE_FIRST_USER_TO_ADMIN` (optional; defaults to true)
4. Deploy. Vercel will run `next build` automatically.
5. Once your first admin signs up, you can flip
   `PROMOTE_FIRST_USER_TO_ADMIN=false` and redeploy so new signups are
   regular employees.

## Project layout

```
src/
  app/                Next.js App Router pages + API routes
    api/auth/         signup, login, logout, me
    api/shifts/       list/create + per-id update/delete
    api/scheduled/    schedule CRUD
    api/clock/        clock in/out/break/cancel
    api/settings/     update current user settings
    api/admin/users/  admin: list users + per-user details
    admin/            admin pages
  components/         UI (ClockCard, CalendarView, BottomNav, etc.)
  lib/
    db.ts             Neon + Drizzle setup
    schema.ts         Drizzle schema (users, shifts, scheduled_shifts)
    auth.ts           JWT cookies + password hashing helpers
    api.ts            Typed client wrapper around fetch
    time.ts           Hour/pay math (week, period, overtime)
    types.ts          Shared client types
middleware.ts          Gates protected routes, redirects to /login
db/init.sql            Plain-SQL schema as a Neon-editor fallback
drizzle.config.ts      Drizzle Kit config
```

## Notes

- Sessions are 30 days. Sign out from Settings to clear the cookie.
- All shift times are stored in UTC (Postgres `timestamptz`) and rendered in
  the user's local timezone.
- Overtime is calculated per week using the configured rule; for pay periods
  spanning multiple weeks, the totals are summed across the period.
- This app stores no payroll or sensitive PII beyond email + password hash;
  the tax-withholding line is a display estimate only and is not authoritative
  for actual payroll/tax reporting.
