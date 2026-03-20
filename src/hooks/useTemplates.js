import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function useTemplates() {
  const { session } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("workout_templates")
      .select("*, template_exercises(*)")
      .order("created_at", { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  }, [session]);

  useEffect(() => { fetch(); }, [fetch]);

  async function addTemplate({ name, description, exercises }) {
    const { data: tmpl, error } = await supabase
      .from("workout_templates")
      .insert({ name, description, trainer_id: session.user.id })
      .select().single();
    if (error) throw error;

    if (exercises?.length) {
      const rows = exercises.map((ex, i) => ({
        ...ex, template_id: tmpl.id, trainer_id: session.user.id, order_index: i,
      }));
      const { error: exErr } = await supabase.from("template_exercises").insert(rows);
      if (exErr) throw exErr;
    }

    await fetch();
    return tmpl;
  }

  async function deleteTemplate(id) {
    const { error } = await supabase.from("workout_templates").delete().eq("id", id);
    if (error) throw error;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  async function addExerciseToTemplate(templateId, exercise) {
    const existing = templates.find((t) => t.id === templateId);
    const order_index = existing?.template_exercises?.length || 0;
    const { data, error } = await supabase
      .from("template_exercises")
      .insert({ ...exercise, template_id: templateId, trainer_id: session.user.id, order_index })
      .select().single();
    if (error) throw error;
    setTemplates((prev) => prev.map((t) =>
      t.id === templateId
        ? { ...t, template_exercises: [...(t.template_exercises || []), data] }
        : t
    ));
    return data;
  }

  async function removeExerciseFromTemplate(exerciseId) {
    const { error } = await supabase.from("template_exercises").delete().eq("id", exerciseId);
    if (error) throw error;
    setTemplates((prev) => prev.map((t) => ({
      ...t,
      template_exercises: (t.template_exercises || []).filter((e) => e.id !== exerciseId),
    })));
  }

  return { templates, loading, addTemplate, deleteTemplate, addExerciseToTemplate, removeExerciseFromTemplate, refetch: fetch };
}
