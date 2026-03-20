import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function useGoals(clientId) {
  const { session } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId || !session?.user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("client_goals")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setGoals(data || []);
    setLoading(false);
  }, [clientId, session]);

  useEffect(() => { fetch(); }, [fetch]);

  async function addGoal(record) {
    const { data, error } = await supabase
      .from("client_goals")
      .insert({ ...record, client_id: clientId, trainer_id: session.user.id })
      .select().single();
    if (error) throw error;
    setGoals((prev) => [data, ...prev]);
    return data;
  }

  async function updateGoal(id, updates) {
    const { data, error } = await supabase
      .from("client_goals").update(updates).eq("id", id).select().single();
    if (error) throw error;
    setGoals((prev) => prev.map((g) => (g.id === id ? data : g)));
    return data;
  }

  async function deleteGoal(id) {
    const { error } = await supabase.from("client_goals").delete().eq("id", id);
    if (error) throw error;
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  return { goals, loading, addGoal, updateGoal, deleteGoal };
}
