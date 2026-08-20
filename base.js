import { getSupabase } from "../lib/supabase.js";

// -----------------------------------------------------------------------------
// Base de pacientes, guardada no Supabase na tabela agenda_kv (chave "base").
// GET  -> devolve { pacientes, ultimaCarga } (ou null se ainda não existe)
// POST -> recebe o mesmo formato e salva
// -----------------------------------------------------------------------------

export default async function handler(req, res) {
  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("agenda_kv")
      .select("value")
      .eq("key", "base")
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ? data.value : null);
  }

  if (req.method === "POST") {
    const payload = req.body; // { pacientes: [...], ultimaCarga: "..." }
    const { error } = await supabase
      .from("agenda_kv")
      .upsert({ key: "base", value: payload, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
