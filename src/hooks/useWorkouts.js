import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function useWorkouts(clientId) {
  const { session } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntries = useCallback(async () => {
    if (!clientId || !session?.user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("workout_entries")
      .select("*")
      .eq("client_id", clientId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setEntries(data);
    setLoading(false);
  }, [clientId, session]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function addEntry({ date, exercise, muscle_group, sets, reps, weight, notes = "" }) {
    const { data, error } = await supabase
      .from("workout_entries")
      .insert({
        client_id: clientId,
        trainer_id: session.user.id,
        date,
        exercise,
        muscle_group,
        sets,
        reps,
        weight,
        notes,
      })
      .select()
      .single();
    if (error) throw error;
    setEntries((prev) => [data, ...prev]);
    return data;
  }

  async function updateEntry(id, updates) {
    const { data, error } = await supabase
      .from("workout_entries").update(updates).eq("id", id).select().single();
    if (error) throw error;
    setEntries((prev) => prev.map((e) => (e.id === id ? data : e)));
    return data;
  }

  async function deleteEntry(id) {
    const { error } = await supabase.from("workout_entries").delete().eq("id", id);
    if (error) throw error;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return { entries, loading, error, addEntry, updateEntry, deleteEntry, refetch: fetchEntries };
}
