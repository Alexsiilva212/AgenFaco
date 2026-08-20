-- Rode isto uma vez no SQL Editor do Supabase (Project > SQL Editor > New query).

create table if not exists agenda_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Segurança: liga RLS e não cria nenhuma policy. Isso bloqueia a chave anônima
-- (a que fica exposta em código de frontend) de ler ou escrever na tabela.
-- Só a service role key (usada pelos endpoints em /api, no servidor) enxerga
-- esses dados — ela ignora RLS por padrão.
alter table agenda_kv enable row level security;
