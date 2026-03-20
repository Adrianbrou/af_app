import React, { useState } from "react";
import { useTemplates } from "@/hooks/useTemplates";
import { useToast } from "@/context/ToastContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Dumbbell, ChevronDown, ChevronUp, X, Search } from "lucide-react";
import { MUSCLE_GROUPS, EXERCISES_BY_MUSCLE, ALL_EXERCISES } from "@/constants/exercises";

export default function TemplatesPage() {
  const { templates, loading, addTemplate, deleteTemplate, addExerciseToTemplate, removeExerciseFromTemplate } = useTemplates();
  const toast = useToast();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const [expanded, setExpanded] = useState({});
  const [exForm, setExForm] = useState({});      // per-template exercise add form
  const [exSearch, setExSearch] = useState({});  // per-template exercise search

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await addTemplate({ name: newName.trim(), description: newDesc.trim(), exercises: [] });
      setNewName(""); setNewDesc(""); setShowNew(false);
      toast.success("Template created.");
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try { await deleteTemplate(id); toast.success("Template deleted."); }
    catch (err) { toast.error(err.message); }
  }

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    if (!exForm[id]) {
      setExForm((prev) => ({ ...prev, [id]: { exercise: "Bench Press", muscle_group: "Chest", sets: 3, reps_target: "10", weight_target: "", notes: "" } }));
    }
  }

  function updateExForm(id, k, v) {
    setExForm((prev) => ({
      ...prev,
      [id]: k === "muscle_group"
        ? { ...prev[id], muscle_group: v, exercise: EXERCISES_BY_MUSCLE[v]?.[0] || "" }
        : { ...prev[id], [k]: v },
    }));
  }

  async function handleAddExercise(templateId) {
    const f = exForm[templateId];
    if (!f?.exercise) return;
    try {
      await addExerciseToTemplate(templateId, {
        exercise: f.exercise, muscle_group: f.muscle_group,
        sets: Number(f.sets), reps_target: f.reps_target,
        weight_target: f.weight_target ? Number(f.weight_target) : null,
        notes: f.notes,
      });
      toast.success("Exercise added.");
    } catch (err) { toast.error(err.message); }
  }

  async function handleRemoveExercise(exId) {
    try { await removeExerciseFromTemplate(exId); }
    catch (err) { toast.error(err.message); }
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Workout Templates</h2>
          <p className="text-neutral-400 text-sm mt-0.5">
            Save reusable routines — apply them to any client session
          </p>
        </div>
        <Button onClick={() => setShowNew((v) => !v)} className="glow-btn">
          <Plus className="mr-2 h-4 w-4" /> New Template
        </Button>
      </div>

      {/* New template form */}
      {showNew && (
        <Card className="card-style mb-6">
          <CardHeader className="pb-2"><CardTitle>New Template</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <Label className="text-neutral-300">Name *</Label>
                <Input className="bg-neutral-800 border-neutral-700 mt-1" placeholder='e.g. "Push Day A"'
                  value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus required />
              </div>
              <div className="flex-1">
                <Label className="text-neutral-300">Description</Label>
                <Input className="bg-neutral-800 border-neutral-700 mt-1" placeholder="Optional notes"
                  value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="glow-btn" disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
                <Button type="button" className="bg-neutral-800 hover:bg-neutral-700" onClick={() => setShowNew(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-neutral-800/50 animate-pulse" />)}
        </div>
      )}

      {!loading && templates.length === 0 && (
        <Card className="card-style">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Dumbbell className="h-12 w-12 text-neutral-600" />
            <p className="text-neutral-400 text-center">No templates yet. Create your first one above.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {templates.map((tmpl) => {
          const isOpen = expanded[tmpl.id];
          const exercises = tmpl.template_exercises || [];
          const f = exForm[tmpl.id] || { exercise: "Bench Press", muscle_group: "Chest", sets: 3, reps_target: "10", weight_target: "", notes: "" };
          const search = exSearch[tmpl.id] || "";
          const exerciseOptions = search
            ? ALL_EXERCISES.filter((ex) => ex.toLowerCase().includes(search.toLowerCase()))
            : EXERCISES_BY_MUSCLE[f.muscle_group] || ALL_EXERCISES;

          return (
            <Card key={tmpl.id} className="card-style">
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => toggleExpand(tmpl.id)}>
                <div className="flex items-center gap-3">
                  <Dumbbell className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-white">{tmpl.name}</p>
                    <p className="text-xs text-neutral-500">{exercises.length} exercise{exercises.length !== 1 ? "s" : ""}{tmpl.description ? ` · ${tmpl.description}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(tmpl.id, tmpl.name); }}
                    className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
                </div>
              </div>

              {/* Expanded content */}
              {isOpen && (
                <CardContent className="border-t border-neutral-800 pt-4 space-y-4">
                  {/* Exercise list */}
                  {exercises.length === 0 ? (
                    <p className="text-neutral-500 text-sm text-center py-2">No exercises yet. Add one below.</p>
                  ) : (
                    <div className="space-y-1">
                      {[...exercises].sort((a, b) => a.order_index - b.order_index).map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-800 group">
                          <div className="text-sm">
                            <span className="text-white font-medium">{ex.exercise}</span>
                            <span className="text-neutral-500 ml-2">{ex.sets} × {ex.reps_target} reps</span>
                            {ex.weight_target && <span className="text-neutral-500 ml-1">@ {ex.weight_target}lb</span>}
                            <span className="text-neutral-600 ml-2 text-xs">{ex.muscle_group}</span>
                          </div>
                          <button onClick={() => handleRemoveExercise(ex.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-600 hover:text-red-500 rounded transition-all">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add exercise form */}
                  <div className="border border-neutral-700/50 rounded-xl p-3 space-y-3 bg-neutral-900/40">
                    <p className="text-xs text-neutral-400 uppercase tracking-wide">Add Exercise</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-neutral-400 text-xs">Muscle Group</Label>
                        <Select value={f.muscle_group} onValueChange={(v) => updateExForm(tmpl.id, "muscle_group", v)}>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700 mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-neutral-900 border-neutral-700">
                            {MUSCLE_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-neutral-400 text-xs">Sets</Label>
                        <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1 h-8 text-sm"
                          value={f.sets} min={1} onChange={(e) => updateExForm(tmpl.id, "sets", e.target.value)} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-neutral-400 text-xs">Exercise</Label>
                        <div className="relative mt-1 mb-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-500" />
                          <input className="w-full pl-7 pr-3 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-600"
                            placeholder="Search…" value={search}
                            onChange={(e) => setExSearch((prev) => ({ ...prev, [tmpl.id]: e.target.value }))} />
                        </div>
                        <Select value={f.exercise} onValueChange={(v) => updateExForm(tmpl.id, "exercise", v)}>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700 h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-neutral-900 border-neutral-700 max-h-44">
                            {exerciseOptions.map((ex) => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-neutral-400 text-xs">Reps Target</Label>
                        <Input className="bg-neutral-800 border-neutral-700 mt-1 h-8 text-sm"
                          placeholder="10 or 8-12" value={f.reps_target}
                          onChange={(e) => updateExForm(tmpl.id, "reps_target", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-neutral-400 text-xs">Weight Target (lb)</Label>
                        <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1 h-8 text-sm"
                          placeholder="Optional" value={f.weight_target}
                          onChange={(e) => updateExForm(tmpl.id, "weight_target", e.target.value)} />
                      </div>
                    </div>
                    <Button onClick={() => handleAddExercise(tmpl.id)} className="glow-btn h-8 text-sm">
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Exercise
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
