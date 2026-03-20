import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useClients } from "@/hooks/useClients";
import { useMeasurements } from "@/hooks/useMeasurements";
import { useGoals } from "@/hooks/useGoals";
import { useCheckIns } from "@/hooks/useCheckIns";
import { useTemplates } from "@/hooks/useTemplates";
import { useToast } from "@/context/ToastContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Save, Trash2, Download, ChevronLeft, TrendingUp, BarChart2,
  Activity, Dumbbell, Trophy, Search, Target, MessageSquare,
  Check, X, Pencil, LayoutTemplate, Plus,
} from "lucide-react";
import { MUSCLE_GROUPS, EXERCISES_BY_MUSCLE, ALL_EXERCISES } from "@/constants/exercises";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const TABS = ["Workouts", "Goals", "Check-ins", "Measurements", "Progress"];
const GOAL_TYPES = ["lift_pr", "body_weight", "body_fat", "custom"];
const GOAL_TYPE_LABELS = { lift_pr: "Lift PR", body_weight: "Body Weight", body_fat: "Body Fat %", custom: "Custom" };
const CHECKIN_TYPES = ["session", "general", "nutrition", "call"];
const CHECKIN_LABELS = { session: "Session", general: "General", nutrition: "Nutrition", call: "Call" };
const GOAL_STATUS_COLORS = { active: "text-blue-400", achieved: "text-emerald-400", missed: "text-red-400", cancelled: "text-neutral-500" };

function formatDateISO(d = new Date()) { return new Date(d).toISOString().slice(0, 10); }

function downloadText(filename, text) {
  const el = document.createElement("a");
  el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
  el.setAttribute("download", filename);
  document.body.appendChild(el); el.click(); document.body.removeChild(el);
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, loading: clientsLoading } = useClients();
  const { entries, loading: entriesLoading, addEntry, updateEntry, deleteEntry } = useWorkouts(id);
  const { measurements, loading: measLoading, addMeasurement, deleteMeasurement } = useMeasurements(id);
  const { goals, loading: goalsLoading, addGoal, updateGoal, deleteGoal } = useGoals(id);
  const { checkIns, loading: checkInsLoading, addCheckIn, deleteCheckIn } = useCheckIns(id);
  const { templates } = useTemplates();
  const toast = useToast();

  const client = clients.find((c) => c.id === id);
  const [activeTab, setActiveTab] = useState("Workouts");

  // ── Workout form ──
  const [form, setForm] = useState({
    date: formatDateISO(), exercise: "Bench Press", muscle_group: "Chest",
    sets: 3, reps: 10, weight: 135, rpe: "", notes: "",
  });
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editEntryForm, setEditEntryForm] = useState({});
  const [savingEntry, setSavingEntry] = useState(false);

  // ── Template apply ──
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // ── Measurements form ──
  const [mForm, setMForm] = useState({ date: formatDateISO(), weight_lbs: "", body_fat_pct: "", chest_in: "", waist_in: "", hips_in: "", notes: "" });
  const [mSaving, setMSaving] = useState(false);

  // ── Goals form ──
  const [gForm, setGForm] = useState({ title: "", goal_type: "custom", target_value: "", target_unit: "lb", baseline_value: "", deadline: "", notes: "" });
  const [gSaving, setGSaving] = useState(false);

  // ── Check-in form ──
  const [ciForm, setCiForm] = useState({ date: formatDateISO(), type: "session", body: "", mood_score: "", energy_score: "" });
  const [ciSaving, setCiSaving] = useState(false);

  // ── Chart ──
  const [chartExercise, setChartExercise] = useState("");

  function update(k, v) {
    if (k === "muscle_group") {
      setForm((f) => ({ ...f, muscle_group: v, exercise: EXERCISES_BY_MUSCLE[v]?.[0] || "" }));
      setExerciseSearch("");
    } else { setForm((f) => ({ ...f, [k]: v })); }
  }

  const exerciseOptions = useMemo(() => {
    const base = EXERCISES_BY_MUSCLE[form.muscle_group] || ALL_EXERCISES;
    if (!exerciseSearch.trim()) return base;
    return ALL_EXERCISES.filter((ex) => ex.toLowerCase().includes(exerciseSearch.toLowerCase()));
  }, [form.muscle_group, exerciseSearch]);

  const showSuggest = Number(form.reps) >= 12;
  const suggestedWeight = useMemo(() => Math.round((Number(form.weight) || 0) * 1.03 * 2) / 2, [form.weight]);

  const prMap = useMemo(() => {
    const map = {};
    for (const e of entries) if (!map[e.exercise] || e.weight > map[e.exercise]) map[e.exercise] = e.weight;
    return map;
  }, [entries]);

  const chartOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.exercise))), [entries]);
  useEffect(() => { if (!chartExercise && chartOptions.length) setChartExercise(chartOptions[0]); }, [chartOptions, chartExercise]);

  const chartData = useMemo(() => {
    if (!chartExercise) return [];
    const map = new Map();
    for (const e of entries.filter((x) => x.exercise === chartExercise)) {
      const vol = e.sets * e.reps * e.weight;
      map.set(e.date, (map.get(e.date) || 0) + vol);
    }
    return Array.from(map.entries()).map(([date, volume]) => ({ date, volume })).sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, chartExercise]);

  const stats = useMemo(() => {
    if (!entries.length) return { sessions: 0, totalVolume: 0, topExercise: "—", uniqueDates: 0 };
    const totalVolume = entries.reduce((s, e) => s + e.sets * e.reps * e.weight, 0);
    const byExercise = {};
    for (const e of entries) byExercise[e.exercise] = (byExercise[e.exercise] || 0) + e.sets * e.reps * e.weight;
    const topExercise = Object.entries(byExercise).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { sessions: entries.length, totalVolume, topExercise, uniqueDates: new Set(entries.map((e) => e.date)).size };
  }, [entries]);

  // ── Apply template ──
  function applyTemplate(templateId) {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl || !tmpl.template_exercises?.length) return;
    const first = [...tmpl.template_exercises].sort((a, b) => a.order_index - b.order_index)[0];
    if (first) {
      setForm((f) => ({
        ...f,
        exercise: first.exercise,
        muscle_group: first.muscle_group,
        sets: first.sets,
        reps: parseInt(first.reps_target) || 10,
        weight: first.weight_target || f.weight,
        notes: `Template: ${tmpl.name}`,
      }));
      toast.info(`Applied template: ${tmpl.name}`);
    }
  }

  // ── Handlers ──
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addEntry({ ...form, sets: Number(form.sets), reps: Number(form.reps), weight: Number(form.weight), rpe: form.rpe !== "" ? Number(form.rpe) : null });
      toast.success("Entry saved.");
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  function startEditEntry(e) {
    setEditingEntryId(e.id);
    setEditEntryForm({ sets: e.sets, reps: e.reps, weight: e.weight, rpe: e.rpe ?? "", notes: e.notes || "" });
  }

  async function saveEditEntry(entryId) {
    setSavingEntry(true);
    try {
      await updateEntry(entryId, {
        sets: Number(editEntryForm.sets),
        reps: Number(editEntryForm.reps),
        weight: Number(editEntryForm.weight),
        rpe: editEntryForm.rpe !== "" ? Number(editEntryForm.rpe) : null,
        notes: editEntryForm.notes,
      });
      setEditingEntryId(null);
      toast.success("Entry updated.");
    } catch (err) { toast.error(err.message); }
    finally { setSavingEntry(false); }
  }

  async function handleDeleteEntry(entryId) {
    if (!window.confirm("Delete this entry?")) return;
    try { await deleteEntry(entryId); toast.success("Entry deleted."); }
    catch (err) { toast.error(err.message); }
  }

  async function handleSaveMeasurement(e) {
    e.preventDefault();
    setMSaving(true);
    try {
      const payload = { date: mForm.date, notes: mForm.notes };
      ["weight_lbs", "body_fat_pct", "chest_in", "waist_in", "hips_in"].forEach((k) => {
        if (mForm[k] !== "") payload[k] = Number(mForm[k]);
      });
      await addMeasurement(payload);
      setMForm({ date: formatDateISO(), weight_lbs: "", body_fat_pct: "", chest_in: "", waist_in: "", hips_in: "", notes: "" });
      toast.success("Measurements saved.");
    } catch (err) { toast.error(err.message); }
    finally { setMSaving(false); }
  }

  async function handleDeleteMeasurement(mid) {
    if (!window.confirm("Delete this measurement?")) return;
    try { await deleteMeasurement(mid); toast.success("Deleted."); }
    catch (err) { toast.error(err.message); }
  }

  async function handleSaveGoal(e) {
    e.preventDefault();
    if (!gForm.title.trim()) return;
    setGSaving(true);
    try {
      await addGoal({
        title: gForm.title, goal_type: gForm.goal_type,
        target_value: gForm.target_value ? Number(gForm.target_value) : null,
        target_unit: gForm.target_unit,
        baseline_value: gForm.baseline_value ? Number(gForm.baseline_value) : null,
        deadline: gForm.deadline || null, notes: gForm.notes,
      });
      setGForm({ title: "", goal_type: "custom", target_value: "", target_unit: "lb", baseline_value: "", deadline: "", notes: "" });
      toast.success("Goal added.");
    } catch (err) { toast.error(err.message); }
    finally { setGSaving(false); }
  }

  async function markGoalAchieved(goal) {
    try {
      await updateGoal(goal.id, { status: "achieved", achieved_on: formatDateISO() });
      toast.success("Goal marked as achieved! 🏆");
    } catch (err) { toast.error(err.message); }
  }

  async function handleDeleteGoal(id) {
    if (!window.confirm("Delete this goal?")) return;
    try { await deleteGoal(id); toast.success("Goal deleted."); }
    catch (err) { toast.error(err.message); }
  }

  async function handleSaveCheckIn(e) {
    e.preventDefault();
    if (!ciForm.body.trim()) return;
    setCiSaving(true);
    try {
      await addCheckIn({
        date: ciForm.date, type: ciForm.type, body: ciForm.body,
        mood_score: ciForm.mood_score ? Number(ciForm.mood_score) : null,
        energy_score: ciForm.energy_score ? Number(ciForm.energy_score) : null,
      });
      setCiForm({ date: formatDateISO(), type: "session", body: "", mood_score: "", energy_score: "" });
      toast.success("Check-in saved.");
    } catch (err) { toast.error(err.message); }
    finally { setCiSaving(false); }
  }

  async function handleDeleteCheckIn(id) {
    if (!window.confirm("Delete this note?")) return;
    try { await deleteCheckIn(id); toast.success("Deleted."); }
    catch (err) { toast.error(err.message); }
  }

  function exportCSV() {
    const lines = [["date","exercise","muscle_group","sets","reps","weight_lbs","rpe","notes"].join(",")];
    for (const e of entries)
      lines.push([e.date,e.exercise,e.muscle_group,e.sets,e.reps,e.weight,e.rpe??"",(e.notes||"").replace(/,/g,";")].join(","));
    downloadText(`${client?.name?.replace(/\s+/g,"_")}_workouts.csv`, lines.join("\n"));
    toast.success("CSV downloaded.");
  }

  async function exportPDF() {
    const el = document.getElementById("pdf-area");
    if (!el) return;
    toast.info("Generating PDF…");
    try {
      const canvas = await html2canvas(el, { backgroundColor: "#0a0a0a", scale: 1.5 });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, (canvas.height * w) / canvas.width);
      pdf.save(`${client?.name?.replace(/\s+/g,"_")||"client"}_report.pdf`);
      toast.success("PDF saved.");
    } catch { toast.error("PDF generation failed."); }
  }

  if (clientsLoading) return <Layout><div className="flex items-center justify-center h-64 text-red-500 animate-pulse">Loading…</div></Layout>;
  if (!client) return (
    <Layout>
      <div className="text-center py-20">
        <p className="text-neutral-400 mb-4">Client not found.</p>
        <Button className="glow-btn" onClick={() => navigate("/")}>Back to Dashboard</Button>
      </div>
    </Layout>
  );

  const goalProgress = (goal) => {
    if (!goal.target_value || !goal.baseline_value) return null;
    let current = goal.baseline_value;
    if (goal.goal_type === "lift_pr" && prMap[goal.title]) current = prMap[goal.title];
    if (goal.goal_type === "body_weight" && measurements.length) current = measurements[0]?.weight_lbs || current;
    if (goal.goal_type === "body_fat" && measurements.length) current = measurements[0]?.body_fat_pct || current;
    const pct = Math.min(100, Math.max(0, ((current - goal.baseline_value) / (goal.target_value - goal.baseline_value)) * 100));
    return { current, pct: Math.abs(pct) };
  };

  return (
    <Layout>
      {/* Back + name */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors text-sm">
          <ChevronLeft className="h-4 w-4" /> Clients
        </button>
        <span className="text-neutral-600">/</span>
        <h2 className="text-2xl font-bold text-white">{client.name}</h2>
        {client.email && <span className="text-sm text-neutral-400 hidden sm:block">{client.email}</span>}
        {client.training_level && <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full hidden sm:block capitalize">{client.training_level}</span>}
        {client.primary_goal && <span className="text-xs text-red-500 bg-red-900/20 border border-red-800/30 px-2 py-0.5 rounded-full hidden sm:block capitalize">{client.primary_goal.replace("_"," ")}</span>}
      </div>

      {client.notes && (
        <div className="mb-4 rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-2.5 text-sm text-neutral-400">{client.notes}</div>
      )}

      <div id="pdf-area">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard icon={<Activity />} label="Entries" value={stats.sessions} />
          <StatCard icon={<BarChart2 />} label="Sessions" value={stats.uniqueDates} />
          <StatCard icon={<TrendingUp />} label="Total Volume" value={Intl.NumberFormat().format(Math.round(stats.totalVolume)) + " lb"} />
          <StatCard icon={<Dumbbell />} label="Top Exercise" value={stats.topExercise} />
        </div>

        {/* Tabs */}
        <div className="flex mb-5 bg-neutral-900 border border-neutral-800 rounded-xl p-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[4.5rem] px-2 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap text-center ${activeTab === tab ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white"}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* ══ WORKOUTS TAB ══ */}
        {activeTab === "Workouts" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="card-style">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle>Log Workout</CardTitle>
                    {templates.length > 0 && (
                      <div className="flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4 text-neutral-500" />
                        <Select value={selectedTemplate} onValueChange={(v) => { setSelectedTemplate(v); applyTemplate(v); }}>
                          <SelectTrigger className="bg-neutral-800 border-neutral-700 h-8 text-xs w-44">
                            <SelectValue placeholder="Apply template…" />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-900 border-neutral-700">
                            {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-neutral-300">Date</Label>
                      <Input type="date" className="bg-neutral-800 border-neutral-700 mt-1"
                        value={form.date} onChange={(e) => update("date", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-neutral-300">Muscle Group</Label>
                      <Select value={form.muscle_group} onValueChange={(v) => update("muscle_group", v)}>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700">
                          {MUSCLE_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Exercise</Label>
                      <div className="relative mt-1 mb-1.5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                        <input className="w-full pl-8 pr-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-600"
                          placeholder="Search exercises…" value={exerciseSearch} onChange={(e) => setExerciseSearch(e.target.value)} />
                      </div>
                      <Select value={form.exercise} onValueChange={(v) => update("exercise", v)}>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700 max-h-56">
                          {exerciseOptions.map((ex) => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-neutral-300">Sets</Label>
                      <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1"
                        value={form.sets} min={1} onChange={(e) => update("sets", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-neutral-300">Reps</Label>
                      <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1"
                        value={form.reps} min={1} onChange={(e) => update("reps", e.target.value)} />
                      {showSuggest && <p className="mt-1 text-xs text-emerald-400">{form.reps} reps — try ~{suggestedWeight} lb next session.</p>}
                    </div>
                    <div>
                      <Label className="text-neutral-300">Weight (lbs)</Label>
                      <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1"
                        value={form.weight} min={0} step="0.5" onChange={(e) => update("weight", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-neutral-300">RPE <span className="text-neutral-500 font-normal">(0–10, optional)</span></Label>
                      <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1"
                        placeholder="e.g. 8" value={form.rpe} min={0} max={10} step="0.5"
                        onChange={(e) => update("rpe", e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Notes</Label>
                      <Textarea className="bg-neutral-800 border-neutral-700 min-h-[68px] mt-1"
                        placeholder="Tempo, cues, superset, how it felt…"
                        value={form.notes} onChange={(e) => update("notes", e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" className="glow-btn" disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Entry"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Workout table */}
              <Card className="card-style">
                <CardHeader className="pb-2">
                  <CardTitle>Workout Log <span className="text-neutral-500 font-normal text-sm">({entries.length})</span></CardTitle>
                </CardHeader>
                <CardContent>
                  {entriesLoading ? <div className="text-center py-8 text-neutral-500 animate-pulse">Loading…</div>
                  : entries.length === 0 ? <div className="text-center py-10 text-neutral-500">No entries yet.</div>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-400">
                            <th className="px-3 py-2">Date</th><th className="px-3 py-2">Exercise</th>
                            <th className="px-3 py-2">S</th><th className="px-3 py-2">R</th>
                            <th className="px-3 py-2">Wt</th><th className="px-3 py-2 hidden sm:table-cell">RPE</th>
                            <th className="px-3 py-2 hidden md:table-cell">Vol</th>
                            <th className="px-3 py-2 hidden lg:table-cell">Notes</th><th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((e) => {
                            const isPR = prMap[e.exercise] === e.weight && e.weight > 0;
                            const isEditing = editingEntryId === e.id;
                            return (
                              <tr key={e.id} className="border-b border-neutral-800 hover:bg-neutral-800/30">
                                {isEditing ? (
                                  <>
                                    <td className="px-2 py-1.5 text-xs text-neutral-400">{e.date}</td>
                                    <td className="px-2 py-1.5 font-medium text-xs">{e.exercise}</td>
                                    <td className="px-1 py-1"><Input type="number" className="bg-neutral-700 border-neutral-600 h-7 w-14 text-xs" value={editEntryForm.sets} onChange={(ev) => setEditEntryForm((f) => ({ ...f, sets: ev.target.value }))} /></td>
                                    <td className="px-1 py-1"><Input type="number" className="bg-neutral-700 border-neutral-600 h-7 w-14 text-xs" value={editEntryForm.reps} onChange={(ev) => setEditEntryForm((f) => ({ ...f, reps: ev.target.value }))} /></td>
                                    <td className="px-1 py-1"><Input type="number" className="bg-neutral-700 border-neutral-600 h-7 w-20 text-xs" value={editEntryForm.weight} step="0.5" onChange={(ev) => setEditEntryForm((f) => ({ ...f, weight: ev.target.value }))} /></td>
                                    <td className="px-1 py-1 hidden sm:table-cell"><Input type="number" className="bg-neutral-700 border-neutral-600 h-7 w-16 text-xs" placeholder="RPE" value={editEntryForm.rpe} min={0} max={10} step="0.5" onChange={(ev) => setEditEntryForm((f) => ({ ...f, rpe: ev.target.value }))} /></td>
                                    <td className="hidden md:table-cell" />
                                    <td className="px-1 py-1 hidden lg:table-cell"><Input className="bg-neutral-700 border-neutral-600 h-7 text-xs" value={editEntryForm.notes} onChange={(ev) => setEditEntryForm((f) => ({ ...f, notes: ev.target.value }))} /></td>
                                    <td className="px-2 py-1">
                                      <div className="flex gap-1">
                                        <button onClick={() => saveEditEntry(e.id)} disabled={savingEntry} className="p-1 text-emerald-400 hover:bg-emerald-900/20 rounded"><Check className="h-3.5 w-3.5" /></button>
                                        <button onClick={() => setEditingEntryId(null)} className="p-1 text-neutral-500 hover:bg-neutral-700 rounded"><X className="h-3.5 w-3.5" /></button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-3 py-2 text-neutral-400 text-xs">{e.date}</td>
                                    <td className="px-3 py-2 font-medium">
                                      <span className="flex items-center gap-1.5">
                                        {e.exercise}
                                        {isPR && <span title="PR" className="inline-flex items-center gap-0.5 text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-700/40 px-1.5 py-0.5 rounded-full"><Trophy className="h-2.5 w-2.5" /> PR</span>}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">{e.sets}</td>
                                    <td className="px-3 py-2">{e.reps}</td>
                                    <td className="px-3 py-2 text-red-400 font-medium">{e.weight}lb</td>
                                    <td className="px-3 py-2 text-neutral-500 hidden sm:table-cell">{e.rpe ?? "—"}</td>
                                    <td className="px-3 py-2 text-neutral-500 hidden md:table-cell">{Intl.NumberFormat().format(e.sets * e.reps * e.weight)}</td>
                                    <td className="px-3 py-2 max-w-[180px] truncate text-neutral-600 hidden lg:table-cell text-xs" title={e.notes}>{e.notes}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-1">
                                        <button onClick={() => startEditEntry(e)} className="p-2 text-neutral-500 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => handleDeleteEntry(e.id)} className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <ProgressChartCard chartOptions={chartOptions} chartExercise={chartExercise} setChartExercise={setChartExercise} chartData={chartData} />
              <ExportCard entries={entries} onCSV={exportCSV} onPDF={exportPDF} />
            </div>
          </div>
        )}

        {/* ══ GOALS TAB ══ */}
        {activeTab === "Goals" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="card-style">
                <CardHeader className="pb-2"><CardTitle>Add Goal</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveGoal} className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Goal Title *</Label>
                      <Input className="bg-neutral-800 border-neutral-700 mt-1" placeholder='e.g. "Bench Press 225lb" or "Lose 10lbs"'
                        value={gForm.title} onChange={(e) => setGForm((f) => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div>
                      <Label className="text-neutral-300">Goal Type</Label>
                      <Select value={gForm.goal_type} onValueChange={(v) => setGForm((f) => ({ ...f, goal_type: v }))}>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700">
                          {GOAL_TYPES.map((t) => <SelectItem key={t} value={t}>{GOAL_TYPE_LABELS[t]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-neutral-300">Unit</Label>
                      <Input className="bg-neutral-800 border-neutral-700 mt-1" placeholder="lb, %, min, kg…"
                        value={gForm.target_unit} onChange={(e) => setGForm((f) => ({ ...f, target_unit: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-neutral-300">Starting Value</Label>
                      <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1" placeholder="Where they start"
                        value={gForm.baseline_value} onChange={(e) => setGForm((f) => ({ ...f, baseline_value: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-neutral-300">Target Value</Label>
                      <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1" placeholder="Goal to reach"
                        value={gForm.target_value} onChange={(e) => setGForm((f) => ({ ...f, target_value: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-neutral-300">Deadline</Label>
                      <Input type="date" className="bg-neutral-800 border-neutral-700 mt-1"
                        value={gForm.deadline} onChange={(e) => setGForm((f) => ({ ...f, deadline: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-neutral-300">Notes</Label>
                      <Input className="bg-neutral-800 border-neutral-700 mt-1" placeholder="Context, strategy…"
                        value={gForm.notes} onChange={(e) => setGForm((f) => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" className="glow-btn" disabled={gSaving}>
                        <Target className="mr-2 h-4 w-4" />{gSaving ? "Saving…" : "Add Goal"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Goals list */}
              {goalsLoading ? <div className="text-center py-8 text-neutral-500 animate-pulse">Loading…</div> : goals.length === 0 ? (
                <Card className="card-style"><CardContent className="py-10 text-center text-neutral-500">No goals yet. Add one above.</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => {
                    const prog = goalProgress(goal);
                    const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - Date.now()) / 86400000) : null;
                    return (
                      <Card key={goal.id} className="card-style">
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-white">{goal.title}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${GOAL_STATUS_COLORS[goal.status]} bg-neutral-800/60 border-neutral-700`}>
                                  {goal.status}
                                </span>
                                <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">{GOAL_TYPE_LABELS[goal.goal_type]}</span>
                              </div>
                              {goal.target_value && (
                                <p className="text-sm text-neutral-400 mt-0.5">
                                  Target: <span className="text-white">{goal.target_value} {goal.target_unit}</span>
                                  {goal.baseline_value && <span className="text-neutral-600 ml-2">from {goal.baseline_value} {goal.target_unit}</span>}
                                </p>
                              )}
                              {daysLeft !== null && goal.status === "active" && (
                                <p className={`text-xs mt-0.5 ${daysLeft < 0 ? "text-red-400" : daysLeft < 14 ? "text-yellow-400" : "text-neutral-500"}`}>
                                  {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                                </p>
                              )}
                              {goal.notes && <p className="text-xs text-neutral-600 mt-1">{goal.notes}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {goal.status === "active" && (
                                <button onClick={() => markGoalAchieved(goal)} title="Mark achieved"
                                  className="p-1.5 text-neutral-500 hover:text-emerald-400 hover:bg-emerald-900/20 rounded transition-colors">
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              <button onClick={() => handleDeleteGoal(goal.id)}
                                className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          {prog && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                                <span>Progress</span><span>{prog.pct.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${prog.pct}%` }} />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <Card className="card-style">
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-400" /> Personal Records</CardTitle></CardHeader>
                <CardContent>
                  {Object.keys(prMap).length === 0 ? <p className="text-neutral-500 text-sm text-center py-6">Log workouts to track PRs.</p>
                  : (
                    <div className="space-y-2">
                      {Object.entries(prMap).sort((a,b) => b[1]-a[1]).map(([ex,wt]) => (
                        <div key={ex} className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-800">
                          <span className="text-sm text-white">{ex}</span>
                          <span className="text-sm font-bold text-red-400">{wt} lb</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ══ CHECK-INS TAB ══ */}
        {activeTab === "Check-ins" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="card-style">
                <CardHeader className="pb-2"><CardTitle>New Note</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveCheckIn} className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-neutral-300">Date</Label>
                      <Input type="date" className="bg-neutral-800 border-neutral-700 mt-1"
                        value={ciForm.date} onChange={(e) => setCiForm((f) => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-neutral-300">Type</Label>
                      <Select value={ciForm.type} onValueChange={(v) => setCiForm((f) => ({ ...f, type: v }))}>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700">
                          {CHECKIN_TYPES.map((t) => <SelectItem key={t} value={t}>{CHECKIN_LABELS[t]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-neutral-300">Mood <span className="text-neutral-500">(1–5)</span></Label>
                      <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1" placeholder="—"
                        value={ciForm.mood_score} min={1} max={5}
                        onChange={(e) => setCiForm((f) => ({ ...f, mood_score: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-neutral-300">Energy <span className="text-neutral-500">(1–5)</span></Label>
                      <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1" placeholder="—"
                        value={ciForm.energy_score} min={1} max={5}
                        onChange={(e) => setCiForm((f) => ({ ...f, energy_score: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Note *</Label>
                      <Textarea className="bg-neutral-800 border-neutral-700 min-h-[90px] mt-1"
                        placeholder="How did the session go? What was adjusted? Key observations…"
                        value={ciForm.body} onChange={(e) => setCiForm((f) => ({ ...f, body: e.target.value }))} required />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" className="glow-btn" disabled={ciSaving}>
                        <MessageSquare className="mr-2 h-4 w-4" />{ciSaving ? "Saving…" : "Save Note"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {checkInsLoading ? <div className="text-center py-8 text-neutral-500 animate-pulse">Loading…</div>
              : checkIns.length === 0 ? (
                <Card className="card-style"><CardContent className="py-10 text-center text-neutral-500">No notes yet. Log your first check-in above.</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {checkIns.map((ci) => (
                    <Card key={ci.id} className="card-style">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="text-xs text-neutral-400">{ci.date}</span>
                              <span className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 px-2 py-0.5 rounded-full">{CHECKIN_LABELS[ci.type]}</span>
                              {ci.mood_score && <span className="text-xs text-neutral-500">Mood {ci.mood_score}/5</span>}
                              {ci.energy_score && <span className="text-xs text-neutral-500">Energy {ci.energy_score}/5</span>}
                            </div>
                            <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{ci.body}</p>
                          </div>
                          <button onClick={() => handleDeleteCheckIn(ci.id)}
                            className="p-1.5 text-neutral-600 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            <div />
          </div>
        )}

        {/* ══ MEASUREMENTS TAB ══ */}
        {activeTab === "Measurements" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="card-style">
                <CardHeader className="pb-2"><CardTitle>Log Measurements</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveMeasurement} className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Date</Label>
                      <Input type="date" className="bg-neutral-800 border-neutral-700 mt-1"
                        value={mForm.date} onChange={(e) => setMForm((f) => ({ ...f, date: e.target.value }))} />
                    </div>
                    {[{ key:"weight_lbs",label:"Body Weight (lbs)" },{ key:"body_fat_pct",label:"Body Fat %" },{ key:"chest_in",label:"Chest (in)" },{ key:"waist_in",label:"Waist (in)" },{ key:"hips_in",label:"Hips (in)" }].map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-neutral-300">{label}</Label>
                        <Input type="number" step="0.1" className="bg-neutral-800 border-neutral-700 mt-1"
                          placeholder="—" value={mForm[key]} onChange={(e) => setMForm((f) => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Notes</Label>
                      <Textarea className="bg-neutral-800 border-neutral-700 min-h-[60px] mt-1"
                        placeholder="Context, conditions…" value={mForm.notes} onChange={(e) => setMForm((f) => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" className="glow-btn" disabled={mSaving}>
                        <Save className="mr-2 h-4 w-4" />{mSaving ? "Saving…" : "Save Measurements"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="card-style">
                <CardHeader className="pb-2"><CardTitle>History <span className="text-neutral-500 font-normal text-sm">({measurements.length})</span></CardTitle></CardHeader>
                <CardContent>
                  {measLoading ? <div className="text-center py-8 text-neutral-500 animate-pulse">Loading…</div>
                  : measurements.length === 0 ? <div className="text-center py-10 text-neutral-500">No measurements yet.</div>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-400">
                          <th className="px-3 py-2">Date</th><th className="px-3 py-2">Weight</th><th className="px-3 py-2">BF%</th>
                          <th className="px-3 py-2 hidden sm:table-cell">Chest</th><th className="px-3 py-2 hidden sm:table-cell">Waist</th><th className="px-3 py-2 hidden sm:table-cell">Hips</th>
                          <th className="px-3 py-2 hidden lg:table-cell">Notes</th><th className="px-3 py-2"></th>
                        </tr></thead>
                        <tbody>
                          {measurements.map((m) => (
                            <tr key={m.id} className="border-b border-neutral-800 hover:bg-neutral-800/30">
                              <td className="px-3 py-2 text-neutral-400 text-xs">{m.date}</td>
                              <td className="px-3 py-2 text-red-400 font-medium">{m.weight_lbs ? `${m.weight_lbs}lb` : "—"}</td>
                              <td className="px-3 py-2">{m.body_fat_pct ? `${m.body_fat_pct}%` : "—"}</td>
                              <td className="px-3 py-2 hidden sm:table-cell">{m.chest_in ? `${m.chest_in}"` : "—"}</td>
                              <td className="px-3 py-2 hidden sm:table-cell">{m.waist_in ? `${m.waist_in}"` : "—"}</td>
                              <td className="px-3 py-2 hidden sm:table-cell">{m.hips_in ? `${m.hips_in}"` : "—"}</td>
                              <td className="px-3 py-2 max-w-[160px] truncate text-neutral-600 hidden lg:table-cell text-xs">{m.notes}</td>
                              <td className="px-3 py-2">
                                <button onClick={() => handleDeleteMeasurement(m.id)} className="p-1.5 text-neutral-600 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="card-style">
                <CardHeader className="pb-2"><CardTitle>Body Weight Trend</CardTitle></CardHeader>
                <CardContent>
                  {measurements.filter((m) => m.weight_lbs).length < 2 ? <p className="text-neutral-500 text-sm text-center py-6">Log 2+ measurements to see trend.</p>
                  : (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...measurements].reverse().filter((m) => m.weight_lbs).map((m) => ({ date: m.date, weight: Number(m.weight_lbs) }))} margin={{ top:5,right:10,bottom:0,left:0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                          <XAxis dataKey="date" stroke="#737373" fontSize={10} />
                          <YAxis stroke="#737373" fontSize={10} width={45} domain={["auto","auto"]} />
                          <Tooltip contentStyle={{ background:"#111",border:"1px solid #333",borderRadius:"8px" }} />
                          <Line type="monotone" dataKey="weight" stroke="#dc2626" strokeWidth={2} dot={{ fill:"#dc2626",r:3 }} activeDot={{ r:5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ══ PROGRESS TAB ══ */}
        {activeTab === "Progress" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <ProgressChartCard chartOptions={chartOptions} chartExercise={chartExercise} setChartExercise={setChartExercise} chartData={chartData} fullHeight />
            <Card className="card-style">
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-400" /> Personal Records</CardTitle></CardHeader>
              <CardContent>
                {Object.keys(prMap).length === 0 ? <p className="text-neutral-500 text-sm text-center py-6">Log workouts to track PRs.</p>
                : (
                  <div className="space-y-2">
                    {Object.entries(prMap).sort((a,b) => b[1]-a[1]).map(([ex,wt]) => (
                      <div key={ex} className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-800">
                        <span className="text-sm text-white">{ex}</span>
                        <span className="text-sm font-bold text-red-400">{wt} lb</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <ExportCard entries={entries} onCSV={exportCSV} onPDF={exportPDF} />
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 shadow-lg shadow-red-900/20">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-red-600 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      </div>
      <div className="text-lg font-bold text-white truncate">{value}</div>
    </div>
  );
}

function ProgressChartCard({ chartOptions, chartExercise, setChartExercise, chartData, fullHeight }) {
  return (
    <Card className="card-style">
      <CardHeader className="pb-2"><CardTitle>Volume Progress</CardTitle></CardHeader>
      <CardContent>
        {chartOptions.length === 0 ? <p className="text-neutral-500 text-sm text-center py-6">Log workouts to see progress.</p>
        : (
          <>
            <div className="mb-3">
              <Select value={chartExercise} onValueChange={setChartExercise}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {chartOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={fullHeight ? "h-72" : "h-52"}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top:5,right:10,bottom:0,left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" stroke="#737373" fontSize={10} />
                  <YAxis stroke="#737373" fontSize={10} width={50} />
                  <Tooltip contentStyle={{ background:"#111",border:"1px solid #333",borderRadius:"8px" }} labelStyle={{ color:"#a3a3a3" }} />
                  <Line type="monotone" dataKey="volume" stroke="#dc2626" strokeWidth={2} dot={{ fill:"#dc2626",r:3 }} activeDot={{ r:5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-neutral-600 mt-2 text-center">Volume = Sets × Reps × Weight</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ExportCard({ entries, onCSV, onPDF }) {
  return (
    <Card className="card-style">
      <CardHeader className="pb-2"><CardTitle>Export</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button className="bg-neutral-800 hover:bg-neutral-700 w-full justify-start" disabled={entries.length === 0} onClick={onCSV}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
        <Button className="glow-btn w-full justify-start" disabled={entries.length === 0} onClick={onPDF}>
          <Download className="mr-2 h-4 w-4" /> Export PDF Report
        </Button>
        <p className="text-xs text-neutral-600">CSV works in Excel & Google Sheets.</p>
      </CardContent>
    </Card>
  );
}
