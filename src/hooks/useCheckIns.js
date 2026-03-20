import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function useCheckIns(clientId) {
  const { session } = useAuth();
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId || !session?.user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("client_checkins")
      .select("*")
      .eq("client_id", clientId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    setCheckIns(data || []);
    setLoading(false);
  }, [clientId, session]);

  useEffect(() => { fetch(); }, [fetch]);

  async function addCheckIn(record) {
    const { data, error } = await supabase
      .from("client_checkins")
      .insert({ ...record, client_id: clientId, trainer_id: session.user.id })
      .select().single();
    if (error) throw error;
    setCheckIns((prev) => [data, ...prev]);
    return data;
  }

  async function deleteCheckIn(id) {
    const { error } = await supabase.from("client_checkins").delete().eq("id", id);
    if (error) throw error;
    setCheckIns((prev) => prev.filter((c) => c.id !== id));
  }

  return { checkIns, loading, addCheckIn, deleteCheckIn };
}
