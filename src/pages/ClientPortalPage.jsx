import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import {
  Dumbbell, Target, Activity, Plus, X, Trophy, Calendar,
} from "lucide-react";
import { MUSCLE_GROUPS, EXERCISES_BY_MUSCLE, ALL_EXERCISES } from "@/constants/exercises";

function fmt(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}
function today() { return new Date().toISOString().slice(0, 10); }

const TABS = ["Workouts", "Goals", "Body"];

export default function ClientPortalPage() {
  const { clientRecord, session } = useAuth();
  const toast = useToast();

  const clientId  = clientRecord?.id;
  const trainerId = clientRecord?.trainer_id;

  const [activeTab,   setActiveTab]   = useState("Workouts");
  const [entries,     setEntries]     = useState([]);
  const [goals,       setGoals]       = useState([]);
  const [measurements,setMeasurements]= useState([]);
  const [loading,     setLoading]     = useState(true);

  // ── Workout form ──
  const [showForm, setShowForm]   = useState(false);
  const [saving,   setSaving]     = useState(false);
  const [form, setForm] = useState({
    date: today(), exercise: "Bench Press", muscle_group: "Chest", notes: "",
  });
  const [setRows, setSetRows] = useState([
    { reps: 8, weight: 135, rpe: "", label: "Work Set" },
  ]);

  // ── Measurements form ──
  const [showMForm, setShowMForm] = useState(false);
  const [mSaving,   setMSaving]   = useState(false);
  const [mForm, setMForm] = useState({
    date: today(),
    weight_lbs: "", body_fat_pct: "",
    waist_in: "", hips_in: "", chest_in: "",
    bicep_in: "", thigh_in: "", calf_in: "",
    notes: "",
  });

  // ── Fetch ──
  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const [{ data: e }, { data: g }, { data: m }] = await Promise.all([
      supabase.from("workout_entries")
        .select("*").eq("client_id", clientId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("client_goals")
        .select("*").eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      supabase.from("body_measurements")
        .select("*").eq("client_id", clientId)
        .order("date", { ascending: false }),
    ]);
    setEntries(e || []);
    setGoals(g || []);
    setMeasurements(m || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // ── PR map ──
  const prMap = useMemo(() => {
    const map = {};
    for (const e of entries)
      if (!map[e.exercise] || e.weight > map[e.exercise]) map[e.exercise] = e.weight;
    return map;
  }, [entries]);

  // ── Group workouts by date ──
  const grouped = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return Array.from(map.entries()).slice(0, 15);
  }, [entries]);

  // ── Quick stats ──
  const sessionCount = new Set(entries.map((e) => e.date)).size;
  const prCount      = Object.keys(prMap).length;
  const goalsDone    = goals.filter((g) => g.status === "achieved").length;

  // ── Set row helpers ──
  function updateRow(i, field, val) {
    setSetRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  }
  function addRow() {
    setSetRows((rows) => [
      ...rows,
      { reps: rows.at(-1)?.reps || 8, weight: rows.at(-1)?.weight || 135, rpe: "", label: "Work Set" },
    ]);
  }
  function removeRow(i) {
    setSetRows((rows) => rows.filter((_, idx) => idx !== i));
  }

  function changeMuscle(mg) {
    setForm((f) => ({ ...f, muscle_group: mg, exercise: EXERCISES_BY_MUSCLE[mg]?.[0] || "" }));
  }

  // ── Save workout ──
  async function handleSaveWorkout(e) {
    e.preventDefault();
    if (!setRows.length) { toast.error("Add at least one set."); return; }
    setSaving(true);
    try {
      const currentMax = prMap[form.exercise] || 0;
      const topWeight  = Math.max(...setRows.map((r) => Number(r.weight) || 0));
      const newEntries = [];

      for (const row of setRows) {
        const noteStr = [row.label ? `[${row.label}]` : "", form.notes].filter(Boolean).join(" ");
        const { data, error } = await supabase
          .from("workout_entries")
          .insert({
            client_id:    clientId,
            trainer_id:   trainerId,
            date:         form.date,
            exercise:     form.exercise,
            muscle_group: form.muscle_group,
            sets:         1,
            reps:         Number(row.reps) || 0,
            weight:       Number(row.weight) || 0,
            rpe:          row.rpe !== "" ? Number(row.rpe) : null,
            notes:        noteStr || null,
          })
          .select()
          .single();
        if (error) throw error;
        newEntries.push(data);
      }

      setEntries((prev) => [...newEntries, ...prev]);

      // PR notification
      if (topWeight > currentMax && trainerId) {
        await supabase.from("pr_notifications").insert({
          trainer_id:  trainerId,
          client_id:   clientId,
          client_name: clientRecord.name,
          exercise:    form.exercise,
          new_weight:  topWeight,
        });
        toast.success(`New PR on ${form.exercise}: ${topWeight} lbs! Trainer notified.`);
      } else {
        toast.success(`${setRows.length} set${setRows.length !== 1 ? "s" : ""} logged.`);
      }

      setShowForm(false);
      setSetRows([{ reps: 8, weight: 135, rpe: "", label: "Work Set" }]);
      setForm((f) => ({ ...f, notes: "" }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Save measurement ──
  async function handleSaveMeasurement(e) {
    e.preventDefault();
    setMSaving(true);
    try {
      const payload = { date: mForm.date, client_id: clientId, trainer_id: trainerId };
      const numKeys = ["weight_lbs","body_fat_pct","waist_in","hips_in","chest_in","bicep_in","thigh_in","calf_in"];
      numKeys.forEach((k) => { if (mForm[k] !== "") payload[k] = Number(mForm[k]); });
      if (mForm.notes) payload.notes = mForm.notes;

      const { data, error } = await supabase
        .from("body_measurements").insert(payload).select().single();
      if (error) throw error;

      setMeasurements((prev) => [data, ...prev]);
      toast.success("Measurements saved.");
      setShowMForm(false);
      setMForm({ date: today(), weight_lbs: "", body_fat_pct: "", waist_in: "", hips_in: "", chest_in: "", bicep_in: "", thigh_in: "", calf_in: "", notes: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMSaving(false);
    }
  }

  // ── Not linked ──
  if (!clientRecord) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Dumbbell className="h-12 w-12 text-neutral-600" />
          <p className="text-white font-semibold">Account not linked</p>
          <p className="text-neutral-400 text-sm">Ask your trainer to invite you to the portal.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Welcome */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">
          Hey, {clientRecord.name?.split(" ")[0]}
        </h2>
        <p className="text-neutral-400 text-sm mt-0.5">Track your progress and crush your goals.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-center">
          <p className="text-xs text-neutral-500 mb-1">Sessions</p>
          <p className="text-xl font-bold text-white">{sessionCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-center">
          <p className="text-xs text-neutral-500 mb-1">PRs</p>
          <p className="text-xl font-bold text-yellow-400">{prCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3 text-center">
          <p className="text-xs text-neutral-500 mb-1">Goals</p>
          <p className="text-xl font-bold text-emerald-400">{goalsDone}/{goals.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-1 gap-1">
        {TABS.map((t) => (
          <button
            key={t} type="button"
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── WORKOUTS ── */}
      {activeTab === "Workouts" && (
        <div>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 mb-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
            >
              <Plus className="h-5 w-5" /> Log Workout
            </button>
          ) : (
            <form
              onSubmit={handleSaveWorkout}
              className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Log Workout</h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-neutral-500 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Date</label>
                <input
                  type="date" value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm"
                />
              </div>

              {/* Muscle group */}
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Muscle Group</label>
                <select
                  value={form.muscle_group}
                  onChange={(e) => changeMuscle(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm"
                >
                  {MUSCLE_GROUPS.map((mg) => <option key={mg}>{mg}</option>)}
                </select>
              </div>

              {/* Exercise */}
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Exercise</label>
                <select
                  value={form.exercise}
                  onChange={(e) => setForm((f) => ({ ...f, exercise: e.target.value }))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm"
                >
                  {(EXERCISES_BY_MUSCLE[form.muscle_group] || ALL_EXERCISES).map((ex) => (
                    <option key={ex}>{ex}</option>
                  ))}
                </select>
                {prMap[form.exercise] && (
                  <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> Current PR: {prMap[form.exercise]} lbs
                  </p>
                )}
              </div>

              {/* Sets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-neutral-400">Sets</label>
                  <button type="button" onClick={addRow} className="text-xs text-red-400 flex items-center gap-1 hover:text-red-300">
                    <Plus className="h-3 w-3" /> Add Set
                  </button>
                </div>
                <div className="space-y-2">
                  {setRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2 bg-neutral-800 rounded-lg p-2.5">
                      <span className="text-xs text-neutral-500 w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-neutral-500 block mb-1">Reps</label>
                          <input
                            type="number" min="1" value={row.reps}
                            onChange={(e) => updateRow(i, "reps", e.target.value)}
                            className="w-full bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500 block mb-1">Weight (lbs)</label>
                          <input
                            type="number" min="0" step="2.5" value={row.weight}
                            onChange={(e) => updateRow(i, "weight", e.target.value)}
                            className="w-full bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-white text-sm"
                          />
                        </div>
                      </div>
                      {setRows.length > 1 && (
                        <button type="button" onClick={() => removeRow(i)} className="text-neutral-600 hover:text-red-400 shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="How did it feel?"
                  rows={2}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm resize-none"
                />
              </div>

              <button
                type="submit" disabled={saving}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {saving ? "Saving…" : `Save ${setRows.length} Set${setRows.length !== 1 ? "s" : ""}`}
              </button>
            </form>
          )}

          {/* History */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-neutral-800/50 animate-pulse" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <p className="text-center py-16 text-neutral-500">
              No workouts logged yet — hit the button above!
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map(([date, dayEntries]) => {
                const byExercise = dayEntries.reduce((acc, e) => {
                  (acc[e.exercise] = acc[e.exercise] || []).push(e);
                  return acc;
                }, {});
                return (
                  <div key={date} className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
                    <div className="px-4 py-3 bg-neutral-800/40 border-b border-neutral-800">
                      <p className="text-sm font-medium text-white">{fmt(date)}</p>
                      <p className="text-xs text-neutral-500">
                        {[...new Set(dayEntries.map((e) => e.muscle_group))].join(", ")}
                      </p>
                    </div>
                    <div className="divide-y divide-neutral-800/50">
                      {Object.entries(byExercise).map(([exercise, sets]) => {
                        const isPR = prMap[exercise] && sets.some((s) => s.weight >= prMap[exercise]);
                        return (
                          <div key={exercise} className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-sm font-medium text-white">{exercise}</p>
                              {isPR && (
                                <span className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Trophy className="h-3 w-3" /> PR
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {sets.map((s) => (
                                <span key={s.id} className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 rounded-md">
                                  {s.reps} × {s.weight} lbs{s.rpe ? ` @${s.rpe}` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── GOALS ── */}
      {activeTab === "Goals" && (
        <div>
          {goals.length === 0 ? (
            <p className="text-center py-16 text-neutral-500">Your trainer hasn't set any goals yet.</p>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => {
                const statusColor = {
                  active:    "text-blue-400",
                  achieved:  "text-emerald-400",
                  missed:    "text-red-400",
                  cancelled: "text-neutral-500",
                }[g.status] || "text-neutral-400";

                let pct = null;
                if (g.target_value != null && g.baseline_value != null) {
                  const range = g.target_value - g.baseline_value;
                  const curr  = g.current_value ?? g.baseline_value;
                  pct = range !== 0 ? Math.min(100, Math.max(0, Math.round(((curr - g.baseline_value) / range) * 100))) : 0;
                }

                return (
                  <div key={g.id} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-white">{g.title}</p>
                      <span className={`text-xs font-medium capitalize shrink-0 ${statusColor}`}>{g.status}</span>
                    </div>
                    {g.deadline && (
                      <p className="text-xs text-neutral-500 mb-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Target: {new Date(g.deadline + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    {pct !== null && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-neutral-500 mb-1">
                          <span>{g.baseline_value} {g.target_unit}</span>
                          <span>{g.target_value} {g.target_unit}</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 text-right">{pct}% complete</p>
                      </div>
                    )}
                    {g.notes && (
                      <p className="text-xs text-neutral-500 mt-2 italic">"{g.notes}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── BODY ── */}
      {activeTab === "Body" && (
        <div>
          {!showMForm ? (
            <button
              type="button"
              onClick={() => setShowMForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 mb-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
            >
              <Plus className="h-5 w-5" /> Log Measurements
            </button>
          ) : (
            <form
              onSubmit={handleSaveMeasurement}
              className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Body Measurements</h3>
                <button type="button" onClick={() => setShowMForm(false)} className="text-neutral-500 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Date</label>
                <input
                  type="date" value={mForm.date}
                  onChange={(e) => setMForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "weight_lbs",   label: "Weight (lbs)" },
                  { key: "body_fat_pct", label: "Body Fat %" },
                  { key: "waist_in",     label: "Waist (in)" },
                  { key: "hips_in",      label: "Hips (in)" },
                  { key: "chest_in",     label: "Chest (in)" },
                  { key: "bicep_in",     label: "Bicep (in)" },
                  { key: "thigh_in",     label: "Thigh (in)" },
                  { key: "calf_in",      label: "Calf (in)" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-neutral-400 mb-1 block">{label}</label>
                    <input
                      type="number" step="0.1" placeholder="—"
                      value={mForm[key] || ""}
                      onChange={(e) => setMForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Notes (optional)</label>
                <textarea
                  value={mForm.notes}
                  onChange={(e) => setMForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Optional…"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm resize-none"
                />
              </div>

              <button
                type="submit" disabled={mSaving}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {mSaving ? "Saving…" : "Save Measurements"}
              </button>
            </form>
          )}

          {measurements.length === 0 ? (
            <p className="text-center py-16 text-neutral-500">No measurements logged yet.</p>
          ) : (
            <div className="space-y-3">
              {measurements.slice(0, 15).map((m) => (
                <div key={m.id} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                  <p className="text-sm font-medium text-white mb-2">{fmt(m.date)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.weight_lbs   && <Chip label={`${m.weight_lbs} lbs`} highlight />}
                    {m.body_fat_pct && <Chip label={`${m.body_fat_pct}% BF`} />}
                    {m.waist_in     && <Chip label={`Waist ${m.waist_in}"`} />}
                    {m.hips_in      && <Chip label={`Hips ${m.hips_in}"`} />}
                    {m.chest_in     && <Chip label={`Chest ${m.chest_in}"`} />}
                    {m.bicep_in     && <Chip label={`Bicep ${m.bicep_in}"`} />}
                    {m.thigh_in     && <Chip label={`Thigh ${m.thigh_in}"`} />}
                    {m.calf_in      && <Chip label={`Calf ${m.calf_in}"`} />}
                  </div>
                  {m.notes && <p className="text-xs text-neutral-500 mt-2 italic">"{m.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

function Chip({ label, highlight }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-md ${highlight ? "bg-neutral-700 text-white font-medium" : "bg-neutral-800 text-neutral-300"}`}>
      {label}
    </span>
  );
}
