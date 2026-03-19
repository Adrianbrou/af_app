# AF_APP — Workout Tracker: Build Plan
> Senior dev audit & rebuild roadmap. Mark tasks ✅ as completed.

---

## TECH DECISIONS

| Layer | Choice | Why |
|-------|--------|-----|
| Backend/DB | **Supabase** | PostgreSQL, built-in auth, free tier, no custom server needed |
| Auth | **Supabase Auth** | Email/password, JWT, built-in |
| Routing | **React Router v6** | Standard, works with Vite |
| State | **React Context + hooks** | Lightweight, no Redux needed at this scale |
| PDF Export | **jsPDF + html2canvas** | Client-side, no server needed |
| Mobile | **Capacitor** | Wraps existing build, no rewrite |

---

## PHASE 1 — Backend & Database ✅

- ✅ **1.1** Supabase project setup (manual — trainer creates the project)
- ✅ **1.2** `supabase/schema.sql` — profiles, clients, workout_entries + RLS
- ✅ **1.3** `@supabase/supabase-js` installed
- ✅ **1.4** `src/lib/supabase.js` — Supabase client
- ✅ **1.5** `.env.example` with required env vars
- ✅ **1.6** `.env.local` in `.gitignore`

---

## PHASE 2 — Auth Layer ✅

- ✅ **2.1** `src/context/AuthContext.jsx` — session, signIn, signUp, signOut, resetPassword
- ✅ **2.2** `src/pages/LoginPage.jsx` — login + register + forgot password (single page)
- ✅ **2.4** `src/components/ProtectedRoute.jsx` — redirects unauthenticated users
- ✅ **2.5** Auth routing in `App.jsx`

---

## PHASE 3 — Routing & App Structure ✅

- ✅ **3.1** `react-router-dom` installed
- ✅ **3.2** Routes: `/login`, `/`, `/clients/:id`
- ✅ **3.3** `src/pages/DashboardPage.jsx` — client list with add/delete
- ✅ **3.4** `src/pages/ClientDetailPage.jsx` — workout log, chart, stats, export
- ✅ **3.5** `src/components/Layout.jsx` — shared header/nav with sign out

---

## PHASE 4 — Data Layer ✅

- ✅ **4.1** `src/hooks/useClients.js` — full CRUD (fetch, add, update, delete)
- ✅ **4.2** `src/hooks/useWorkouts.js` — full CRUD
- ✅ **4.4** Loading states and error handling in all pages

---

## PHASE 5 — UI & Features 🟡

- ✅ **5.1–5.5** Components extracted into pages (WorkoutForm, WorkoutTable, Chart, Dashboard in ClientDetailPage)
- ✅ **5.7** Empty states (no clients, no entries)
- ✅ **5.8** Confirmation dialogs before deletes
- [ ] **5.9** Toast/notification system — replace `window.alert` with proper toasts

---

## PHASE 6 — Feature Enhancements 🟡

- ✅ **6.1** Exercise library expanded: 60+ exercises organized by muscle group
- ✅ **6.4** PDF export — jsPDF + html2canvas
- [ ] **6.2** Exercise search/filter in workout form
- [ ] **6.3** Body measurements tracking (weight, body fat %, chest, waist, hips)
- [ ] **6.5** Client edit — update name, email, phone, notes
- [ ] **6.8** Personal Records (PR) tracking — auto-badge new PRs in workout table

---

## PHASE 7 — Polish 🟡

- ✅ **7.3** README updated with real setup and docs
- [ ] **7.1** PWA manifest — verify name, theme, icons
- [ ] **7.5** Mobile UX pass

---

## PHASE 8 — Mobile App (Capacitor) 🔴

> Wrap the web app into native iOS + Android. No rewrite needed.

- [ ] **8.1** Install Capacitor: `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios`
- [ ] **8.2** Init: `npx cap init "AF_APP" "com.afapp.workouttracker"`
- [ ] **8.3** Configure `capacitor.config.ts` (webDir: dist)
- [ ] **8.4** Add Android: `npx cap add android` (needs Android Studio)
- [ ] **8.5** Add iOS: `npx cap add ios` (needs Xcode, Mac only)
- [ ] **8.6** Sync: `npm run build && npx cap sync`
- [ ] **8.7** Test Android: `npx cap open android`
- [ ] **8.8** Test iOS: `npx cap open ios`
- [ ] **8.9** Native plugins: push notifications, camera, haptics
- [ ] **8.10** App store assets (icons, splash screens)
- [ ] **8.11** Signed APK/IPA for release

---

## COMPLETION TRACKER

| Phase | Status |
|-------|--------|
| Phase 1 — Backend | ✅ Done |
| Phase 2 — Auth | ✅ Done |
| Phase 3 — Routing | ✅ Done |
| Phase 4 — Data Layer | ✅ Done |
| Phase 5 — UI Refactor | 🟡 In progress |
| Phase 6 — Features | 🟡 In progress |
| Phase 7 — Polish | 🟡 In progress |
| Phase 8 — Mobile (Capacitor) | 🔴 Not started |

---

## NOTES
- Dark red theme (#dc2626) — keep it throughout
- Weight in lbs — confirm with trainer if kg needed
- RLS ensures trainers only see their own data
- Mobile: Capacitor wrapper (Phase 8), PWA "Add to Home Screen" works today
