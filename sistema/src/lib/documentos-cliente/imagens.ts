import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Imagens dos documentos, lidas do disco no servidor. Ficam em
 * `assets/documentos/` e NÃO em `public/` de propósito: tudo em
 * public/ é servido por URL pra qualquer um, e uma dessas imagens é a
 * assinatura do representante da Brigada.
 *
 * Como nada importa esses arquivos, o trace do output "standalone" não
 * os enxergaria sozinho — por isso o `outputFileTracingIncludes` em
 * next.config.ts. Sem ele, o PDF funciona em `npm run dev` e quebra
 * só dentro do container.
 */
const PASTA = path.join(process.cwd(), "assets", "documentos");

export interface ImagensDocumento {
  logo: { data: Buffer; format: "jpg" };
  marcaDagua: { data: Buffer; format: "jpg" };
  seloIso: { data: Buffer; format: "png" };
  assinatura: { data: Buffer; format: "png" };
}

let cache: ImagensDocumento | null = null;

export function carregarImagensDocumento(): ImagensDocumento {
  if (!cache) {
    const ler = (arquivo: string) => readFileSync(path.join(PASTA, arquivo));
    cache = {
      logo: { data: ler("logo.jpg"), format: "jpg" },
      marcaDagua: { data: ler("marca-dagua.jpg"), format: "jpg" },
      seloIso: { data: ler("selo-iso.png"), format: "png" },
      assinatura: { data: ler("assinatura.png"), format: "png" },
    };
  }
  return cache;
}
