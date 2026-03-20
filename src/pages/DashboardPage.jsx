import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/context/ToastContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, User, Trash2, ChevronRight, Users, Pencil, X, Check,
  AlertCircle, Activity,
} from "lucide-react";

const TRAINING_LEVELS = ["beginner", "intermediate", "advanced"];
const PRIMARY_GOALS = ["fat_loss", "muscle_gain", "performance", "rehab", "general"];
const GOAL_LABELS = { fat_loss: "Fat Loss", muscle_gain: "Muscle Gain", performance: "Performance", rehab: "Rehab", general: "General Fitness" };
const LEVEL_LABELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const { clients, loading, addClient, updateClient, deleteClient } = useClients();
  const toast = useToast();
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", notes: "", training_level: "", primary_goal: "", start_date: "" });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState("all"); // all | active | inactive

  // Activity stats — last_session_date comes from clients.last_session_date if we join,
  // but since we don't have the view yet just use created_at as fallback
  const activeCount = useMemo(() => clients.filter((c) => c.is_active !== false).length, [clients]);
  const inactiveClients = useMemo(() => clients.filter((c) => c.is_active === false), [clients]);

  const filteredClients = useMemo(() => {
    if (filter === "active") return clients.filter((c) => c.is_active !== false);
    if (filter === "inactive") return clients.filter((c) => c.is_active === false);
    return clients;
  }, [clients, filter]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setAdding(true);
    try {
      await addClient({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        notes: addForm.notes.trim(),
        training_level: addForm.training_level || null,
        primary_goal: addForm.primary_goal || null,
        start_date: addForm.start_date || null,
      });
      setAddForm({ name: "", email: "", phone: "", notes: "", training_level: "", primary_goal: "", start_date: "" });
      setShowAddForm(false);
      toast.success("Client added.");
    } catch (err) { toast.error(err.message); }
    finally { setAdding(false); }
  }

  function startEdit(e, client) {
    e.stopPropagation();
    setEditingId(client.id);
    setEditForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      notes: client.notes || "",
      training_level: client.training_level || "",
      primary_goal: client.primary_goal || "",
      start_date: client.start_date || "",
      is_active: client.is_active !== false,
    });
  }

  async function saveEdit(e, id) {
    e.stopPropagation();
    if (!editForm.name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      await updateClient(id, {
        ...editForm,
        training_level: editForm.training_level || null,
        primary_goal: editForm.primary_goal || null,
        start_date: editForm.start_date || null,
      });
      setEditingId(null);
      toast.success("Client updated.");
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm("Delete this client and ALL their data? This cannot be undone.")) return;
    setDeletingId(id);
    try { await deleteClient(id); toast.success("Client deleted."); }
    catch (err) { toast.error(err.message); }
    finally { setDeletingId(null); }
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Clients</h2>
          <p className="text-neutral-400 text-sm mt-0.5">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowAddForm((v) => !v)} className="glow-btn">
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* Stats bar */}
      {!loading && clients.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <button onClick={() => setFilter("all")} className={`rounded-xl border p-3 text-left transition-colors ${filter === "all" ? "border-red-600/60 bg-red-900/20" : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"}`}>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Total</p>
            <p className="text-xl font-bold text-white">{clients.length}</p>
          </button>
          <button onClick={() => setFilter("active")} className={`rounded-xl border p-3 text-left transition-colors ${filter === "active" ? "border-emerald-600/60 bg-emerald-900/20" : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"}`}>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Active</p>
            <p className="text-xl font-bold text-emerald-400">{activeCount}</p>
          </button>
          <button onClick={() => setFilter("inactive")} className={`rounded-xl border p-3 text-left transition-colors ${filter === "inactive" ? "border-yellow-600/60 bg-yellow-900/20" : "border-neutral-800 bg-neutral-950 hover:border-neutral-700"}`}>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Inactive</p>
            <p className="text-xl font-bold text-yellow-400">{inactiveClients.length}</p>
          </button>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <Card className="card-style mb-6">
          <CardHeader className="pb-2"><CardTitle>New Client</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-neutral-300">Name *</Label>
                <Input className="bg-neutral-800 border-neutral-700 mt-1" placeholder="Full name"
                  value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} autoFocus required />
              </div>
              <div>
                <Label className="text-neutral-300">Email</Label>
                <Input type="email" className="bg-neutral-800 border-neutral-700 mt-1" placeholder="client@email.com"
                  value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-neutral-300">Phone</Label>
                <Input className="bg-neutral-800 border-neutral-700 mt-1" placeholder="+1 (555) 000-0000"
                  value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-neutral-300">Start Date</Label>
                <Input type="date" className="bg-neutral-800 border-neutral-700 mt-1"
                  value={addForm.start_date} onChange={(e) => setAddForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-neutral-300">Training Level</Label>
                <Select value={addForm.training_level} onValueChange={(v) => setAddForm((f) => ({ ...f, training_level: v }))}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 mt-1"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-700">
                    {TRAINING_LEVELS.map((l) => <SelectItem key={l} value={l}>{LEVEL_LABELS[l]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-neutral-300">Primary Goal</Label>
                <Select value={addForm.primary_goal} onValueChange={(v) => setAddForm((f) => ({ ...f, primary_goal: v }))}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 mt-1"><SelectValue placeholder="Select goal" /></SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-700">
                    {PRIMARY_GOALS.map((g) => <SelectItem key={g} value={g}>{GOAL_LABELS[g]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-neutral-300">Notes</Label>
                <Input className="bg-neutral-800 border-neutral-700 mt-1" placeholder="Injuries, preferences, anything relevant"
                  value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" className="glow-btn" disabled={adding}>{adding ? "Saving…" : "Save Client"}</Button>
                <Button type="button" className="bg-neutral-800 hover:bg-neutral-700"
                  onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-32 rounded-xl bg-neutral-800/50 animate-pulse" />)}
        </div>
      )}

      {!loading && filteredClients.length === 0 && (
        <Card className="card-style">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-12 w-12 text-neutral-600" />
            <p className="text-neutral-400 text-center">
              {filter !== "all" ? "No clients in this filter." : "No clients yet. Add your first client above."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) =>
          editingId === client.id ? (
            <div key={client.id} className="card-style rounded-xl p-4 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Editing — {client.name}</p>
              <Input className="bg-neutral-800 border-neutral-700 text-sm" placeholder="Name *"
                value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              <Input className="bg-neutral-800 border-neutral-700 text-sm" placeholder="Email"
                value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
              <Input className="bg-neutral-800 border-neutral-700 text-sm" placeholder="Phone"
                value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              <Select value={editForm.training_level} onValueChange={(v) => setEditForm((f) => ({ ...f, training_level: v }))}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-sm"><SelectValue placeholder="Training level" /></SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {TRAINING_LEVELS.map((l) => <SelectItem key={l} value={l}>{LEVEL_LABELS[l]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={editForm.primary_goal} onValueChange={(v) => setEditForm((f) => ({ ...f, primary_goal: v }))}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-sm"><SelectValue placeholder="Primary goal" /></SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {PRIMARY_GOALS.map((g) => <SelectItem key={g} value={g}>{GOAL_LABELS[g]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="bg-neutral-800 border-neutral-700 text-sm" placeholder="Notes"
                value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" id={`active-${client.id}`} checked={editForm.is_active}
                  onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="accent-red-600" />
                <label htmlFor={`active-${client.id}`} className="text-xs text-neutral-300">Active client</label>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={(e) => saveEdit(e, client.id)} disabled={saving}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-3 py-1.5 bg-emerald-900/20 border border-emerald-700/40 rounded-lg">
                  <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white px-3 py-1.5 bg-neutral-800 rounded-lg">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={client.id} onClick={() => navigate(`/clients/${client.id}`)}
              className="card-style cursor-pointer group flex items-center justify-between p-4 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`rounded-full p-2.5 shrink-0 border ${client.is_active === false ? "bg-neutral-800 border-neutral-700" : "bg-red-600/20 border-red-600/30"}`}>
                  <User className={`h-5 w-5 ${client.is_active === false ? "text-neutral-500" : "text-red-500"}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white group-hover:text-red-400 transition-colors truncate">{client.name}</p>
                    {client.is_active === false && (
                      <span className="text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-700/30 px-1.5 py-0.5 rounded-full shrink-0">Inactive</span>
                    )}
                  </div>
                  {client.email && <p className="text-xs text-neutral-400 truncate">{client.email}</p>}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {client.training_level && (
                      <span className="text-xs text-neutral-500">{LEVEL_LABELS[client.training_level]}</span>
                    )}
                    {client.primary_goal && (
                      <span className="text-xs text-red-500/80">{GOAL_LABELS[client.primary_goal]}</span>
                    )}
                  </div>
                  {client.start_date && (
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Client since {new Date(client.start_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                <button onClick={(e) => startEdit(e, client)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-blue-400 hover:bg-blue-900/20 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={(e) => handleDelete(e, client.id)} disabled={deletingId === client.id}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-red-500 hover:bg-red-900/20 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronRight className="h-5 w-5 text-neutral-600" />
              </div>
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
