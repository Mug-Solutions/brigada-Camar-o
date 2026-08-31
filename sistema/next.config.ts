import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota um server.js mínimo com só as dependências realmente
  // usadas (trace automático) — é o formato que o Dockerfile deste
  // projeto espera pra rodar no Cloud Run. Sem isso, a imagem levaria
  // o node_modules inteiro (centenas de MB) pra dentro do container.
  output: "standalone",
  // Trava a raiz do rastreamento de arquivos explicitamente. Sem isso,
  // o build (rodando em C:\Users\Gabriel Barcelos\...\prototipo\sistema)
  // vem avisando "ignored package-lock.json... outside the current Git
  // repository" — o Next.js tenta inferir a raiz sozinho e se confunde
  // com um lockfile solto na pasta pessoal do Windows, fora do projeto.
  // Dentro do Docker isso nem apareceria (o container só enxerga o que
  // foi copiado pra dentro dele), mas travar aqui deixa o output
  // standalone determinístico em qualquer ambiente, sem depender de
  // inferência — e é a prática recomendada pra esse tipo de output.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    serverActions: {
      // Precisa cobrir os dois maiores uploads do sistema: import de CSV
      // de bombeiros (até 2MB) e anexo de documento — ASO/credenciamento/
      // curso, até 5MB (src/lib/documentos.ts) — sem isso o Next.js
      // rejeita com 413 genérico antes mesmo da Server Action rodar
      // (achado real de revisão de segurança na Fase 5, mesma causa).
      bodySizeLimit: "6mb",
      // Sem isso, toda Server Action (login, candidatar-se, aprovar, etc.)
      // dá "Invalid Server Actions request." ao acessar por um domínio
      // diferente do que o Next.js espera — proteção padrão contra CSRF
      // que compara o header Origin com o host esperado. Necessário só em
      // dev, pra testar pelo VS Code Dev Tunnel e pela rede local (celular
      // simulando o Portal do bombeiro); em produção o domínio real já bate
      // com o host, então isso não abre brecha nenhuma lá.
      allowedOrigins:
        process.env.NODE_ENV === "development"
          ? ["localhost:3000", "192.168.2.157:3000", "*.devtunnels.ms"]
          : undefined,
    },
  },
};

export default nextConfig;
