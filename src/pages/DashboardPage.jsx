import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, User, Trash2, ChevronRight, Users } from "lucide-react";

export default function DashboardPage() {
  const { clients, loading, addClient, deleteClient } = useClients();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setFormError("");
    try {
      await addClient({ name: name.trim(), email: email.trim() });
      setName("");
      setEmail("");
      setShowForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm("Delete this client and all their workout data?")) return;
    setDeletingId(id);
    try {
      await deleteClient(id);
    } catch (err) {
      alert("Failed to delete: " + err.message);
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
            {clients.length} client{clients.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="glow-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Add client form */}
      {showForm && (
        <Card className="card-style mb-6">
          <CardHeader className="pb-2">
            <CardTitle>New Client</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <Label className="text-neutral-300">Name *</Label>
                <Input
                  className="bg-neutral-800 border-neutral-700 mt-1"
                  placeholder="Client name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="flex-1">
                <Label className="text-neutral-300">Email (optional)</Label>
                <Input
                  type="email"
                  className="bg-neutral-800 border-neutral-700 mt-1"
                  placeholder="client@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="glow-btn" disabled={adding}>
                  {adding ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  className="bg-neutral-800 hover:bg-neutral-700"
                  onClick={() => { setShowForm(false); setFormError(""); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
            {formError && <p className="mt-2 text-sm text-red-400">{formError}</p>}
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-neutral-800/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && clients.length === 0 && (
        <Card className="card-style">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Users className="h-12 w-12 text-neutral-600" />
            <p className="text-neutral-400 text-center">
              No clients yet. Add your first client above to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Client grid */}
      {!loading && clients.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="card-style cursor-pointer group flex items-center justify-between p-4 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-600/20 border border-red-600/30 rounded-full p-2.5">
                  <User className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-white group-hover:text-red-400 transition-colors">
                    {client.name}
                  </p>
                  {client.email && (
                    <p className="text-xs text-neutral-400">{client.email}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Added {new Date(client.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleDelete(e, client.id)}
                  disabled={deletingId === client.id}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-red-500 hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronRight className="h-5 w-5 text-neutral-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
