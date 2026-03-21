# AF_APP — Workout Tracker for Personal Trainers

> A full-stack PWA built for real personal trainers to manage clients, track progress, and run a professional practice — from any device.

**Live:** [aftrainer.app](https://aftrainer.app)

---

## What It Does

AF_APP gives personal trainers a complete digital toolkit to manage their clients and track results over time. Clients get their own portal to log workouts and view their progress. No spreadsheets, no paper — everything in one place, accessible from phone, tablet, or desktop.

---

## Features

### Client Management
- Add and manage unlimited clients with full profiles
- Track training level (beginner / intermediate / advanced), primary goal, start date
- Active / inactive status — filter your roster at a glance
- Dashboard stats: total clients, active count, inactive count

### Workout Logging
- Log sets, reps, weight, RPE (Rate of Perceived Exertion), and session notes
- Per-set builder — log warm-up, work sets, back-off sets individually
- 60+ exercises organized by muscle group with live search
- Inline edit — correct any entry without re-logging
- **PR badges** — trophy icon auto-appears when a personal record is set

### Workout Templates
- Create reusable workout templates (e.g. "Push Day A", "Full Body Strength")
- Add exercises with sets, reps target, and weight target
- Apply any template to a client session in one tap

### Goal Tracking
- Set goals by type: Lift PR, Body Weight, Body Fat %, or Custom
- Set baseline and target values with a deadline
- Auto-progress bars — pull current data from workouts and measurements automatically
- Mark goals achieved, track days remaining, flag overdue goals

### Session Notes & Check-ins
- Log session notes with mood score (1–5) and energy score (1–5)
- Types: Session, General, Nutrition, Call
- Full chronological feed per client

### Body Measurements
- Track 12 measurements: weight, body fat %, neck, shoulders, chest, bicep, forearm, waist, hips, glutes, thigh, calf
- Body weight trend chart auto-updates as you log

### Progress & Analytics
- Volume progress chart per exercise (sets × reps × weight over time)
- Full Personal Records leaderboard per client
- Stats bar: total entries, sessions, total volume, top exercise

### Export
- Export full workout history as **CSV** (opens in Excel / Google Sheets)
- Generate a **PDF progress report** for any client

### Client Portal
- Invite clients to their own portal via magic link email (no password needed)
- Clients log in and see only their own data: workouts, goals, body measurements
- Clients can log their own sets — trainer gets a PR notification when a record is broken
- PR notification bell in trainer nav — shows unread client PRs with exercise and weight

### Admin Panel
- 3-tier role system: Trainer → Admin → Super Admin
- Transfer clients between trainers (all history moves atomically)
- Promote / demote trainer roles
- Stats: total trainers, total clients, active clients

### PWA — Works Like a Native App
- Installable on iPhone, Android, iPad via "Add to Home Screen"
- Offline support via Workbox service workers
- Optimized for mobile — no zoom issues, full touch support

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 3 |
| Backend / DB | Supabase (PostgreSQL + Auth) |
| Auth | Supabase Auth — email/password + magic link |
| Charts | Recharts |
| PWA | vite-plugin-pwa + Workbox |
| Export | jsPDF |
| Routing | React Router v6 |
| Email | Resend (custom SMTP — noreply@aftrainer.app) |
| Deployment | Vercel (auto-deploy on push) |
| DNS | Cloudflare |
| Mobile (native) | Capacitor (Android configured) |

---

## Security

- **Row Level Security (RLS)** — trainers only see their own data. Clients only see their own records. Enforced at the database level.
- `is_admin()`, `is_client()`, `my_client_id()` — Postgres security definer functions for RLS policies
- Auth tokens managed by Supabase — never stored in localStorage
- All env vars gitignored — no credentials in source control

---

## Database Schema

```
profiles              — role (trainer|admin|super_admin|client), full_name, client_id FK
clients               — trainer_id FK, name, email, phone, training_level, primary_goal, is_active
workout_entries       — client_id FK, trainer_id FK, date, exercise, muscle_group, sets, reps, weight, rpe, notes
body_measurements     — weight_lbs, body_fat_pct, neck, shoulders, chest, bicep, forearm, waist, hips, glutes, thigh, calf
client_goals          — type, baseline, target, target_unit, deadline, status
client_checkins       — type, body, mood_score, energy_score
workout_templates     — trainer-owned named templates
template_exercises    — exercises per template
pr_notifications      — client PR inbox for trainers (exercise, new_weight, read)
```

---

## Local Setup

```bash
git clone https://github.com/Adrianbrou/af_app.git
cd af_app
npm install
```

Create `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run the SQL migrations in Supabase SQL Editor in order:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_additions.sql`
3. `supabase/migrations/003_measurements_expanded.sql`
4. `supabase/migrations/004_admin.sql`
5. `supabase/migrations/005_client_portal.sql`
6. `supabase/migrations/006_client_portal_trigger.sql`

```bash
npm run dev
```

---

## Project Structure

```
src/
├── pages/
│   ├── LoginPage.jsx         # Login / forgot password
│   ├── DashboardPage.jsx     # Client roster with stats
│   ├── ClientDetailPage.jsx  # 5-tab client view + invite to portal
│   ├── TemplatesPage.jsx     # Workout template builder
│   ├── AdminPage.jsx         # Role management + client transfer
│   └── ClientPortalPage.jsx  # Client-facing portal (workouts/goals/body)
├── hooks/
│   ├── useClients.js         # Client CRUD
│   ├── useWorkouts.js        # Workout entry CRUD
│   ├── useMeasurements.js    # Body measurements CRUD
│   ├── useGoals.js           # Goal CRUD
│   ├── useCheckIns.js        # Check-in CRUD
│   ├── useTemplates.js       # Template + exercise CRUD
│   └── useAdmin.js           # Admin: trainers, transfer, role management
├── context/
│   ├── AuthContext.jsx       # Session, profile, clientRecord, role flags
│   └── ToastContext.jsx      # Global toast notifications
├── components/
│   ├── Layout.jsx            # Header/nav (trainer view + client view)
│   ├── ProtectedRoute.jsx    # Auth guard
│   └── ui/                   # Button, Card, Input, Select, Label, Textarea
├── constants/
│   └── exercises.js          # 60+ exercises by muscle group
└── lib/
    └── supabase.js           # Supabase client
```

---

## Build & Deploy

```bash
npm run build    # production build → dist/
npm run preview  # preview locally
```

Vercel auto-deploys on every push to `main`. DNS managed via Cloudflare.
