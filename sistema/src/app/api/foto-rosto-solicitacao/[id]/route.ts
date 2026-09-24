import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const VALIDADE_URL_SEGUNDOS = 60;

/**
 * Ponto único de acesso à foto de rosto enviada em /completar-cadastro
 * — mesmo raciocínio de /api/documentos/[id]: nunca expõe o
 * storage_path nem uma signed URL de longa duração, sempre checa
 * autorização a cada acesso. Só staff (a solicitação ainda não é um
 * bombeiro com sessão própria nesse estágio — quem revisa é sempre a
 * coordenação).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await requireStaff();
  if (!acesso.ok) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const supabase = createServerSupabaseClient();
  const { data: solicitacao, error } = await supabase
    .from("solicitacoes_cadastro")
    .select("foto_rosto_path")
    .eq("id", id)
    .maybeSingle();

  if (error || !solicitacao?.foto_rosto_path) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
  }

  const { data: assinada, error: assinadaError } = await supabase.storage
    .from("fotos-bombeiros")
    .createSignedUrl(solicitacao.foto_rosto_path, VALIDADE_URL_SEGUNDOS);

  if (assinadaError || !assinada) {
    return NextResponse.json({ error: "Erro ao gerar link da foto" }, { status: 500 });
  }

  return NextResponse.redirect(assinada.signedUrl, { headers: { "Cache-Control": "no-store, private" } });
}
