import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function useClients() {
  const { session } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClients = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setClients(data);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  async function addClient({ name, email = "", phone = "", notes = "" }) {
    const { data, error } = await supabase
      .from("clients")
      .insert({ trainer_id: session.user.id, name, email, phone, notes })
      .select()
      .single();
    if (error) throw error;
    setClients((prev) => [data, ...prev]);
    return data;
  }

  async function updateClient(id, updates) {
    const { data, error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    setClients((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  }

  async function deleteClient(id) {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  return { clients, loading, error, addClient, updateClient, deleteClient, refetch: fetchClients };
}
