import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = loading
  const [profile, setProfile]   = useState(null);
  const [clientRecord, setClientRecord] = useState(null); // populated when role=client

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); setClientRecord(null); return; }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(async ({ data: prof }) => {
        setProfile(prof);
        if (prof?.role === "client" && prof?.client_id) {
          const { data: cl } = await supabase
            .from("clients")
            .select("*")
            .eq("id", prof.client_id)
            .single();
          setClientRecord(cl);
        }
      });
  }, [session]);

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email, password, fullName) {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  }

  async function signOut() { await supabase.auth.signOut(); }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  const isClient    = profile?.role === "client";
  const isTrainer   = profile?.role === "trainer";
  const isAdmin     = profile?.role === "admin" || profile?.role === "super_admin";
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <AuthContext.Provider value={{
      session, profile, clientRecord,
      isClient, isTrainer, isAdmin, isSuperAdmin,
      signIn, signUp, signOut, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
