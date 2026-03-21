import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ShieldCheck, ShieldAlert, ArrowRightLeft, UserCog, ChevronRight } from "lucide-react";

const ROLE_LABELS = { trainer: "Trainer", admin: "Admin", super_admin: "Super Admin" };
const ROLE_COLORS = {
  trainer: "text-neutral-400 bg-neutral-800 border-neutral-700",
  admin: "text-blue-400 bg-blue-900/20 border-blue-700/40",
  super_admin: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
};

export default function AdminPage() {
  const { trainers, clients, loading, isAdmin, isSuperAdmin, transferClient, updateRole } = useAdmin();
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [transferringId, setTransferringId] = useState(null); // client id being transferred
  const [selectedTrainer, setSelectedTrainer] = useState({});  // { [clientId]: trainerId }
  const [working, setWorking] = useState(false);
  const [activeSection, setActiveSection] = useState("overview"); // overview | clients | trainers

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

  const clientsByTrainer = trainers.reduce((acc, t) => {
    acc[t.id] = clients.filter((c) => c.trainer_id === t.id);
    return acc;
  }, {});

  const totalActive = clients.filter((c) => c.is_active !== false).length;

  async function handleTransfer(clientId) {
    const newTrainerId = selectedTrainer[clientId];
    if (!newTrainerId) { toast.error("Select a trainer first."); return; }
    const client = clients.find((c) => c.id === clientId);
    if (newTrainerId === client?.trainer_id) { toast.error("Client is already assigned to this trainer."); return; }
    setWorking(true);
    try {
      await transferClient(clientId, newTrainerId);
      setTransferringId(null);
      setSelectedTrainer((prev) => { const n = { ...prev }; delete n[clientId]; return n; });
      toast.success("Client transferred. All history moved.");
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

      {/* Section tabs */}
      <div className="flex mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-fit gap-1">
        {["overview", "clients", "trainers"].map((s) => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${activeSection === s ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white"}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-28 rounded-xl bg-neutral-800/50 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <StatCard icon={<Users />} label="Total Trainers" value={trainers.length} color="text-blue-400" />
                <StatCard icon={<Users />} label="Total Clients" value={clients.length} color="text-white" />
                <StatCard icon={<Users />} label="Active Clients" value={totalActive} color="text-emerald-400" />
              </div>

              <Card className="card-style">
                <CardHeader className="pb-2"><CardTitle>Trainer Overview</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trainers.map((t) => {
                      const trainerClients = clientsByTrainer[t.id] || [];
                      const active = trainerClients.filter((c) => c.is_active !== false).length;
                      return (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-800/50 border border-neutral-800 gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-red-400">{(t.full_name || t.email || "?")[0].toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{t.full_name || "—"}</p>
                              <p className="text-xs text-neutral-500 truncate">{t.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[t.role]}`}>{ROLE_LABELS[t.role]}</span>
                            <span className="text-xs text-neutral-400">{trainerClients.length} clients ({active} active)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── CLIENTS ── */}
          {activeSection === "clients" && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-400">Click <strong className="text-white">Transfer</strong> on any client to reassign them. All workout history, measurements, goals, and check-ins move with them.</p>
              {trainers.map((trainer) => {
                const trainerClients = clientsByTrainer[trainer.id] || [];
                if (!trainerClients.length) return null;
                return (
                  <Card key={trainer.id} className="card-style">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{trainer.full_name || "Unknown Trainer"}</CardTitle>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[trainer.role]}`}>{ROLE_LABELS[trainer.role]}</span>
                        <span className="text-xs text-neutral-500 ml-auto">{trainerClients.length} client{trainerClients.length !== 1 ? "s" : ""}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {trainerClients.map((client) => {
                          const isTransferring = transferringId === client.id;
                          return (
                            <div key={client.id} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2 min-w-0">
                                  <button onClick={() => navigate(`/clients/${client.id}`)}
                                    className="font-medium text-white hover:text-red-400 transition-colors flex items-center gap-1 truncate">
                                    {client.name}
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
                                  </button>
                                  {client.is_active === false && (
                                    <span className="text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-700/30 px-1.5 py-0.5 rounded-full shrink-0">Inactive</span>
                                  )}
                                  {client.email && <span className="text-xs text-neutral-500 hidden sm:block truncate">{client.email}</span>}
                                </div>
                                <button
                                  onClick={() => setTransferringId(isTransferring ? null : client.id)}
                                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-3 py-1.5 bg-blue-900/20 border border-blue-700/40 rounded-lg transition-colors shrink-0">
                                  <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
                                </button>
                              </div>

                              {isTransferring && (
                                <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center gap-2 flex-wrap">
                                  <div className="flex-1 min-w-48">
                                    <Select
                                      value={selectedTrainer[client.id] || ""}
                                      onValueChange={(v) => setSelectedTrainer((prev) => ({ ...prev, [client.id]: v }))}>
                                      <SelectTrigger className="bg-neutral-800 border-neutral-700 h-9 text-sm">
                                        <SelectValue placeholder="Select new trainer…" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-neutral-900 border-neutral-700">
                                        {trainers.filter((t) => t.id !== trainer.id).map((t) => (
                                          <SelectItem key={t.id} value={t.id}>
                                            {t.full_name || t.id.slice(0, 8)} — {ROLE_LABELS[t.role]}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <button
                                    onClick={() => handleTransfer(client.id)}
                                    disabled={working || !selectedTrainer[client.id]}
                                    className="px-4 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                                    {working ? "Moving…" : "Confirm Transfer"}
                                  </button>
                                  <button onClick={() => setTransferringId(null)}
                                    className="px-3 py-2 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded-lg transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {clients.length === 0 && (
                <Card className="card-style"><CardContent className="py-12 text-center text-neutral-500">No clients in the system yet.</CardContent></Card>
              )}
            </div>
          )}

          {/* ── TRAINERS ── */}
          {activeSection === "trainers" && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-400">
                {isSuperAdmin
                  ? "As super admin you can promote or demote any trainer or admin."
                  : "As admin you can promote trainers to admin. Only super admin can demote admins."}
              </p>
              {trainers.map((t) => {
                const isSelf = t.id === profile?.id;
                const canChange = !isSelf && t.role !== "super_admin" && (isSuperAdmin || t.role === "trainer");
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-red-400">{(t.full_name || "?")[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white">{t.full_name || "—"}</p>
                          {isSelf && <span className="text-xs text-neutral-500">(you)</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[t.role]}`}>{ROLE_LABELS[t.role]}</span>
                        </div>
                        <p className="text-xs text-neutral-500">{clientsByTrainer[t.id]?.length || 0} clients</p>
                      </div>
                    </div>

                    {canChange && (
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-neutral-500 shrink-0" />
                        <Select
                          value={t.role}
                          onValueChange={(v) => handleRoleChange(t.id, v)}>
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
                    )}
                    {!canChange && !isSelf && (
                      <span className="text-xs text-neutral-600 italic">Protected</span>
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

function StatCard({ icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-red-600 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
