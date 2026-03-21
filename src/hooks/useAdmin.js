import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function useAdmin() {
  const { session, profile } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isSuperAdmin = profile?.role === "super_admin";

  const fetchAll = useCallback(async () => {
    if (!session?.user || !isAdmin) { setLoading(false); return; }
    setLoading(true);
    const [{ data: profilesData }, { data: clientsData }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("clients").select("*").order("name"),
    ]);
    setTrainers(profilesData || []);
    setClients(clientsData || []);
    setLoading(false);
  }, [session, isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function transferClient(clientId, newTrainerId) {
    const { error } = await supabase.rpc("transfer_client", {
      p_client_id: clientId,
      p_new_trainer_id: newTrainerId,
    });
    if (error) throw error;
    await fetchAll();
  }

  async function updateRole(targetProfileId, newRole) {
    // admins can promote trainers to admin; only super_admin can demote admins
    const target = trainers.find((t) => t.id === targetProfileId);
    if (!target) throw new Error("Trainer not found");
    if (target.role === "super_admin") throw new Error("Cannot change super admin role");
    if (target.role === "admin" && !isSuperAdmin) throw new Error("Only super admin can demote admins");

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", targetProfileId);
    if (error) throw error;
    setTrainers((prev) => prev.map((t) => t.id === targetProfileId ? { ...t, role: newRole } : t));
  }

  return { trainers, clients, loading, isAdmin, isSuperAdmin, transferClient, updateRole, refresh: fetchAll };
}
