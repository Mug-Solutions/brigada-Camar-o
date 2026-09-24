import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const VALIDADE_URL_SEGUNDOS = 60;
const COLUNA_POR_TIPO = {
  aso: "aso_documento_path",
  credenciamento: "credenciamento_documento_path",
} as const;

/**
 * Ponto único de acesso ao ASO/Credenciamento anexado no cadastro,
 * ainda em análise — mesmo raciocínio de /api/documentos/[id] e
 * /api/foto-rosto-solicitacao/[id]: nunca expõe o storage_path nem
 * uma signed URL de longa duração, sempre checa autorização a cada
 * acesso. Só staff (a solicitação ainda não é um bombeiro com sessão
 * própria nesse estágio).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await requireStaff();
  if (!acesso.ok) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const tipo = new URL(request.url).searchParams.get("tipo");
  const coluna = tipo === "aso" || tipo === "credenciamento" ? COLUNA_POR_TIPO[tipo] : null;
  if (!coluna) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: solicitacao, error } = await supabase
    .from("solicitacoes_cadastro")
    .select(coluna)
    .eq("id", id)
    .maybeSingle();

  const caminho = solicitacao ? (solicitacao as Record<string, string | null>)[coluna] : null;
  if (error || !caminho) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  // download força Content-Disposition: attachment — mesma segunda
  // camada de proteção usada em /api/documentos/[id], caso o arquivo
  // seja um PDF com algo embutido que a checagem de magic number não pegou.
  const { data: assinada, error: assinadaError } = await supabase.storage
    .from("documentos-bombeiros")
    .createSignedUrl(caminho, VALIDADE_URL_SEGUNDOS, { download: true });

  if (assinadaError || !assinada) {
    return NextResponse.json({ error: "Erro ao gerar link do documento" }, { status: 500 });
  }

  return NextResponse.redirect(assinada.signedUrl, { headers: { "Cache-Control": "no-store, private" } });
}
