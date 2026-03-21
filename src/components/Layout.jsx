import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { LogOut, Dumbbell, Users, LayoutTemplate, ShieldCheck, Bell, Trophy } from "lucide-react";

function PRBell({ session }) {
  const [notifs,   setNotifs]   = useState([]);
  const [open,     setOpen]     = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!session?.user) return;
    supabase.from("pr_notifications")
      .select("*").eq("trainer_id", session.user.id)
      .eq("read", false)
      .order("logged_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifs(data || []));
  }, [session]);

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markAllRead() {
    if (!notifs.length) return;
    await supabase.from("pr_notifications")
      .update({ read: true })
      .eq("trainer_id", session.user.id)
      .eq("read", false);
    setNotifs([]);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-300 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {notifs.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {notifs.length > 9 ? "9+" : notifs.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-xl border border-neutral-700 bg-neutral-900 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" /> PR Notifications
            </p>
            {notifs.length > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-neutral-400 hover:text-white">
                Mark all read
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-6">No new PRs.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-neutral-800">
              {notifs.map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <p className="text-sm text-white font-medium">{n.client_name}</p>
                  <p className="text-xs text-yellow-400 flex items-center gap-1 mt-0.5">
                    <Trophy className="h-3 w-3" />
                    New PR — {n.exercise}: <strong>{n.new_weight} lbs</strong>
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {new Date(n.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { profile, session, signOut, isClient, clientRecord } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  // ── Client view — simplified header ──
  if (isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-neutral-900 to-red-950 text-white font-sans">
        <header className="sticky top-0 z-20 border-b border-red-600/40 bg-black/80 backdrop-blur-md shadow-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-red-600" />
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-red-600">AF</span>_APP
              </span>
            </div>
            <div className="flex items-center gap-3">
              {clientRecord?.name && (
                <span className="text-xs text-neutral-400 hidden sm:block">{clientRecord.name}</span>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-neutral-300 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-800"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Sign Out</span>
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      </div>
    );
  }

  // ── Trainer / Admin view ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-900 to-red-950 text-white font-sans">
      <header className="sticky top-0 z-20 border-b border-red-600/40 bg-black/80 backdrop-blur-md shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-red-600" />
            <span className="text-2xl font-extrabold tracking-tight">
              <span className="text-red-600">AF</span>_APP
            </span>
            <span className="text-neutral-400 text-xs font-light hidden sm:block">
              Workout Tracker
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-neutral-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-800"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:block">Clients</span>
            </Link>
            <Link
              to="/templates"
              className="flex items-center gap-1.5 text-sm text-neutral-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-800"
            >
              <LayoutTemplate className="h-4 w-4" />
              <span className="hidden sm:block">Templates</span>
            </Link>

            {(profile?.role === "admin" || profile?.role === "super_admin") && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-sm text-yellow-400 hover:text-yellow-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-yellow-900/20 border border-yellow-700/30"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:block">Admin</span>
              </Link>
            )}

            <PRBell session={session} />

            {profile?.full_name && (
              <span className="text-xs text-neutral-400 hidden sm:block">
                {profile.full_name}
              </span>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-neutral-300 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-800"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
