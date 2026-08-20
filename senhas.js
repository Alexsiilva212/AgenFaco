import { getSupabase } from "../lib/supabase.js";

// -----------------------------------------------------------------------------
// Senhas de acesso dos setores, guardadas no Supabase na tabela agenda_kv
// (chave "senhas").
// GET  -> devolve { recepcao, centro, admin } (ou null se ainda não existe —
//         nesse caso o app usa os padrões definidos no frontend)
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
      .eq("key", "senhas")
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ? data.value : null);
  }

  if (req.method === "POST") {
    const payload = req.body; // { recepcao: "...", centro: "...", admin: "..." }
    const { error } = await supabase
      .from("agenda_kv")
      .upsert({ key: "senhas", value: payload, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
