import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TAMANHO_MAXIMO_DOCUMENTO_BYTES } from "@/lib/constants";

export const TIPOS_DOCUMENTO_ANEXO = ["aso", "credenciamento", "curso"] as const;
export type TipoDocumentoAnexo = (typeof TIPOS_DOCUMENTO_ANEXO)[number];

const MIME_POR_EXTENSAO: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Achado de revisão de segurança: validar só o Content-Type que o
// navegador declara (spoofável num multipart forjado) deixa passar
// qualquer conteúdo rotulado como um desses três formatos. Checar a
// assinatura real dos primeiros bytes (magic number) é barato e fecha
// a maior parte disso — não é infalível (um PDF válido ainda pode
// carregar JavaScript embutido, por exemplo), por isso a rota de
// leitura (/api/documentos/[id]) também força download em vez de
// exibição inline, como segunda camada.
const ASSINATURAS: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

async function assinaturaBateComTipo(arquivo: File): Promise<boolean> {
  const assinatura = ASSINATURAS[arquivo.type];
  if (!assinatura) return false;
  const inicio = new Uint8Array(await arquivo.slice(0, assinatura.length).arrayBuffer());
  return assinatura.every((byte, i) => inicio[i] === byte);
}

export function ehTipoDocumentoAnexoValido(tipo: string): tipo is TipoDocumentoAnexo {
  return (TIPOS_DOCUMENTO_ANEXO as readonly string[]).includes(tipo);
}

interface EnviarDocumentoParams {
  supabase: SupabaseClient;
  bombeiroId: string;
  tipoDocumento: TipoDocumentoAnexo;
  arquivo: File;
  enviadoPor: string | undefined;
}

export type EnviarDocumentoResultado = { error: string; documentoId?: undefined } | { error: null; documentoId: string };

/**
 * Upload de arquivo (ASO/credenciamento/curso) — item essencial do PRD
 * nunca implementado antes (só a data de validade era rastreada, nunca
 * o arquivo). Compartilhado entre o Portal (bombeiro envia o próprio)
 * e a tela de Bombeiros (staff envia em nome de alguém).
 *
 * O caminho no Storage nunca usa o nome original do arquivo — só um
 * UUID gerado aqui — evita path traversal via nome de arquivo
 * malicioso (ex.: "../../outro-bombeiro/foto.pdf"). O nome original
 * fica só na coluna nome_arquivo, pra exibição.
 *
 * Valida Content-Type declarado E os bytes reais (magic number, ver
 * assinaturaBateComTipo) — um Content-Type forjado no multipart não
 * basta mais pra passar. Limitação aceita conscientemente mesmo assim
 * (v1): isso não impede um PDF *válido* que carregue JavaScript
 * embutido — mitigado por uma segunda camada na rota de leitura
 * (/api/documentos/[id]), que sempre força download
 * (Content-Disposition: attachment) em vez de exibição inline.
 */
export async function enviarDocumentoBombeiro({
  supabase,
  bombeiroId,
  tipoDocumento,
  arquivo,
  enviadoPor,
}: EnviarDocumentoParams): Promise<EnviarDocumentoResultado> {
  if (!arquivo || arquivo.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_DOCUMENTO_BYTES) {
    return { error: "Arquivo maior que 5MB — comprima ou tire uma foto com menos resolução." };
  }
  const extensao = MIME_POR_EXTENSAO[arquivo.type];
  if (!extensao) {
    return { error: "Formato não aceito — envie PDF, JPG ou PNG." };
  }
  if (!(await assinaturaBateComTipo(arquivo))) {
    return { error: "O conteúdo do arquivo não bate com o formato declarado — envie um PDF, JPG ou PNG de verdade." };
  }

  const caminho = `${bombeiroId}/${tipoDocumento}/${crypto.randomUUID()}.${extensao}`;

  const { error: uploadError } = await supabase.storage
    .from("documentos-bombeiros")
    .upload(caminho, arquivo, { contentType: arquivo.type });
  if (uploadError) {
    return { error: `Erro ao enviar arquivo: ${uploadError.message}` };
  }

  const { data, error } = await supabase
    .from("bombeiro_documentos")
    .insert({
      bombeiro_id: bombeiroId,
      tipo_documento: tipoDocumento,
      storage_path: caminho,
      nome_arquivo: arquivo.name.slice(0, 200),
      tamanho_bytes: arquivo.size,
      enviado_por: enviadoPor ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    // Arquivo já subiu mas o registro não gravou — remove o órfão do
    // Storage em vez de deixar um arquivo sem nenhuma linha apontando
    // pra ele. Mesmo raciocínio de rollback já usado em convidarBombeiro.
    await supabase.storage.from("documentos-bombeiros").remove([caminho]);
    return { error: error ? `Erro ao salvar: ${error.message}` : "Erro ao salvar registro do documento." };
  }

  return { error: null, documentoId: data.id };
}
