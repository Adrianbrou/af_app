# AF_APP — Workout Tracker

A professional workout tracking PWA for personal trainers to manage client progress, log sessions, and visualize performance over time.

---

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth)
- **Charts:** Recharts
- **PWA:** Workbox service workers (offline support, installable)
- **Export:** CSV + PDF (jsPDF)
- **Routing:** React Router v6

---

## Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd af_app
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free project, then:

- Open the **SQL Editor** and run the full contents of [`supabase/schema.sql`](supabase/schema.sql)
- This creates the `profiles`, `clients`, and `workout_entries` tables with Row Level Security

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials (found in Supabase → Settings → API):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Run

```bash
npm run dev
```

---

## Features

- **Trainer auth** — email/password login, registration, password reset
- **Client management** — add, view, and delete clients; each trainer only sees their own data
- **Workout logging** — log exercise, muscle group, sets, reps, weight, and notes
- **60+ exercises** — organized by muscle group, auto-filtered when selecting a muscle
- **Progress charts** — volume over time per exercise (line chart)
- **Stats dashboard** — total entries, sessions, total volume, top exercise
- **Progressive overload hint** — suggests a 3% weight increase when 12+ reps are hit
- **CSV export** — download any client's full workout history
- **PDF export** — generate a client progress report
- **PWA** — works offline, installable on mobile via "Add to Home Screen"

---

## Project Structure

```
src/
├── App.jsx                  # Router root
├── constants/
│   └── exercises.js         # Exercise library (60+ exercises by muscle group)
├── context/
│   └── AuthContext.jsx      # Auth state (session, signIn, signUp, signOut)
├── components/
│   ├── Layout.jsx           # Shared header/nav
│   ├── ProtectedRoute.jsx   # Redirects unauthenticated users to /login
│   └── ui/                  # Reusable components (Button, Card, Input, etc.)
├── hooks/
│   ├── useClients.js        # Client CRUD via Supabase
│   └── useWorkouts.js       # Workout entry CRUD via Supabase
├── lib/
│   └── supabase.js          # Supabase client
└── pages/
    ├── LoginPage.jsx        # Login / Register / Forgot password
    ├── DashboardPage.jsx    # Client list (trainer home)
    └── ClientDetailPage.jsx # Workout log, chart, export for a single client
```

---

## Database Schema

```
profiles          — trainer profile (1-to-1 with auth.users)
clients           — trainer's clients (trainer_id FK)
workout_entries   — workout logs (client_id FK, trainer_id FK)
```

Row Level Security ensures trainers can only access their own data.

---

## Build

```bash
npm run build    # production build → dist/
npm run preview  # preview production build locally
```

---

## Roadmap

See [`TASK.md`](TASK.md) for the full phased build plan including:
- Body measurements tracking
- Workout templates / programs
- Calendar view
- Personal Records (PR) tracking
- Native mobile app via Capacitor (iOS + Android)
