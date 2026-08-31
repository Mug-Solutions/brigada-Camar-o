# Deploy no Google Cloud (Cloud Run)

Este sistema roda como container no Cloud Run — sem servidor próprio pra manter,
já que banco/autenticação/arquivos ficam inteiros no Supabase. O único componente
extra é o **Cloud Scheduler**, que substitui o cron que o job de vencimento de
documentos precisa (`POST /api/jobs/verificar-vencimentos`).

## Pré-requisitos

- Projeto no Google Cloud com faturamento ativo.
- `gcloud` CLI instalado e autenticado (`gcloud auth login`).
- Projeto Supabase já criado, com as migrações de `supabase/migrations/` aplicadas
  (na ordem, pelo SQL Editor do Supabase ou pela CLI do Supabase).
- Provedor de e-mail (Resend) e, se/quando decidido, WhatsApp Business API — ver
  `.env.example` pra saber quais variáveis cada integração precisa.

## 1. Ativar as APIs necessárias (uma vez por projeto)

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com secretmanager.googleapis.com
```

## 2. Criar o repositório de imagens (Artifact Registry)

```bash
gcloud artifacts repositories create brigada-camarao \
  --repository-format=docker \
  --location=southamerica-east1 \
  --description="Imagens do sistema Brigada Camarão"
```

Região sugerida: `southamerica-east1` (São Paulo) — mais perto do time e dos
usuários (bombeiros/clientes) que qualquer região americana ou europeia.

## 3. Guardar os segredos no Secret Manager

Nunca passe segredo nenhum como variável de ambiente em texto puro no comando de
deploy — usa Secret Manager e referencia por nome. Repita pra cada valor de
`.env.example` marcado como segredo (chave de serviço do Supabase, Resend, e o
`CRON_SECRET` que você mesmo gera):

```bash
echo -n "SEU_VALOR_AQUI" | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-
echo -n "SEU_VALOR_AQUI" | gcloud secrets create RESEND_API_KEY --data-file=-
# CRON_SECRET: gere um valor aleatório longo, não reaproveite nenhuma outra chave
openssl rand -hex 32 | gcloud secrets create CRON_SECRET --data-file=-
```

`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` não são segredo (a
anon key é feita pra ser pública — a proteção real é a RLS do banco) — podem ir
como variável de ambiente comum, não precisam de Secret Manager.

## 4. Build e push da imagem

```bash
cd sistema
gcloud builds submit --tag southamerica-east1-docker.pkg.dev/SEU_PROJETO/brigada-camarao/sistema
```

(Ou `docker build` + `docker push` local, se preferir não depender do Cloud Build.)

## 5. Deploy no Cloud Run

```bash
gcloud run deploy brigada-camarao \
  --image southamerica-east1-docker.pkg.dev/SEU_PROJETO/brigada-camarao/sistema \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co,NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY,SUPABASE_URL=https://SEU-PROJETO.supabase.co,SITE_URL=https://SEU-DOMINIO-FINAL \
  --set-secrets SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,RESEND_API_KEY=RESEND_API_KEY:latest,CRON_SECRET=CRON_SECRET:latest
```

`--allow-unauthenticated` é necessário — este é um sistema com login próprio
(Supabase Auth), não autenticação do Google Cloud; sem essa flag, o Cloud Run
bloquearia a requisição antes dela chegar no app.

Depois do primeiro deploy, pegue a URL gerada (`https://brigada-camarao-XXXX.run.app`
ou o domínio customizado, se configurado) e **atualize a variável `SITE_URL`** pra
esse valor real — é o que monta o link de convite por e-mail
(`src/app/(admin)/bombeiros/aprovacoes/actions.ts`). Redeploy depois de atualizar.

## 6. Cloud Scheduler pro job de vencimento de documentos

Substitui o "agendador externo" que a rota `/api/jobs/verificar-vencimentos`
(`src/app/api/jobs/verificar-vencimentos/route.ts`) já foi desenhada pra esperar.
Roda uma vez por dia, de manhã:

```bash
gcloud scheduler jobs create http verificar-vencimentos \
  --location southamerica-east1 \
  --schedule "0 8 * * *" \
  --uri "https://SUA-URL-DO-CLOUD-RUN/api/jobs/verificar-vencimentos" \
  --http-method POST \
  --headers "Authorization=Bearer SEU_CRON_SECRET" \
  --time-zone "America/Sao_Paulo"
```

Use o mesmo valor gravado no secret `CRON_SECRET` no passo 3. Sem esse header
correto, a rota recusa a chamada (falha fechada, de propósito — ver comentário
na própria rota).

## 7. Supabase: allowlist de redirect e Site URL

No painel do Supabase (Authentication → URL Configuration), depois do primeiro
deploy:

- **Site URL**: aponte para a URL final do Cloud Run (ou domínio customizado).
- **Redirect URLs**: adicione `https://SUA-URL-DO-CLOUD-RUN/convite` — sem isso,
  o link de convite por e-mail continua caindo em `localhost`, mesmo achado real
  documentado em `docs/decisoes-tecnicas.md` (seção sobre `SiteURL`/`RedirectTo`).

## Domínio customizado (opcional)

```bash
gcloud run domain-mappings create --service brigada-camarao --domain seu-dominio.com.br --region southamerica-east1
```

Depois de mapear, repita o passo 5 (`SITE_URL`) e o passo 7 (Supabase) apontando
pro domínio novo em vez da URL `*.run.app`.

## Deploys seguintes

Só repetir os passos 4 e 5 (build + deploy) — segredos e configuração do
Scheduler/Supabase não precisam ser refeitos.
