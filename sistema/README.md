# Brigada Camarão — Sistema de Gestão

Aplicação real (Next.js + Supabase) que substitui o protótipo estático em
`../` — este é o início do desenvolvimento do projeto completo fechado na
proposta comercial.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Postgres) — acesso via chave de serviço no servidor (ver nota de segurança abaixo)

## Como rodar localmente

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No SQL Editor do projeto, cole e execute o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql).
3. Copie `.env.example` para `.env.local` e preencha com os dados do seu
   projeto (Project Settings → API): `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
4. Instale as dependências e suba o servidor:

   ```bash
   npm install
   npm run dev
   ```

5. Acesse `http://localhost:3000`.

## O que já funciona

- **Painel** — KPIs reais (bombeiros ativos, pendências de documento, eventos, faturamento), consultando o banco.
- **Bombeiros** — listagem com status de ASO/E-Social/Credenciamento calculado automaticamente, e formulário de cadastro (Server Action, grava direto no Supabase).
- **Eventos & Escalas** — listagem de eventos (leitura). Faltam: formulário de criação de evento e a tela de escala por turno.
- **Financeiro** — página preparada, aguardando o módulo de Escalas para calcular custo/lucro automaticamente (mesma lógica já validada no protótipo).

## O que falta para o projeto completo

Conforme o escopo fechado na proposta:

- [ ] Formulário de criação de evento
- [ ] Tela de escala por turno (com bloqueio de bombeiros com documento vencido)
- [ ] Cálculo automático de custo/lucro por evento (módulo Financeiro)
- [ ] Contas a pagar (bombeiros) / a receber (cliente) com atualização de status
- [ ] Autenticação de usuários e controle de acesso por papel (operação / financeiro / direção) — ver Seção 9 do [levantamento de requisitos](../levantamento.html)
- [ ] Migração dos dados reais das planilhas atuais para o Supabase

## Nota de segurança

Este projeto ainda **não tem autenticação de usuários**. Por isso as consultas
usam a chave de serviço do Supabase (`SUPABASE_SERVICE_ROLE_KEY`), que roda
exclusivamente no servidor (Server Components e Server Actions, nunca no
navegador — reforçado pelo import `"server-only"` em
[`src/lib/supabase/server.ts`](./src/lib/supabase/server.ts)). O Row Level
Security do Postgres está propositalmente desligado até a autenticação ser
implementada; não exponha esta chave no cliente nem a comite no repositório.
