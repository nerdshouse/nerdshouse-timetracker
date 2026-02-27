# Time Tracker & Issue Tracker

Full-stack web app for a software development company: track time, tasks, and billing by role (Owner, Developer, Client).

## Tech stack

- **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS**
- **Prisma** + **SQLite** (dev). Use PostgreSQL in production by changing `prisma/schema.prisma` datasource and `DATABASE_URL`.
- **Firebase / Firestore** (optional): client SDK in `src/lib/firebase.ts` + `firestore.ts`; server-side Admin in `src/lib/firebase-admin.ts` + `firestore-server.ts`. Use for real-time data, backups, or extra collections. Core app data stays in Prisma.
- **Session**: cookie-based (JWT via `jose`). Set `SESSION_SECRET` in production.
- **Auth**: Google Sign-In only (Firebase Auth). Users must be added by an admin (Owner) with their email; they then sign in with that Google account and get the assigned role.
- **Lucide React** for icons.

## Setup

```bash
cd tt
npm install
```

Ensure `.env` has:

- `DATABASE_URL="file:./dev.db"` (SQLite). For PostgreSQL: `postgresql://user:pass@host:5432/dbname`
- `SESSION_SECRET` (optional for dev)
- For server-side Firestore: `GOOGLE_APPLICATION_CREDENTIALS` (path to service account JSON) or `FIREBASE_ADMIN_*` env vars. See `.env.example`.

**Google Sign-In (required for login):** In [Firebase Console](https://console.firebase.google.com) → your project → **Build** → **Authentication** → **Sign-in method** → enable **Google**. Add your app domain (e.g. `localhost`, your Vercel domain) to authorized domains.

Create DB and seed:

```bash
npx prisma migrate dev
npx prisma db seed
```

Run dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You’ll be redirected to **Login**. Sign in with Google using an email that exists in the seed (or add users as Owner first).

## Seed users

After seeding, these emails can sign in with Google (the Google account email must match). For local testing, use Google accounts that have these addresses, or add your own email as Owner via Prisma/DB and sign in with that Google account.

| Name            | Email                 | Role      |
|-----------------|-----------------------|-----------|
| Alex Morgan     | alex@company.com      | Owner     |
| Jordan Lee      | jordan@company.com    | Developer |
| Sam Chen        | sam@company.com       | Developer |
| Taylor Swift    | taylor@swiftinc.com   | Client    |
| Morgan Industries | morgan@industries.com | Client    |

Seed also creates 2 projects (E-Commerce Platform, CRM Dashboard), 5 tasks, 4 time logs, and 3 activity log entries.

## Roles

- **Owner**: Full CRUD projects/tasks, billing (rate, hours bought), team, time logs, activity log. Red header.
- **Developer**: Assigned projects/tasks only; start/pause/resume/stop timers; update task status. No billing data. Blue header.
- **Client**: Own projects only; view-only timers; assign tasks; full budget view (hours, Rs., %). Purple header.

## Routes

- `/` – Redirects to role dashboard or `/login`
- `/login` – Google Sign-In only. Access is limited to emails added by an admin (Owner).
- `/owner` – Owner dashboard (tabs: Overview, Projects, Billing, Time Logs, Activity, Team)
- `/developer` – Developer dashboard (tasks, timers)
- `/client` – Client dashboard (tabs: Projects, Budget)

## Scripts

- `npm run dev` – Dev server
- `npm run build` – Production build
- `npm run db:seed` – Run seed
- `npm run db:studio` – Prisma Studio

## Billing logic

- Owner sets **hourly rate (Rs.)** and **total hours purchased** per project.
- Hours used = sum of time log durations for that project.
- Revenue = hours used × hourly rate. % used = (hours used / total hours bought) × 100.
- Color coding: green &lt; 70%, orange 70–90%, red &gt; 90%.
- Billing data is hidden from Developers.
