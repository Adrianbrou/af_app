import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/context/ToastContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, User, Trash2, ChevronRight, Users, Pencil, X, Check } from "lucide-react";

export default function DashboardPage() {
  const { clients, loading, addClient, updateClient, deleteClient } = useClients();
  const toast = useToast();
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setAdding(true);
    try {
      await addClient({ name: addForm.name.trim(), email: addForm.email.trim(), phone: addForm.phone.trim(), notes: addForm.notes.trim() });
      setAddForm({ name: "", email: "", phone: "", notes: "" });
      setShowAddForm(false);
      toast.success("Client added.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  }

  function startEdit(e, client) {
    e.stopPropagation();
    setEditingId(client.id);
    setEditForm({ name: client.name, email: client.email || "", phone: client.phone || "", notes: client.notes || "" });
  }

  async function saveEdit(e, id) {
    e.stopPropagation();
    if (!editForm.name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      await updateClient(id, editForm);
      setEditingId(null);
      toast.success("Client updated.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm("Delete this client and ALL their workout data? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteClient(id);
      toast.success("Client deleted.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Clients</h2>
          <p className="text-neutral-400 text-sm mt-0.5">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowAddForm((v) => !v)} className="glow-btn">
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card className="card-style mb-6">
          <CardHeader className="pb-2">
            <CardTitle>New Client</CardTitle>
          </CardHeader>
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
                <Label className="text-neutral-300">Notes</Label>
                <Input className="bg-neutral-800 border-neutral-700 mt-1" placeholder="Goals, injuries, etc."
                  value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" className="glow-btn" disabled={adding}>{adding ? "Saving…" : "Save Client"}</Button>
                <Button type="button" className="bg-neutral-800 hover:bg-neutral-700"
                  onClick={() => { setShowAddForm(false); setAddForm({ name: "", email: "", phone: "", notes: "" }); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-neutral-800/50 animate-pulse" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && clients.length === 0 && (
        <Card className="card-style">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-12 w-12 text-neutral-600" />
            <p className="text-neutral-400 text-center">No clients yet. Add your first client above.</p>
          </CardContent>
        </Card>
      )}

      {/* Client grid */}
      {!loading && clients.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) =>
            editingId === client.id ? (
              /* Inline edit card */
              <div key={client.id} className="card-style rounded-xl p-4 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Editing</p>
                <Input className="bg-neutral-800 border-neutral-700 text-sm" placeholder="Name *"
                  value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                <Input className="bg-neutral-800 border-neutral-700 text-sm" placeholder="Email"
                  value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                <Input className="bg-neutral-800 border-neutral-700 text-sm" placeholder="Phone"
                  value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                <Input className="bg-neutral-800 border-neutral-700 text-sm" placeholder="Notes"
                  value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
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
              /* Normal client card */
              <div key={client.id} onClick={() => navigate(`/clients/${client.id}`)}
                className="card-style cursor-pointer group flex items-center justify-between p-4 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-red-600/20 border border-red-600/30 rounded-full p-2.5 shrink-0">
                    <User className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white group-hover:text-red-400 transition-colors truncate">
                      {client.name}
                    </p>
                    {client.email && <p className="text-xs text-neutral-400 truncate">{client.email}</p>}
                    {client.phone && <p className="text-xs text-neutral-500 truncate">{client.phone}</p>}
                    {client.notes && <p className="text-xs text-neutral-600 truncate mt-0.5">{client.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
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
      )}
    </Layout>
  );
}
