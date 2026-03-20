import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Dumbbell, Users, LayoutTemplate } from "lucide-react";

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

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

            {profile?.full_name && (
              <span className="text-xs text-neutral-400 hidden sm:block">
                {profile.full_name}
              </span>
            )}

            <button
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
