import { createClient } from "@supabase/supabase-js";

let client = null;

// Reaproveita a mesma conexão entre chamadas (quando a função serverless
// fica "quente"). Usa a service role key — ela só existe aqui no servidor,
// nunca é enviada para o navegador.
export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltam as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. " +
        "Configure-as no projeto da Vercel (e em .env.local para rodar localmente)."
    );
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
