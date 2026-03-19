import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useClients } from "@/hooks/useClients";
import { useMeasurements } from "@/hooks/useMeasurements";
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
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Save, Trash2, Download, ChevronLeft, TrendingUp,
  BarChart2, Activity, Dumbbell, Ruler, Trophy, Search,
} from "lucide-react";
import { MUSCLE_GROUPS, EXERCISES_BY_MUSCLE, ALL_EXERCISES } from "@/constants/exercises";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function formatDateISO(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

function downloadText(filename, text) {
  const el = document.createElement("a");
  el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
  el.setAttribute("download", filename);
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}

// ─── Tab navigation ──────────────────────────────────────────
const TABS = ["Workouts", "Measurements", "Progress"];

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, loading: clientsLoading } = useClients();
  const { entries, loading: entriesLoading, addEntry, deleteEntry } = useWorkouts(id);
  const { measurements, loading: measLoading, addMeasurement, deleteMeasurement } = useMeasurements(id);
  const toast = useToast();

  const client = clients.find((c) => c.id === id);
  const [activeTab, setActiveTab] = useState("Workouts");

  // ── Workout form ──
  const [form, setForm] = useState({
    date: formatDateISO(),
    exercise: "Bench Press",
    muscle_group: "Chest",
    sets: 3,
    reps: 10,
    weight: 135,
    notes: "",
  });
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Measurements form ──
  const [mForm, setMForm] = useState({
    date: formatDateISO(),
    weight_lbs: "",
    body_fat_pct: "",
    chest_in: "",
    waist_in: "",
    hips_in: "",
    notes: "",
  });
  const [mSaving, setMSaving] = useState(false);

  // ── Chart ──
  const [chartExercise, setChartExercise] = useState("");

  // Update exercise list when muscle group changes
  function update(k, v) {
    if (k === "muscle_group") {
      const first = EXERCISES_BY_MUSCLE[v]?.[0] || "";
      setForm((f) => ({ ...f, muscle_group: v, exercise: first }));
      setExerciseSearch("");
    } else {
      setForm((f) => ({ ...f, [k]: v }));
    }
  }

  // Filtered exercise list
  const exerciseOptions = useMemo(() => {
    const base = EXERCISES_BY_MUSCLE[form.muscle_group] || ALL_EXERCISES;
    if (!exerciseSearch.trim()) return base;
    const q = exerciseSearch.toLowerCase();
    return ALL_EXERCISES.filter((ex) => ex.toLowerCase().includes(q));
  }, [form.muscle_group, exerciseSearch]);

  // Progressive overload hint
  const showSuggest = Number(form.reps) >= 12;
  const suggestedWeight = useMemo(() => Math.round((Number(form.weight) || 0) * 1.03 * 2) / 2, [form.weight]);

  // PR tracking — for each entry, is it the highest weight for that exercise?
  const prMap = useMemo(() => {
    const map = {};
    for (const e of entries) {
      if (!map[e.exercise] || e.weight > map[e.exercise]) map[e.exercise] = e.weight;
    }
    return map;
  }, [entries]);

  // Chart options
  const chartOptions = useMemo(() => Array.from(new Set(entries.map((e) => e.exercise))), [entries]);
  useEffect(() => {
    if (!chartExercise && chartOptions.length) setChartExercise(chartOptions[0]);
  }, [chartOptions, chartExercise]);

  const chartData = useMemo(() => {
    if (!chartExercise) return [];
    const map = new Map();
    for (const e of entries.filter((x) => x.exercise === chartExercise)) {
      const vol = e.sets * e.reps * e.weight;
      map.set(e.date, (map.get(e.date) || 0) + vol);
    }
    return Array.from(map.entries())
      .map(([date, volume]) => ({ date, volume }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, chartExercise]);

  // Stats
  const stats = useMemo(() => {
    if (!entries.length) return { sessions: 0, totalVolume: 0, topExercise: "—", uniqueDates: 0 };
    const totalVolume = entries.reduce((s, e) => s + e.sets * e.reps * e.weight, 0);
    const byExercise = {};
    for (const e of entries) byExercise[e.exercise] = (byExercise[e.exercise] || 0) + e.sets * e.reps * e.weight;
    const topExercise = Object.entries(byExercise).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const uniqueDates = new Set(entries.map((e) => e.date)).size;
    return { sessions: entries.length, totalVolume, topExercise, uniqueDates };
  }, [entries]);

  // ── Handlers ──
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addEntry({ ...form, sets: Number(form.sets), reps: Number(form.reps), weight: Number(form.weight) });
      toast.success("Entry saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry(entryId) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteEntry(entryId);
      toast.success("Entry deleted.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSaveMeasurement(e) {
    e.preventDefault();
    setMSaving(true);
    try {
      const payload = { date: mForm.date, notes: mForm.notes };
      if (mForm.weight_lbs !== "") payload.weight_lbs = Number(mForm.weight_lbs);
      if (mForm.body_fat_pct !== "") payload.body_fat_pct = Number(mForm.body_fat_pct);
      if (mForm.chest_in !== "") payload.chest_in = Number(mForm.chest_in);
      if (mForm.waist_in !== "") payload.waist_in = Number(mForm.waist_in);
      if (mForm.hips_in !== "") payload.hips_in = Number(mForm.hips_in);
      await addMeasurement(payload);
      setMForm({ date: formatDateISO(), weight_lbs: "", body_fat_pct: "", chest_in: "", waist_in: "", hips_in: "", notes: "" });
      toast.success("Measurements saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMSaving(false);
    }
  }

  async function handleDeleteMeasurement(mid) {
    if (!window.confirm("Delete this measurement?")) return;
    try {
      await deleteMeasurement(mid);
      toast.success("Deleted.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  function exportCSV() {
    const headers = ["date", "exercise", "muscle_group", "sets", "reps", "weight_lbs", "notes"];
    const lines = [headers.join(",")];
    for (const e of entries)
      lines.push([e.date, e.exercise, e.muscle_group, e.sets, e.reps, e.weight, (e.notes || "").replace(/,/g, ";")].join(","));
    downloadText(`${client?.name?.replace(/\s+/g, "_")}_workouts.csv`, lines.join("\n"));
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
      pdf.save(`${client?.name?.replace(/\s+/g, "_") || "client"}_report.pdf`);
      toast.success("PDF saved.");
    } catch {
      toast.error("PDF generation failed.");
    }
  }

  if (clientsLoading) {
    return <Layout><div className="flex items-center justify-center h-64 text-red-500 animate-pulse">Loading…</div></Layout>;
  }
  if (!client) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-neutral-400 mb-4">Client not found.</p>
          <Button className="glow-btn" onClick={() => navigate("/")}>Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Back + name */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate("/")}
          className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors text-sm">
          <ChevronLeft className="h-4 w-4" /> Clients
        </button>
        <span className="text-neutral-600">/</span>
        <h2 className="text-2xl font-bold text-white">{client.name}</h2>
        {client.email && <span className="text-sm text-neutral-400 hidden sm:block">{client.email}</span>}
        {client.phone && <span className="text-sm text-neutral-500 hidden sm:block">{client.phone}</span>}
      </div>

      {/* Notes banner */}
      {client.notes && (
        <div className="mb-5 rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-2.5 text-sm text-neutral-400">
          {client.notes}
        </div>
      )}

      {/* Stats bar */}
      <div id="pdf-area">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard icon={<Activity />} label="Entries" value={stats.sessions} />
          <StatCard icon={<BarChart2 />} label="Sessions" value={stats.uniqueDates} />
          <StatCard icon={<TrendingUp />} label="Total Volume"
            value={Intl.NumberFormat().format(Math.round(stats.totalVolume)) + " lb"} />
          <StatCard icon={<Dumbbell />} label="Top Exercise" value={stats.topExercise} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-red-600 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            TAB: WORKOUTS
        ══════════════════════════════════════════ */}
        {activeTab === "Workouts" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left — form + table */}
            <div className="lg:col-span-2 space-y-6">
              {/* Workout form */}
              <Card className="card-style">
                <CardHeader className="pb-2"><CardTitle>Log Workout</CardTitle></CardHeader>
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

                    {/* Exercise search + select */}
                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Exercise</Label>
                      <div className="relative mt-1 mb-1.5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                        <input
                          className="w-full pl-8 pr-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-600"
                          placeholder="Search exercises…"
                          value={exerciseSearch}
                          onChange={(e) => setExerciseSearch(e.target.value)}
                        />
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
                      {showSuggest && (
                        <p className="mt-1 text-xs text-emerald-400">
                          {form.reps} reps hit — try ~{suggestedWeight} lb next session.
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Weight (lbs)</Label>
                      <Input type="number" className="bg-neutral-800 border-neutral-700 mt-1"
                        value={form.weight} min={0} step="0.5" onChange={(e) => update("weight", e.target.value)} />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Notes</Label>
                      <Textarea className="bg-neutral-800 border-neutral-700 min-h-[68px] mt-1"
                        placeholder="Tempo, RIR, cues, superset…"
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
                  <CardTitle>
                    Workout Log <span className="text-neutral-500 font-normal text-sm">({entries.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {entriesLoading ? (
                    <div className="text-center py-8 text-neutral-500 animate-pulse">Loading…</div>
                  ) : entries.length === 0 ? (
                    <div className="text-center py-10 text-neutral-500">No entries yet. Log your first session above.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-400">
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Exercise</th>
                            <th className="px-3 py-2 hidden sm:table-cell">Muscle</th>
                            <th className="px-3 py-2">S</th>
                            <th className="px-3 py-2">R</th>
                            <th className="px-3 py-2">Wt</th>
                            <th className="px-3 py-2 hidden md:table-cell">Vol</th>
                            <th className="px-3 py-2 hidden lg:table-cell">Notes</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((e) => {
                            const vol = e.sets * e.reps * e.weight;
                            const isPR = prMap[e.exercise] === e.weight && e.weight > 0;
                            return (
                              <tr key={e.id} className="border-b border-neutral-800 hover:bg-neutral-800/30">
                                <td className="px-3 py-2 text-neutral-400 text-xs">{e.date}</td>
                                <td className="px-3 py-2 font-medium">
                                  <span className="flex items-center gap-1">
                                    {e.exercise}
                                    {isPR && (
                                      <span title="Personal Record" className="inline-flex items-center gap-0.5 text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-700/40 px-1.5 py-0.5 rounded-full">
                                        <Trophy className="h-2.5 w-2.5" /> PR
                                      </span>
                                    )}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-neutral-500 hidden sm:table-cell text-xs">{e.muscle_group}</td>
                                <td className="px-3 py-2">{e.sets}</td>
                                <td className="px-3 py-2">{e.reps}</td>
                                <td className="px-3 py-2 text-red-400 font-medium">{e.weight}lb</td>
                                <td className="px-3 py-2 text-neutral-500 hidden md:table-cell">{Intl.NumberFormat().format(vol)}</td>
                                <td className="px-3 py-2 max-w-[180px] truncate text-neutral-600 hidden lg:table-cell text-xs" title={e.notes}>{e.notes}</td>
                                <td className="px-3 py-2">
                                  <button onClick={() => handleDeleteEntry(e.id)}
                                    className="p-1.5 text-neutral-600 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
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

            {/* Right — chart + export */}
            <div className="space-y-6">
              <ProgressChartCard chartOptions={chartOptions} chartExercise={chartExercise}
                setChartExercise={setChartExercise} chartData={chartData} />
              <ExportCard entries={entries} onCSV={exportCSV} onPDF={exportPDF} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: MEASUREMENTS
        ══════════════════════════════════════════ */}
        {activeTab === "Measurements" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Measurement form */}
              <Card className="card-style">
                <CardHeader className="pb-2"><CardTitle>Log Measurements</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveMeasurement} className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Date</Label>
                      <Input type="date" className="bg-neutral-800 border-neutral-700 mt-1"
                        value={mForm.date} onChange={(e) => setMForm((f) => ({ ...f, date: e.target.value }))} />
                    </div>
                    {[
                      { key: "weight_lbs", label: "Body Weight (lbs)" },
                      { key: "body_fat_pct", label: "Body Fat %" },
                      { key: "chest_in", label: "Chest (in)" },
                      { key: "waist_in", label: "Waist (in)" },
                      { key: "hips_in", label: "Hips (in)" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-neutral-300">{label}</Label>
                        <Input type="number" step="0.1" className="bg-neutral-800 border-neutral-700 mt-1"
                          placeholder="—" value={mForm[key]}
                          onChange={(e) => setMForm((f) => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <Label className="text-neutral-300">Notes</Label>
                      <Textarea className="bg-neutral-800 border-neutral-700 min-h-[60px] mt-1"
                        placeholder="Context, conditions, etc."
                        value={mForm.notes} onChange={(e) => setMForm((f) => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" className="glow-btn" disabled={mSaving}>
                        <Save className="mr-2 h-4 w-4" />{mSaving ? "Saving…" : "Save Measurements"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Measurements table */}
              <Card className="card-style">
                <CardHeader className="pb-2">
                  <CardTitle>History <span className="text-neutral-500 font-normal text-sm">({measurements.length})</span></CardTitle>
                </CardHeader>
                <CardContent>
                  {measLoading ? (
                    <div className="text-center py-8 text-neutral-500 animate-pulse">Loading…</div>
                  ) : measurements.length === 0 ? (
                    <div className="text-center py-10 text-neutral-500">No measurements logged yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-400">
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Weight</th>
                            <th className="px-3 py-2">BF%</th>
                            <th className="px-3 py-2 hidden sm:table-cell">Chest</th>
                            <th className="px-3 py-2 hidden sm:table-cell">Waist</th>
                            <th className="px-3 py-2 hidden sm:table-cell">Hips</th>
                            <th className="px-3 py-2 hidden lg:table-cell">Notes</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
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
                                <button onClick={() => handleDeleteMeasurement(m.id)}
                                  className="p-1.5 text-neutral-600 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
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

            {/* Right — body weight chart */}
            <div>
              <Card className="card-style">
                <CardHeader className="pb-2"><CardTitle>Body Weight Trend</CardTitle></CardHeader>
                <CardContent>
                  {measurements.filter((m) => m.weight_lbs).length < 2 ? (
                    <p className="text-neutral-500 text-sm text-center py-6">Log 2+ measurements to see trend.</p>
                  ) : (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[...measurements].reverse()
                            .filter((m) => m.weight_lbs)
                            .map((m) => ({ date: m.date, weight: Number(m.weight_lbs) }))}
                          margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                          <XAxis dataKey="date" stroke="#737373" fontSize={10} />
                          <YAxis stroke="#737373" fontSize={10} width={45} domain={["auto", "auto"]} />
                          <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px" }} />
                          <Line type="monotone" dataKey="weight" stroke="#dc2626" strokeWidth={2}
                            dot={{ fill: "#dc2626", r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: PROGRESS
        ══════════════════════════════════════════ */}
        {activeTab === "Progress" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <ProgressChartCard chartOptions={chartOptions} chartExercise={chartExercise}
              setChartExercise={setChartExercise} chartData={chartData} fullHeight />

            {/* PR table */}
            <Card className="card-style">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-400" /> Personal Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(prMap).length === 0 ? (
                  <p className="text-neutral-500 text-sm text-center py-6">Log workouts to track PRs.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(prMap)
                      .sort((a, b) => b[1] - a[1])
                      .map(([exercise, weight]) => (
                        <div key={exercise} className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-800">
                          <span className="text-sm text-white">{exercise}</span>
                          <span className="text-sm font-bold text-red-400">{weight} lb</span>
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

// ── Sub-components ──────────────────────────────────────────

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
        {chartOptions.length === 0 ? (
          <p className="text-neutral-500 text-sm text-center py-6">Log workouts to see progress.</p>
        ) : (
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
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" stroke="#737373" fontSize={10} />
                  <YAxis stroke="#737373" fontSize={10} width={50} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px" }}
                    labelStyle={{ color: "#a3a3a3" }} />
                  <Line type="monotone" dataKey="volume" stroke="#dc2626" strokeWidth={2}
                    dot={{ fill: "#dc2626", r: 3 }} activeDot={{ r: 5 }} />
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
        <Button className="bg-neutral-800 hover:bg-neutral-700 w-full justify-start"
          disabled={entries.length === 0} onClick={onCSV}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
        <Button className="glow-btn w-full justify-start"
          disabled={entries.length === 0} onClick={onPDF}>
          <Download className="mr-2 h-4 w-4" /> Export PDF Report
        </Button>
        <p className="text-xs text-neutral-600">CSV works in Excel & Google Sheets.</p>
      </CardContent>
    </Card>
  );
}
