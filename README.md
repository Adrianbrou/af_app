# AF_APP — Workout Tracker for Personal Trainers

> A full-stack PWA built for real personal trainers to manage clients, track progress, and run a professional practice — from any device.

**Live:** [aftrainer.app](https://aftrainer.app)

---

## What It Does

AF_APP gives personal trainers a complete digital toolkit to manage their clients and track results over time. No spreadsheets, no paper — everything in one place, accessible from phone, tablet, or desktop.

---

## Features

### Client Management
- Add and manage unlimited clients with full profiles
- Track training level (beginner / intermediate / advanced), primary goal, start date
- Active / inactive status — filter your roster at a glance
- Dashboard stats: total clients, active count, inactive count

### Workout Logging
- Log sets, reps, weight, RPE (Rate of Perceived Exertion), and session notes
- 60+ exercises organized by muscle group with live search
- Inline edit — correct any entry without re-logging
- **PR badges** — trophy icon auto-appears when a personal record is set
- **Progressive overload hint** — suggests +3% weight when 12+ reps are hit

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
- Track weight (lbs), body fat %, chest, waist, and hips over time
- Body weight trend chart auto-updates as you log

### Progress & Analytics
- Volume progress chart per exercise (sets × reps × weight over time)
- Full Personal Records leaderboard per client
- Stats bar: total entries, sessions, total volume, top exercise

### Export
- Export full workout history as **CSV** (opens in Excel / Google Sheets)
- Generate a **PDF progress report** for any client

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
| Auth | Supabase Auth — email/password, JWT |
| Charts | Recharts |
| PWA | vite-plugin-pwa + Workbox |
| Export | jsPDF + html2canvas |
| Routing | React Router v6 |
| Deployment | Vercel (auto-deploy on push) |
| Mobile (native) | Capacitor (Android configured) |

---

## Security

- **Row Level Security (RLS)** — trainers can only read and write their own data. No trainer can access another trainer's clients or workouts. Enforced at the database level.
- Auth tokens managed by Supabase — never stored in localStorage
- All env vars gitignored — no credentials in source control

---

## Database Schema

```
profiles              — trainer profile (auto-created on signup)
clients               — client roster (trainer_id FK + RLS)
workout_entries       — workout logs (client_id FK, RPE, full entry)
body_measurements     — weight, BF%, chest, waist, hips per client
client_goals          — goals with type, baseline, target, deadline, status
client_checkins       — session notes with mood/energy scores
workout_templates     — reusable named templates (trainer-owned)
template_exercises    — exercises inside each template
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

Run the SQL files in Supabase SQL Editor:
1. `supabase/schema.sql`
2. `supabase/migrations/002_additions.sql`

```bash
npm run dev
```

---

## Project Structure

```
src/
├── pages/
│   ├── LoginPage.jsx         # Login / register / forgot password
│   ├── DashboardPage.jsx     # Client roster with stats
│   ├── ClientDetailPage.jsx  # 5-tab client view (Workouts, Goals, Check-ins, Measurements, Progress)
│   └── TemplatesPage.jsx     # Workout template builder
├── hooks/
│   ├── useClients.js         # Client CRUD
│   ├── useWorkouts.js        # Workout entry CRUD + inline edit
│   ├── useMeasurements.js    # Body measurements CRUD
│   ├── useGoals.js           # Goal CRUD
│   ├── useCheckIns.js        # Check-in CRUD
│   └── useTemplates.js       # Template + exercise CRUD
├── context/
│   ├── AuthContext.jsx       # Session, signIn, signUp, signOut, resetPassword
│   └── ToastContext.jsx      # Global toast notifications
├── components/
│   ├── Layout.jsx            # Shared header / nav
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

Vercel auto-deploys on every push to `main`.
