# Brigada Camarão — Sistema de Gestão

Sistema real (Next.js + Supabase) de gestão de bombeiros civis para eventos:
cadastro e compliance, clientes, eventos e escala, financeiro, Portal do
Bombeiro (PWA) e um painel administrativo com autenticação e permissões por
papel (staff/bombeiro).

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** — Postgres, Auth e Storage. Toda tabela sensível tem Row Level
  Security ligado; telas administrativas usam a chave de serviço no servidor
  (nunca exposta ao navegador — ver `src/lib/supabase/server.ts`), telas do
  Portal do Bombeiro usam a sessão do usuário logado, sujeita à RLS.

## Como rodar localmente

1. Crie um projeto no [supabase.com](https://supabase.com) (ou use o já
   existente do time).
2. Aplique as migrações de [`supabase/migrations/`](./supabase/migrations/)
   em ordem — pelo SQL Editor do Supabase ou pela CLI (`supabase db push`).
3. Copie `.env.example` para `.env.local` e preencha com os dados do projeto
   (Project Settings → API) e das integrações (Resend, cron secret) — cada
   variável tem um comentário explicando pra que serve.
4. Instale as dependências e suba o servidor:

   ```bash
   npm install
   npm run dev
   ```

5. Acesse `http://localhost:3000`. Sem `.env.local` preenchido, o sistema
   roda em modo de demonstração (dados fictícios, sem exigir login) — útil
   pra ver a interface sem configurar nada.

## Testes

```bash
npm run lint
npm run build
npx vitest run
```

## Deploy

Pensado pra rodar como container no Cloud Run (Google Cloud) — passo a passo
completo em [`docs/deploy-cloud-run.md`](./docs/deploy-cloud-run.md).

```bash
docker build -t brigada-camarao .
docker run -p 8080:8080 --env-file .env.local brigada-camarao
```

## Estrutura

- `src/app/(admin)/` — telas administrativas (staff): painel, bombeiros,
  clientes, eventos & escalas, financeiro, preços, auditoria.
- `src/app/portal/` — Portal do Bombeiro (PWA instalável): escala,
  documentos, disponibilidade, dados pessoais.
- `src/app/api/` — rotas HTTP: exportações CSV, job diário de vencimento de
  documento, leitura segura de documento anexado.
- `src/lib/` — regras de negócio e integrações (auth, e-mail, WhatsApp,
  validação, cálculo financeiro).
- `supabase/migrations/` — histórico incremental do schema, em ordem.

## Histórico de decisões

Todo trade-off de arquitetura, achado de segurança e decisão de escopo
tomado durante a construção está registrado, com data e motivo, em
[`../docs/decisoes-tecnicas.md`](../docs/decisoes-tecnicas.md).
