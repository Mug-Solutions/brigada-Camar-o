import { NextResponse } from "next/server";
import { getSessionUsuario } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const VALIDADE_URL_SEGUNDOS = 60;

/**
 * Ponto único de acesso a um documento anexado — nunca expõe o
 * storage_path nem uma URL assinada de longa duração pro cliente
 * (ex.: dentro de um JSON de listagem). Em vez disso, este link fixo
 * (`/api/documentos/{id}`) checa autorização a cada clique e redireciona
 * pra uma signed URL nova, válida só por 60s — mesmo raciocínio de
 * nunca cachear dado sensível já aplicado aos exports CSV (Cache-Control
 * no-store) e à contagem_titulares_evento (migração 0016).
 *
 * Autorizado pra: staff (requireStaff) OU o próprio bombeiro dono do
 * documento — nunca outro bombeiro.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sessao = await getSessionUsuario();
  if (!sessao.configured || !sessao.loggedIn) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const { data: documento, error } = await supabase
    .from("bombeiro_documentos")
    .select("storage_path, bombeiro_id, nome_arquivo")
    .eq("id", id)
    .maybeSingle();

  // Mesma resposta (404) tanto pra "não existe" quanto pra "existe mas
  // você não tem acesso" — evita que alguém tentando ids ao acaso
  // descubra, pelo código de status, se um documento de outro bombeiro
  // existe antes mesmo de saber se tem acesso a ele.
  const ehStaff = sessao.usuario?.papel === "staff" && sessao.usuario.ativo;
  const ehDono = sessao.usuario?.papel === "bombeiro" && sessao.usuario.bombeiro_id === documento?.bombeiro_id;
  if (error || !documento || (!ehStaff && !ehDono)) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  // `download` força Content-Disposition: attachment na resposta do
  // próprio Storage (não dá pra fazer isso via header no redirect
  // aqui — os bytes vêm direto do host do Storage, não passam pelo
  // nosso servidor) — segunda camada de proteção contra o arquivo ser
  // renderizado inline pelo navegador, mesmo que o Content-Type
  // declarado no upload não bata com o conteúdo real de alguma forma
  // que a checagem de magic number (src/lib/documentos.ts) não pegou.
  const { data: assinada, error: assinadaError } = await supabase.storage
    .from("documentos-bombeiros")
    .createSignedUrl(documento.storage_path, VALIDADE_URL_SEGUNDOS, { download: documento.nome_arquivo });

  if (assinadaError || !assinada) {
    return NextResponse.json({ error: "Erro ao gerar link do documento" }, { status: 500 });
  }

  return NextResponse.redirect(assinada.signedUrl, { headers: { "Cache-Control": "no-store, private" } });
}
