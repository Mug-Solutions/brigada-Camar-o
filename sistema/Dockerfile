# Build multi-stage pensado pro Cloud Run (Google Cloud) — sem
# servidor próprio pra manter: banco/auth/storage ficam inteiros no
# Supabase, então esta imagem só precisa saber rodar o Next.js.
#
# node:22-slim (Debian, não Alpine) de propósito: o Tailwind v4 usa um
# motor nativo (@tailwindcss/oxide, Rust) com binário por plataforma —
# Alpine usa musl libc, que historicamente dá mais dor de cabeça com
# esse tipo de dependência nativa do que glibc (slim). A imagem fica um
# pouco maior, mas evita depurar um build quebrado só por causa da libc.

# ---- deps: só instala dependências, cacheável entre builds ----
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compila o Next.js com output "standalone" ----
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: imagem final, só o necessário pra rodar em produção ----
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Roda como usuário sem privilégio — não como root dentro do container.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# "standalone" (ver next.config.ts) já traz um server.js com só os
# node_modules realmente usados — não precisa copiar node_modules
# inteiro nem package.json pra essa camada final.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run injeta a env var PORT em runtime (padrão 8080) — o
# server.js gerado pelo output standalone já respeita isso sozinho.
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
