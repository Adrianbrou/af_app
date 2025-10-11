import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, Trash2, Download } from "lucide-react";

// ===============================================
// AF_APP (Adrian Fit App) — v2 Visual Power-Up
// ===============================================

const STORAGE_KEY = "af_app_v2";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatDateISO(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

function download(filename, text) {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Triceps",
  "Biceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Full Body",
];

const DEFAULT_EXERCISES = [
  "Bench Press",
  "Incline DB Press",
  "Lat Pulldown",
  "Seated Row",
  "Squat",
  "RDL",
  "Hip Thrust",
  "Overhead Press",
  "Lateral Raise",
  "Bicep Curl",
  "Tricep Pressdown",
  "Bulgarian Split Squat",
];

export default function AF_APP() {
  const [data, setData] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const firstId = uid();
    return {
      selectedClientId: firstId,
      clients: [{ id: firstId, name: "Adrian", entries: [] }],
    };
  });

  const selectedClient = useMemo(
    () => data.clients.find((c) => c.id === data.selectedClientId),
    [data]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-900 to-red-950 text-white font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b border-red-600/40 bg-black/80 backdrop-blur-md shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            <span className="text-red-600">AF</span>_APP
            <span className="text-neutral-400 text-sm ml-2 font-light">
              Workout Tracker
            </span>
          </h1>
          <div className="flex gap-3">
            <button className="glow-btn">🔥 New Workout</button>
            <button className="glow-btn bg-neutral-800 hover:bg-neutral-700">
              📊 Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-3">
        <section className="lg:col-span-3">
          <ClientBar data={data} setData={setData} />
        </section>

        <section className="lg:col-span-2 space-y-6">
          <WorkoutForm data={data} setData={setData} />
          <WorkoutTable data={data} setData={setData} />
        </section>

        <section className="space-y-6">
          <Dashboard data={data} />
          <ProgressChart data={data} />
          <ExportCard data={data} />
        </section>
      </main>
    </div>
  );
}

// ===============================================
// CLIENT BAR
// ===============================================
function ClientBar({ data, setData }) {
  const [name, setName] = useState("");

  function addClient() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = uid();
    const newClient = { id, name: trimmed, entries: [] };
    setData({
      ...data,
      selectedClientId: id,
      clients: [...data.clients, newClient],
    });
    setName("");
  }

  function removeClient(id) {
    const newClients = data.clients.filter((c) => c.id !== id);
    const newSelected = newClients[0]?.id ?? null;
    setData({ ...data, clients: newClients, selectedClientId: newSelected });
  }

  return (
    <Card className="card-style">
      <CardHeader className="pb-2">
        <CardTitle>Clients</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        <div className="w-full md:w-64">
          <Label className="text-neutral-300">Select Client</Label>
          <Select
            value={data.selectedClientId || undefined}
            onValueChange={(v) => setData({ ...data, selectedClientId: v })}
          >
            <SelectTrigger className="bg-neutral-800 border-neutral-700">
              <SelectValue placeholder="Choose client" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700">
              {data.clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Label className="text-neutral-300">Add New Client</Label>
          <div className="flex gap-2">
            <Input
              className="bg-neutral-800 border-neutral-700"
              placeholder="Client name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addClient()}
            />
            <Button onClick={addClient} className="glow-btn">
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
        </div>

        <div className="md:ml-auto">
          <Button
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
            disabled={!data.selectedClientId}
            onClick={() => removeClient(data.selectedClientId)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Remove Selected
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ===============================================
// WORKOUT FORM
// ===============================================
function WorkoutForm({ data, setData }) {
  const client = data.clients.find((c) => c.id === data.selectedClientId);
  const [form, setForm] = useState({
    date: formatDateISO(),
    exercise: "Bench Press",
    muscleGroup: "Chest",
    sets: 3,
    reps: 10,
    weight: 135,
    notes: "",
  });

  const showSuggest = form.reps >= 12;
  const suggestedWeight = useMemo(() => {
    const w = Number(form.weight) || 0;
    return Math.round(w * 1.03 * 2) / 2;
  }, [form.weight]);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addEntry() {
    if (!client) return;
    const entry = {
      id: uid(),
      ...form,
      sets: Number(form.sets),
      reps: Number(form.reps),
      weight: Number(form.weight),
    };
    const newClients = data.clients.map((c) =>
      c.id === client.id ? { ...c, entries: [entry, ...c.entries] } : c
    );
    setData({ ...data, clients: newClients });
  }

  return (
    <Card className="card-style">
      <CardHeader className="pb-2">
        <CardTitle>Log Workout</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <Label className="text-neutral-300">Date</Label>
          <Input
            type="date"
            className="bg-neutral-800 border-neutral-700"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-neutral-300">Exercise</Label>
          <Select value={form.exercise} onValueChange={(v) => update("exercise", v)}>
            <SelectTrigger className="bg-neutral-800 border-neutral-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700">
              {DEFAULT_EXERCISES.map((ex) => (
                <SelectItem key={ex} value={ex}>
                  {ex}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-neutral-300">Muscle Group</Label>
          <Select
            value={form.muscleGroup}
            onValueChange={(v) => update("muscleGroup", v)}
          >
            <SelectTrigger className="bg-neutral-800 border-neutral-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700">
              {MUSCLE_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-neutral-300">Sets</Label>
          <Input
            type="number"
            className="bg-neutral-800 border-neutral-700"
            value={form.sets}
            min={1}
            onChange={(e) => update("sets", Number(e.target.value))}
          />
        </div>
        <div>
          <Label className="text-neutral-300">Reps</Label>
          <Input
            type="number"
            className="bg-neutral-800 border-neutral-700"
            value={form.reps}
            min={1}
            onChange={(e) => update("reps", Number(e.target.value))}
          />
          {showSuggest && (
            <p className="mt-1 text-xs text-emerald-400">
              Hit {form.reps} reps — consider increasing to ~{suggestedWeight} lbs next session.
            </p>
          )}
        </div>
        <div>
          <Label className="text-neutral-300">Weight (lbs)</Label>
          <Input
            type="number"
            className="bg-neutral-800 border-neutral-700"
            value={form.weight}
            min={0}
            step="0.5"
            onChange={(e) => update("weight", Number(e.target.value))}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-neutral-300">Notes</Label>
          <Textarea
            className="bg-neutral-800 border-neutral-700 min-h-[80px]"
            placeholder="Tempo, RIR, cues, superset partner, etc."
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>
        <div className="md:col-span-2 flex gap-2">
          <Button onClick={addEntry} className="glow-btn">
            <Save className="mr-2 h-4 w-4" /> Save Entry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ===============================================
// WORKOUT TABLE
// ===============================================
function WorkoutTable({ data, setData }) {
  const client = data.clients.find((c) => c.id === data.selectedClientId);
  if (!client) return null;

  function removeEntry(id) {
    const newClients = data.clients.map((c) =>
      c.id === client.id
        ? { ...c, entries: c.entries.filter((e) => e.id !== id) }
        : c
    );
    setData({ ...data, clients: newClients });
  }

  return (
    <Card className="card-style">
      <CardHeader className="pb-2">
        <CardTitle>Recent Entries ({client.name})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800">
              <tr className="text-left">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Exercise</th>
                <th className="px-3 py-2">Muscle</th>
                <th className="px-3 py-2">Sets</th>
                <th className="px-3 py-2">Reps</th>
                <th className="px-3 py-2">Weight</th>
                <th className="px-3 py-2">Volume</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {client.entries.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-6 text-center text-neutral-400"
                  >
                    No entries yet. Log your first session above.
                  </td>
                </tr>
              )}
              {client.entries.map((e) => {
                const vol = e.sets * e.reps * e.weight;
                return (
                  <tr key={e.id} className="border-b border-neutral-800">
                    <td className="px-3 py-2">{e.date}</td>
                    <td className="px-3 py-2">{e.exercise}</td>
                    <td className="px-3 py-2">{e.muscleGroup}</td>
                    <td className="px-3 py-2">{e.sets}</td>
                    <td className="px-3 py-2">{e.reps}</td>
                    <td className="px-3 py-2">{e.weight} lb</td>
                    <td className="px-3 py-2">
                      {Intl.NumberFormat().format(vol)}
                    </td>
                    <td
                      className="px-3 py-2 max-w-[280px] truncate"
                      title={e.notes}
                    >
                      {e.notes}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                        onClick={() => removeEntry(e.id)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ===============================================
// DASHBOARD + PROGRESS
// ===============================================
function Dashboard({ data }) {
  const client = data.clients.find((c) => c.id === data.selectedClientId);
  const { sessions, totalVolume, topExercise } = useMemo(() => {
    if (!client) return { sessions: 0, totalVolume: 0, topExercise: "—" };
    const sessions = client.entries.length;
    const totalVolume = client.entries.reduce(
      (sum, e) => sum + e.sets * e.reps * e.weight,
      0
    );
    const byExercise = {};
    for (const e of client.entries) {
      const v = e.sets * e.reps * e.weight;
      byExercise[e.exercise] = (byExercise[e.exercise] || 0) + v;
    }
    const topExercise =
      Object.entries(byExercise).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { sessions, totalVolume, topExercise };
  }, [data]);

  return (
    <Card className="card-style">
      <CardHeader className="pb-2">
        <CardTitle>Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        <Stat label="Sessions" value={sessions} />
        <Stat
          label="Total Volume"
          value={Intl.NumberFormat().format(Math.round(totalVolume)) + " lb"}
        />
        <Stat label="Top Exercise" value={topExercise} />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center shadow-lg shadow-red-900/30">
      <div className="text-xs uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-red-500">{value}</div>
    </div>
  );
}

// ===============================================
// PROGRESS CHART + EXPORT
// ===============================================
function ProgressChart({ data }) {
  const client = data.clients.find((c) => c.id === data.selectedClientId);
  const [exercise, setExercise] = useState("");

  const options = useMemo(() => {
    if (!client) return [];
    const set = new Set(client.entries.map((e) => e.exercise));
    return Array.from(set);
  }, [data]);

  useEffect(() => {
    if (!exercise && options.length) setExercise(options[0]);
  }, [options, exercise]);

  const chartData = useMemo(() => {
    if (!client || !exercise) return [];
    const map = new Map();
    for (const e of client.entries.filter((x) => x.exercise === exercise)) {
      const vol = e.sets * e.reps * e.weight;
      map.set(e.date, (map.get(e.date) || 0) + vol);
    }
    return Array.from(map.entries())
      .map(([date, volume]) => ({ date, volume }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data, exercise]);

  return (
    <Card className="card-style">
      <CardHeader className="pb-2">
        <CardTitle>Progress Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center gap-2">
          <Label className="text-neutral-300">Exercise</Label>
          <Select value={exercise} onValueChange={setExercise}>
            <SelectTrigger className="w-60 bg-neutral-800 border-neutral-700">
              <SelectValue placeholder="Pick exercise" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700">
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" stroke="#a3a3a3" fontSize={12} />
              <YAxis stroke="#a3a3a3" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#111",
                  border: "1px solid #333",
                }}
              />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ExportCard({ data }) {
  const client = data.clients.find((c) => c.id === data.selectedClientId);

  function toCSV(entries) {
    const headers = [
      "date",
      "exercise",
      "muscleGroup",
      "sets",
      "reps",
      "weight",
      "notes",
    ];
    const lines = [headers.join(",")];
    for (const e of entries) {
      const row = [
        e.date,
        e.exercise,
        e.muscleGroup,
        e.sets,
        e.reps,
        e.weight,
        (e.notes || "").replaceAll(",", ";"),
      ];
      lines.push(row.join(","));
    }
    return lines.join("\n");
  }

  return (
    <Card className="card-style">
      <CardHeader className="pb-2">
        <CardTitle>Export</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button
          className="glow-btn bg-neutral-800 hover:bg-neutral-700"
          disabled={!client || client.entries.length === 0}
          onClick={() => {
            if (!client) return;
            const csv = toCSV(client.entries);
            download(`${client.name.replaceAll(" ", "_")}_workouts.csv`, csv);
          }}
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV (Client)
        </Button>
        <p className="text-xs text-neutral-400">
          CSV opens in Google Sheets / Excel. PDF export will come in Phase 2.
        </p>
      </CardContent>
    </Card>
  );
}
