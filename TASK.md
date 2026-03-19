# AF_APP — Workout Tracker: Build Plan
> Senior dev audit & rebuild roadmap. Mark tasks ✅ as completed.

---

## CURRENT STATE (Audit)
- React 19 + Vite + Tailwind CSS + Recharts — PWA
- Single monolithic `App.jsx` (~500 lines) doing everything
- **localStorage only** — data dies if browser cache cleared, no cross-device sync
- No backend, no auth, no database
- No routing — single page only
- UI components exist (Button, Card, Input, Label, Select, Textarea) in `src/components/ui/`
- Features working: client add/delete, workout log, table, basic chart, CSV export, weight suggestion
- Features broken/missing: auth, real DB, routing, client detail pages, PDF export

---

## TECH DECISIONS

| Layer | Choice | Why |
|-------|--------|-----|
| Backend/DB | **Supabase** | PostgreSQL, built-in auth, free tier, no custom server needed |
| Auth | **Supabase Auth** | Email/password, JWT, built-in |
| Routing | **React Router v6** | Standard, already works with Vite |
| State | **React Context + hooks** | Lightweight, no Redux needed at this scale |
| Forms | Native controlled inputs | Already in codebase, keep it simple |
| PDF Export | **jsPDF + html2canvas** | Client-side, no server needed |

---

## PHASE 1 — Backend & Database (Supabase) 🔴

- [ ] **1.1** Create Supabase project (manual step — trainer must do this)
- [ ] **1.2** Write SQL schema migration file (`supabase/schema.sql`)
  - `profiles` table (trainer info, linked to auth.users)
  - `clients` table (trainer_id FK, name, email, phone, notes)
  - `workout_entries` table (client_id FK, date, exercise, muscle_group, sets, reps, weight, notes)
  - Row Level Security (RLS) policies — trainers only see their own data
- [ ] **1.3** Install Supabase JS client: `npm install @supabase/supabase-js`
- [ ] **1.4** Create `src/lib/supabase.js` — Supabase client config with env vars
- [ ] **1.5** Create `.env.example` with required env vars
- [ ] **1.6** Add `.env.local` to `.gitignore`

---

## PHASE 2 — Auth Layer 🔴

- [ ] **2.1** Create `src/context/AuthContext.jsx` — session state, login/logout methods
- [ ] **2.2** Create `src/pages/LoginPage.jsx` — email/password login form
- [ ] **2.3** Create `src/pages/RegisterPage.jsx` — trainer registration
- [ ] **2.4** Create `src/components/ProtectedRoute.jsx` — redirect to login if no session
- [ ] **2.5** Add auth routing in `App.jsx` (React Router setup)
- [ ] **2.6** Add "Forgot Password" flow (Supabase magic link)

---

## PHASE 3 — Routing & App Structure 🔴

- [ ] **3.1** Install React Router: `npm install react-router-dom`
- [ ] **3.2** Set up routes in `src/App.jsx`:
  - `/login` → LoginPage
  - `/register` → RegisterPage
  - `/` → DashboardPage (client list)
  - `/clients/:id` → ClientDetailPage
- [ ] **3.3** Create `src/pages/DashboardPage.jsx` — trainer home, list of clients with summary stats
- [ ] **3.4** Create `src/pages/ClientDetailPage.jsx` — full client view: workouts, charts, progress
- [ ] **3.5** Create `src/components/Layout.jsx` — shared layout with nav/header

---

## PHASE 4 — Data Layer (Hooks & API calls) 🔴

- [ ] **4.1** Create `src/hooks/useClients.js` — CRUD for clients (fetch, add, edit, delete)
- [ ] **4.2** Create `src/hooks/useWorkouts.js` — CRUD for workout entries
- [ ] **4.3** Migrate localStorage data util: one-time migration from old localStorage to Supabase on first login
- [ ] **4.4** Add loading states and error handling throughout

---

## PHASE 5 — UI Refactor 🟡

- [ ] **5.1** Extract `ClientBar` into its own component file
- [ ] **5.2** Extract `WorkoutForm` into its own component file
- [ ] **5.3** Extract `WorkoutTable` into its own component file
- [ ] **5.4** Extract `Dashboard` stats into its own component file
- [ ] **5.5** Extract `ProgressChart` into its own component file
- [ ] **5.6** Create `src/components/ClientCard.jsx` — client preview card for dashboard
- [ ] **5.7** Add empty states (no clients, no workouts UI)
- [ ] **5.8** Add confirmation dialogs before delete operations
- [ ] **5.9** Add toast/notification system for success/error feedback

---

## PHASE 6 — Feature Enhancements 🟡

- [ ] **6.1** Expand exercise library (from 12 → 40+ exercises, categorized)
- [ ] **6.2** Add exercise search/filter in workout form
- [ ] **6.3** Add body measurements tracking (weight, body fat %, measurements)
- [ ] **6.4** PDF export (jsPDF — "Phase 2" as noted in original code)
- [ ] **6.5** Client profile photo upload (Supabase Storage)
- [ ] **6.6** Add workout templates / programs (save a set of exercises as a template)
- [ ] **6.7** Calendar view to see workout history by date
- [ ] **6.8** Personal Records (PR) tracking — highlight new PRs automatically

---

## PHASE 7 — Polish & PWA 🟢

- [ ] **7.1** Update PWA manifest with correct app name
- [ ] **7.2** Add offline fallback page
- [ ] **7.3** Update README.md with real setup instructions
- [ ] **7.4** Add favicon/logo branding
- [ ] **7.5** Mobile UX pass — test all flows on small screen
- [ ] **7.6** Add basic analytics (how many workouts logged, trainer usage)

---

## COMPLETION TRACKER

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Backend | 🔴 Not started | Needs Supabase project first |
| Phase 2 — Auth | 🔴 Not started | Depends on Phase 1 |
| Phase 3 — Routing | 🔴 Not started | Can start in parallel |
| Phase 4 — Data Layer | 🔴 Not started | Depends on Phase 1 |
| Phase 5 — UI Refactor | 🟡 Partially done | UI components exist, need extraction |
| Phase 6 — Features | 🔴 Not started | |
| Phase 7 — Polish | 🟡 Partially done | PWA already configured |
| Phase 8 — Mobile (Capacitor) | 🔴 Not started | After web app is complete |

---

---

## PHASE 8 — Mobile App (Capacitor) 🔴

> Goal: Wrap the web app into a native iOS + Android app for App Store / Play Store deployment.
> **Capacitor** is the right tool — it takes the existing Vite/React build and wraps it natively. Zero rewrite needed.

- [ ] **8.1** Install Capacitor: `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios`
- [ ] **8.2** Init Capacitor: `npx cap init "AF_APP" "com.afapp.workouttracker"`
- [ ] **8.3** Configure `capacitor.config.ts` (webDir: "dist", server settings)
- [ ] **8.4** Add Android platform: `npx cap add android` — requires Android Studio
- [ ] **8.5** Add iOS platform: `npx cap add ios` — requires Xcode (Mac only)
- [ ] **8.6** Sync web build to native: `npm run build && npx cap sync`
- [ ] **8.7** Test in Android emulator: `npx cap open android`
- [ ] **8.8** Test in iOS simulator: `npx cap open ios`
- [ ] **8.9** Add native plugins as needed:
  - Push notifications: `@capacitor/push-notifications`
  - Camera for client photos: `@capacitor/camera`
  - Haptic feedback: `@capacitor/haptics`
- [ ] **8.10** Prepare app store assets (icons, splash screens, metadata)
- [ ] **8.11** Build signed APK/IPA for distribution

**Note:** PWA is already installable on mobile via "Add to Home Screen" and works offline today. Capacitor gives a proper native app store presence.

---

## NOTES
- Keep the dark red theme (#dc2626 red-600 accent) — it's the brand
- Weight is currently in lbs — confirm with trainer if kg needed
- Trainer may have multiple clients — RLS must ensure data isolation
- All existing localStorage data should be migrated on first Supabase login
- **Mobile target:** Capacitor wrapper around this web app (Phase 8) — no rewrite needed
