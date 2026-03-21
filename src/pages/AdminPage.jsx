import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, ShieldCheck, ShieldAlert, ArrowRightLeft,
  UserCog, ChevronRight, User, Check, X,
} from "lucide-react";

const ROLE_LABELS  = { trainer: "Trainer", admin: "Admin", super_admin: "Super Admin" };
const ROLE_COLORS  = {
  trainer:     "text-neutral-400 bg-neutral-800 border-neutral-700",
  admin:       "text-blue-400 bg-blue-900/20 border-blue-700/40",
  super_admin: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
};

export default function AdminPage() {
  const { trainers, clients, loading, isAdmin, isSuperAdmin, transferClient, updateRole, refresh } = useAdmin();
  const { profile } = useAuth();
  const toast  = useToast();
  const navigate = useNavigate();

  const [tab, setTab]                     = useState("clients");   // clients | trainers
  const [transferClientId, setTransferClientId] = useState(null);
  const [targetTrainerId, setTargetTrainerId]   = useState("");
  const [working, setWorking]             = useState(false);

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <ShieldAlert className="h-12 w-12 text-red-600" />
          <p className="text-neutral-400">Access denied. Admin only.</p>
        </div>
      </Layout>
    );
  }

  // Group clients under their trainer
  const clientsByTrainer = trainers.reduce((acc, t) => {
    acc[t.id] = clients.filter((c) => c.trainer_id === t.id);
    return acc;
  }, {});

  const totalActive = clients.filter((c) => c.is_active !== false).length;

  function openTransfer(clientId) {
    setTransferClientId(clientId);
    setTargetTrainerId("");
  }

  function cancelTransfer() {
    setTransferClientId(null);
    setTargetTrainerId("");
  }

  async function confirmTransfer() {
    if (!targetTrainerId) { toast.error("Select a trainer first."); return; }
    const client = clients.find((c) => c.id === transferClientId);
    if (targetTrainerId === client?.trainer_id) { toast.error("Already assigned to that trainer."); return; }
    setWorking(true);
    try {
      await transferClient(transferClientId, targetTrainerId);
      cancelTransfer();
      toast.success("Client transferred — all history moved.");
    } catch (err) { toast.error(err.message); }
    finally { setWorking(false); }
  }

  async function handleRoleChange(trainerId, newRole) {
    setWorking(true);
    try {
      await updateRole(trainerId, newRole);
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}.`);
    } catch (err) { toast.error(err.message); }
    finally { setWorking(false); }
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="h-6 w-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[profile?.role]}`}>
            {ROLE_LABELS[profile?.role]}
          </span>
        </div>
        <p className="text-neutral-400 text-sm">Manage trainers, reassign clients, control roles.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Trainers</p>
          <p className="text-2xl font-bold text-white">{trainers.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Total Clients</p>
          <p className="text-2xl font-bold text-white">{clients.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{totalActive}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-fit gap-1">
        {["clients", "trainers"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2].map((i) => <div key={i} className="h-40 rounded-xl bg-neutral-800/50 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* ── CLIENTS TAB ── */}
          {tab === "clients" && (
            <div className="space-y-5">
              {trainers.map((trainer) => {
                const trainerClients = clientsByTrainer[trainer.id] || [];
                return (
                  <div key={trainer.id} className="rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
                    {/* Trainer header */}
                    <div className="flex items-center gap-3 px-5 py-4 bg-neutral-800/60 border-b border-neutral-800">
                      <div className="h-10 w-10 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-red-400">
                          {(trainer.full_name || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white">{trainer.full_name || "—"}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[trainer.role]}`}>
                            {ROLE_LABELS[trainer.role]}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {trainerClients.length} client{trainerClients.length !== 1 ? "s" : ""}
                          {" · "}
                          {trainerClients.filter((c) => c.is_active !== false).length} active
                        </p>
                      </div>
                    </div>

                    {/* Client list */}
                    {trainerClients.length === 0 ? (
                      <p className="text-neutral-600 text-sm text-center py-6">No clients assigned.</p>
                    ) : (
                      <div className="divide-y divide-neutral-800/60">
                        {trainerClients.map((client) => {
                          const isTransferring = transferClientId === client.id;
                          return (
                            <div key={client.id}>
                              {/* Client row */}
                              <div className="flex items-center justify-between px-5 py-3 gap-3 flex-wrap hover:bg-neutral-800/20 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <User className="h-4 w-4 text-neutral-600 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => navigate(`/clients/${client.id}`)}
                                        className="font-medium text-white hover:text-red-400 transition-colors flex items-center gap-1">
                                        {client.name}
                                        <ChevronRight className="h-3.5 w-3.5 text-neutral-600" />
                                      </button>
                                      {client.is_active === false && (
                                        <span className="text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-700/30 px-1.5 py-0.5 rounded-full">
                                          Inactive
                                        </span>
                                      )}
                                    </div>
                                    {client.email && (
                                      <p className="text-xs text-neutral-500 truncate">{client.email}</p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={() => isTransferring ? cancelTransfer() : openTransfer(client.id)}
                                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
                                    isTransferring
                                      ? "text-neutral-400 bg-neutral-800 border-neutral-700"
                                      : "text-blue-400 bg-blue-900/20 border-blue-700/40 hover:bg-blue-900/40"
                                  }`}>
                                  {isTransferring ? <X className="h-3.5 w-3.5" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
                                  {isTransferring ? "Cancel" : "Transfer"}
                                </button>
                              </div>

                              {/* Transfer panel */}
                              {isTransferring && (
                                <div className="px-5 py-4 bg-blue-900/10 border-t border-blue-800/30 flex items-center gap-3 flex-wrap">
                                  <p className="text-xs text-blue-300 shrink-0">Move <strong>{client.name}</strong> to:</p>
                                  <div className="flex-1 min-w-48">
                                    <Select value={targetTrainerId} onValueChange={setTargetTrainerId}>
                                      <SelectTrigger className="bg-neutral-800 border-neutral-700 h-9 text-sm">
                                        <SelectValue placeholder="Select trainer…" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-neutral-900 border-neutral-700">
                                        {trainers
                                          .filter((t) => t.id !== trainer.id)
                                          .map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                              {t.full_name || "Unknown"} — {ROLE_LABELS[t.role]}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <button
                                    onClick={confirmTransfer}
                                    disabled={working || !targetTrainerId}
                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors shrink-0">
                                    <Check className="h-3.5 w-3.5" />
                                    {working ? "Moving…" : "Confirm"}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {clients.length === 0 && (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 py-16 text-center text-neutral-500">
                  No clients in the system yet.
                </div>
              )}
            </div>
          )}

          {/* ── TRAINERS TAB ── */}
          {tab === "trainers" && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-400 mb-4">
                {isSuperAdmin
                  ? "As super admin you can promote or demote any trainer or admin."
                  : "As admin you can promote trainers to admin. Only super admin can demote admins."}
              </p>
              {trainers.map((t) => {
                const isSelf     = t.id === profile?.id;
                const canChange  = !isSelf && t.role !== "super_admin" && (isSuperAdmin || t.role === "trainer");
                const count      = clientsByTrainer[t.id]?.length || 0;
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-red-400">
                          {(t.full_name || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white">{t.full_name || "—"}</p>
                          {isSelf && <span className="text-xs text-neutral-500">(you)</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[t.role]}`}>
                            {ROLE_LABELS[t.role]}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">{count} client{count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    {canChange ? (
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-neutral-500 shrink-0" />
                        <Select value={t.role} onValueChange={(v) => handleRoleChange(t.id, v)}>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700 h-8 text-xs w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-900 border-neutral-700">
                            <SelectItem value="trainer">Trainer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      !isSelf && <span className="text-xs text-neutral-600 italic">Protected</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
