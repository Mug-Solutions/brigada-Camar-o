import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TAMANHO_MAXIMO_DOCUMENTO_BYTES } from "@/lib/constants";

const MIME_POR_EXTENSAO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Mesmo raciocínio de src/lib/documentos.ts: Content-Type declarado no
// multipart é spoofável, então confere os bytes reais (magic number)
// também.
const ASSINATURAS: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

async function assinaturaBateComTipo(arquivo: File): Promise<boolean> {
  const assinatura = ASSINATURAS[arquivo.type];
  if (!assinatura) return false;
  const inicio = new Uint8Array(await arquivo.slice(0, assinatura.length).arrayBuffer());
  return assinatura.every((byte, i) => inicio[i] === byte);
}

interface EnviarFotoRostoParams {
  supabase: SupabaseClient;
  authId: string;
  arquivo: File;
}

export type EnviarFotoRostoResultado = { error: string; path?: undefined } | { error: null; path: string };

/**
 * Upload da foto de rosto no autocadastro (/completar-cadastro) — path
 * fixo por auth_id (não um UUID novo a cada envio, diferente de
 * bombeiro_documentos) porque só existe UMA foto de rosto por pessoa:
 * reenviar (ex.: depois de corrigir outro campo do formulário e
 * submeter de novo) só sobrescreve a mesma foto, sem deixar arquivo
 * órfão no Storage.
 */
export async function enviarFotoRosto({
  supabase,
  authId,
  arquivo,
}: EnviarFotoRostoParams): Promise<EnviarFotoRostoResultado> {
  if (!arquivo || arquivo.size === 0) {
    return { error: "Selecione uma foto do rosto." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_DOCUMENTO_BYTES) {
    return { error: "Foto maior que 5MB — comprima ou tire com menos resolução." };
  }
  const extensao = MIME_POR_EXTENSAO[arquivo.type];
  if (!extensao) {
    return { error: "Formato de foto não aceito — envie JPG ou PNG." };
  }
  if (!(await assinaturaBateComTipo(arquivo))) {
    return { error: "O conteúdo do arquivo não bate com o formato declarado — envie uma foto JPG ou PNG de verdade." };
  }

  const caminho = `${authId}/rosto.${extensao}`;

  const { error: uploadError } = await supabase.storage
    .from("fotos-bombeiros")
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: true });
  if (uploadError) {
    return { error: `Erro ao enviar a foto: ${uploadError.message}` };
  }

  return { error: null, path: caminho };
}
