# Agenda Facoemulsificação

App de controle de presença e atendimento da agenda de facoemulsificação
(recepção → centro cirúrgico → administração), em React + Vite, com os
dados guardados no Supabase.

## 1. Criar o banco no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (grátis).
2. Vá em **SQL Editor > New query**, cole o conteúdo de
   `supabase/schema.sql` e rode. Isso cria a tabela `agenda_kv`, onde
   ficam guardados a base de pacientes e as senhas de acesso.
3. Vá em **Project Settings > API** e copie dois valores:
   - **Project URL** → variável `SUPABASE_URL`
   - **service_role key** (não é a `anon` key — é a secreta, "service_role") → variável `SUPABASE_SERVICE_ROLE_KEY`

A `service_role key` dá acesso total ao banco, então ela **nunca** vai
para o navegador — só é usada dentro dos arquivos em `/api`, que rodam no
servidor da Vercel.

## 2. Configurar as variáveis de ambiente

**Local:** copie `.env.example` para `.env.local` e preencha os dois
valores.

**Na Vercel:** Project Settings > Environment Variables, adicione
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` com os mesmos valores.

## 3. Rodar localmente

Como o app agora depende dos endpoints em `/api`, rodar só com `vite dev`
não é suficiente pra testar essa parte (o Vite não executa funções
serverless). Duas opções:

```bash
npm install
npx vercel dev
```

(`vercel dev` pede login gratuito na CLI da Vercel na primeira vez, mas
roda tudo — frontend e `/api` — junto, exatamente como em produção.)

Se quiser só ver as telas sem mexer no banco, `npm run dev` funciona
normalmente — as chamadas a `/api` vão falhar silenciosamente e o app
usa a base vazia / senhas padrão.

## 4. Subir no GitHub

```bash
git init
git add .
git commit -m "Agenda Facoemulsificação"
git branch -M main
git remote add origin <url-do-seu-repositorio>
git push -u origin main
```

## 5. Hospedar na Vercel

1. Importe o repositório em [vercel.com](https://vercel.com).
2. Confirme que `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão
   preenchidas nas variáveis de ambiente do projeto (passo 2).
3. Deploy. A Vercel builda o Vite (`vite build` → `dist`) e publica as
   funções de `/api` automaticamente — nenhuma configuração extra.

## Estrutura

```
├── api/
│   ├── base.js          # GET/POST da base de pacientes (Supabase)
│   └── senhas.js         # GET/POST das senhas de acesso (Supabase)
├── lib/
│   └── supabase.js        # cliente Supabase (service role) compartilhado
├── supabase/
│   └── schema.sql          # SQL para criar a tabela agenda_kv
├── src/
│   ├── App.jsx               # o app inteiro (telas, lógica, estilos)
│   └── main.jsx                # ponto de entrada do React
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

## Como os dados ficam guardados

Tudo passa por uma única tabela, `agenda_kv`, com duas linhas:

| key      | value                                       |
|----------|----------------------------------------------|
| `base`   | `{ pacientes: [...], ultimaCarga: "..." }`    |
| `senhas` | `{ recepcao, centro, admin }`                 |

Simples de propósito — é só um par chave/valor. Se um dia quiser
consultas mais ricas (relatórios por período, histórico por paciente
etc.), dá pra evoluir para uma tabela `pacientes` de verdade, uma linha
por paciente; me avisa que ajusto os endpoints.
