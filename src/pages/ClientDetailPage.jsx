import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useClients } from "@/hooks/useClients";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Save,
  Trash2,
  Download,
  ChevronLeft,
  TrendingUp,
  BarChart2,
  Activity,
  Dumbbell,
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
  el.style.display = "none";
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, loading: clientsLoading } = useClients();
  const { entries, loading: entriesLoading, addEntry, deleteEntry } = useWorkouts(id);

  const client = clients.find((c) => c.id === id);

  const [form, setForm] = useState({
    date: formatDateISO(),
    exercise: "Bench Press",
    muscle_group: "Chest",
    sets: 3,
    reps: 10,
    weight: 135,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [chartExercise, setChartExercise] = useState("");

  // Update exercise list when muscle_group changes
  function update(k, v) {
    if (k === "muscle_group") {
      const exForGroup = EXERCISES_BY_MUSCLE[v]?.[0] || "";
      setForm((f) => ({ ...f, muscle_group: v, exercise: exForGroup }));
    } else {
      setForm((f) => ({ ...f, [k]: v }));
    }
  }

  const showSuggest = Number(form.reps) >= 12;
  const suggestedWeight = useMemo(() => {
    const w = Number(form.weight) || 0;
    return Math.round(w * 1.03 * 2) / 2;
  }, [form.weight]);

  // Chart options — unique exercises from entries
  const chartOptions = useMemo(() => {
    const set = new Set(entries.map((e) => e.exercise));
    return Array.from(set);
  }, [entries]);

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
    const totalVolume = entries.reduce((sum, e) => sum + e.sets * e.reps * e.weight, 0);
    const byExercise = {};
    for (const e of entries) {
      const v = e.sets * e.reps * e.weight;
      byExercise[e.exercise] = (byExercise[e.exercise] || 0) + v;
    }
    const topExercise = Object.entries(byExercise).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const uniqueDates = new Set(entries.map((e) => e.date)).size;
    return { sessions: entries.length, totalVolume, topExercise, uniqueDates };
  }, [entries]);

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      await addEntry({
        ...form,
        sets: Number(form.sets),
        reps: Number(form.reps),
        weight: Number(form.weight),
      });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteEntry(id);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  }

  function exportCSV() {
    if (!client) return;
    const headers = ["date", "exercise", "muscle_group", "sets", "reps", "weight", "notes"];
    const lines = [headers.join(",")];
    for (const e of entries) {
      lines.push(
        [e.date, e.exercise, e.muscle_group, e.sets, e.reps, e.weight, (e.notes || "").replace(/,/g, ";")].join(",")
      );
    }
    downloadText(`${client.name.replace(/\s+/g, "_")}_workouts.csv`, lines.join("\n"));
  }

  async function exportPDF() {
    const el = document.getElementById("pdf-export-area");
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: "#0a0a0a", scale: 1.5 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${client?.name?.replace(/\s+/g, "_") || "client"}_report.pdf`);
  }

  if (clientsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500 animate-pulse">Loading…</div>
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-neutral-400">Client not found.</p>
          <Button className="mt-4 glow-btn" onClick={() => navigate("/")}>
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const exercisesForGroup = EXERCISES_BY_MUSCLE[form.muscle_group] || ALL_EXERCISES;

  return (
    <Layout>
      {/* Back + Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Clients
        </button>
        <span className="text-neutral-600">/</span>
        <h2 className="text-2xl font-bold text-white">{client.name}</h2>
        {client.email && (
          <span className="text-sm text-neutral-400 hidden sm:block">{client.email}</span>
        )}
      </div>

      {/* Stats bar */}
      <div id="pdf-export-area">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={<Activity />} label="Entries" value={stats.sessions} />
          <StatCard icon={<BarChart2 />} label="Sessions" value={stats.uniqueDates} />
          <StatCard
            icon={<TrendingUp />}
            label="Total Volume"
            value={Intl.NumberFormat().format(Math.round(stats.totalVolume)) + " lb"}
          />
          <StatCard icon={<Dumbbell />} label="Top Exercise" value={stats.topExercise} />
        </div>

        {/* Main 2-col grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT — Form + Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Workout Form */}
            <Card className="card-style">
              <CardHeader className="pb-2">
                <CardTitle>Log Workout</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-neutral-300">Date</Label>
                    <Input
                      type="date"
                      className="bg-neutral-800 border-neutral-700 mt-1"
                      value={form.date}
                      onChange={(e) => update("date", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-neutral-300">Muscle Group</Label>
                    <Select value={form.muscle_group} onValueChange={(v) => update("muscle_group", v)}>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        {MUSCLE_GROUPS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-neutral-300">Exercise</Label>
                    <Select value={form.exercise} onValueChange={(v) => update("exercise", v)}>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        {exercisesForGroup.map((ex) => (
                          <SelectItem key={ex} value={ex}>{ex}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-neutral-300">Sets</Label>
                    <Input
                      type="number"
                      className="bg-neutral-800 border-neutral-700 mt-1"
                      value={form.sets}
                      min={1}
                      onChange={(e) => update("sets", e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-neutral-300">Reps</Label>
                    <Input
                      type="number"
                      className="bg-neutral-800 border-neutral-700 mt-1"
                      value={form.reps}
                      min={1}
                      onChange={(e) => update("reps", e.target.value)}
                    />
                    {showSuggest && (
                      <p className="mt-1 text-xs text-emerald-400">
                        Hit {form.reps} reps — consider increasing to ~{suggestedWeight} lbs next session.
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-neutral-300">Weight (lbs)</Label>
                    <Input
                      type="number"
                      className="bg-neutral-800 border-neutral-700 mt-1"
                      value={form.weight}
                      min={0}
                      step="0.5"
                      onChange={(e) => update("weight", e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-neutral-300">Notes</Label>
                    <Textarea
                      className="bg-neutral-800 border-neutral-700 min-h-[72px] mt-1"
                      placeholder="Tempo, RIR, cues, superset, etc."
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                    />
                  </div>

                  {saveError && (
                    <p className="sm:col-span-2 text-sm text-red-400">{saveError}</p>
                  )}

                  <div className="sm:col-span-2">
                    <Button type="submit" className="glow-btn" disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving…" : "Save Entry"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Workout Table */}
            <Card className="card-style">
              <CardHeader className="pb-2">
                <CardTitle>
                  Recent Entries{" "}
                  <span className="text-neutral-500 font-normal text-sm">
                    ({entries.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {entriesLoading ? (
                  <div className="text-center py-8 text-neutral-500 animate-pulse">Loading…</div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500">
                    No entries yet. Log your first session above.
                  </div>
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
                          <th className="px-3 py-2 hidden md:table-cell">Volume</th>
                          <th className="px-3 py-2 hidden lg:table-cell">Notes</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e) => {
                          const vol = e.sets * e.reps * e.weight;
                          return (
                            <tr key={e.id} className="border-b border-neutral-800 hover:bg-neutral-800/30">
                              <td className="px-3 py-2 text-neutral-300">{e.date}</td>
                              <td className="px-3 py-2 font-medium">{e.exercise}</td>
                              <td className="px-3 py-2 text-neutral-400 hidden sm:table-cell">{e.muscle_group}</td>
                              <td className="px-3 py-2">{e.sets}</td>
                              <td className="px-3 py-2">{e.reps}</td>
                              <td className="px-3 py-2 text-red-400">{e.weight}lb</td>
                              <td className="px-3 py-2 text-neutral-400 hidden md:table-cell">
                                {Intl.NumberFormat().format(vol)}
                              </td>
                              <td className="px-3 py-2 max-w-[200px] truncate text-neutral-500 hidden lg:table-cell" title={e.notes}>
                                {e.notes}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => handleDelete(e.id)}
                                  className="p-1.5 text-neutral-600 hover:text-red-500 hover:bg-red-900/20 rounded transition-colors"
                                >
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

          {/* RIGHT — Chart + Export */}
          <div className="space-y-6">
            {/* Progress Chart */}
            <Card className="card-style">
              <CardHeader className="pb-2">
                <CardTitle>Progress Chart</CardTitle>
              </CardHeader>
              <CardContent>
                {chartOptions.length === 0 ? (
                  <p className="text-neutral-500 text-sm text-center py-6">
                    Log workouts to see progress.
                  </p>
                ) : (
                  <>
                    <div className="mb-3">
                      <Select value={chartExercise} onValueChange={setChartExercise}>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700">
                          {chartOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                          <XAxis dataKey="date" stroke="#737373" fontSize={10} />
                          <YAxis stroke="#737373" fontSize={10} width={50} />
                          <Tooltip
                            contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: "8px" }}
                            labelStyle={{ color: "#a3a3a3" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="volume"
                            stroke="#dc2626"
                            strokeWidth={2}
                            dot={{ fill: "#dc2626", r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2 text-center">
                      Volume = Sets × Reps × Weight (lb)
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Export */}
            <Card className="card-style">
              <CardHeader className="pb-2">
                <CardTitle>Export</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 w-full justify-start"
                  disabled={entries.length === 0}
                  onClick={exportCSV}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  className="glow-btn w-full justify-start"
                  disabled={entries.length === 0}
                  onClick={exportPDF}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF Report
                </Button>
                <p className="text-xs text-neutral-500">
                  CSV works in Excel & Google Sheets.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 shadow-lg shadow-red-900/20">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-red-600 h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      </div>
      <div className="text-lg font-bold text-white truncate">{value}</div>
    </div>
  );
}
