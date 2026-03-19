import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import { supabaseReady } from "@/lib/supabase";

// Shown when .env.local is missing — dev/setup only
function SetupScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-red-600/40 bg-neutral-900 p-8 text-center space-y-4">
        <div className="text-4xl font-extrabold"><span className="text-red-600">AF</span>_APP</div>
        <h2 className="text-white text-lg font-semibold">Supabase not configured</h2>
        <p className="text-neutral-400 text-sm">
          Create a <code className="text-red-400 bg-neutral-800 px-1 rounded">.env.local</code> file
          in the project root with your Supabase credentials:
        </p>
        <pre className="text-left text-xs bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-emerald-400 overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="text-neutral-500 text-xs">
          Get these from your Supabase project →{" "}
          <span className="text-neutral-300">Settings → API</span>
        </p>
        <p className="text-neutral-500 text-xs">
          Then restart the dev server: <code className="text-neutral-300">npm run dev</code>
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!supabaseReady) return <SetupScreen />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <ProtectedRoute>
                  <ClientDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
