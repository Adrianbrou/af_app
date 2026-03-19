import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function useMeasurements(clientId) {
  const { session } = useAuth();
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId || !session?.user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("client_id", clientId)
      .order("date", { ascending: false });
    setMeasurements(data || []);
    setLoading(false);
  }, [clientId, session]);

  useEffect(() => { fetch(); }, [fetch]);

  async function addMeasurement(record) {
    const { data, error } = await supabase
      .from("body_measurements")
      .insert({ ...record, client_id: clientId, trainer_id: session.user.id })
      .select()
      .single();
    if (error) throw error;
    setMeasurements((prev) => [data, ...prev]);
    return data;
  }

  async function deleteMeasurement(id) {
    const { error } = await supabase.from("body_measurements").delete().eq("id", id);
    if (error) throw error;
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  }

  return { measurements, loading, addMeasurement, deleteMeasurement };
}
