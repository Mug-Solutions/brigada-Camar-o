import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getSessionUsuario, requireStaff } from "@/lib/auth/session";
import { registrarAuditoria } from "@/lib/auditoria";
import { carregarDadosDocumento } from "@/lib/documentos-cliente/carregar";
import { ehTipoDocumento, nomeArquivoDocumento, pendenciasDocumento } from "@/lib/documentos-cliente/dados";
import { gerarPdfDocumento } from "@/lib/documentos-cliente/gerar";

/**
 * GET /api/eventos/:id/orcamento e /api/eventos/:id/contrato — gera o
 * PDF preenchido com os dados do evento, do cliente e da programação,
 * pronto pra mandar ao cliente.
 *
 * /api/* fica fora do matcher do src/proxy.ts, então a checagem de
 * staff aqui é a única barreira — mesma postura das rotas de export.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documento: string }> }
) {
  const acesso = await requireStaff();
  if (!acesso.ok) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { id, documento } = await params;
  if (!ehTipoDocumento(documento)) {
    return NextResponse.json({ error: "Documento inválido." }, { status: 404 });
  }

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Documentos exigem um projeto Supabase configurado." }, { status: 503 });
  }

  const carregado = await carregarDadosDocumento(supabase, id);
  if (!carregado.ok) {
    if (carregado.motivo === "nao-encontrado") {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    }
    console.error("[documentos-cliente] falha ao carregar dados", { eventoId: id, erro: carregado.mensagem });
    return NextResponse.json({ error: `Erro ao carregar dados: ${carregado.mensagem}` }, { status: 500 });
  }

  // A tela já desabilita o botão quando falta algo, mas a rota pode ser
  // chamada direto pela URL — re-checa em vez de gerar um documento
  // jurídico com campo em branco. Volta pra tela, que lista o que falta.
  if (pendenciasDocumento(documento, carregado.dados).length > 0) {
    return NextResponse.redirect(new URL(`/eventos/${id}?erro=documento-${documento}`, request.url));
  }

  const pdf = await gerarPdfDocumento(documento, carregado.dados);

  // O PDF sai com a assinatura do representante aplicada — fica
  // registrado quem gerou, de qual evento, com qual valor e cliente.
  const sessao = await getSessionUsuario();
  await registrarAuditoria({
    supabase,
    usuarioId: sessao.configured && sessao.loggedIn ? sessao.usuario?.id : undefined,
    tabela: "eventos",
    registroId: id,
    acao: "gerar",
    valorDepois: {
      documento,
      evento: carregado.evento.nome,
      cliente: carregado.dados.cliente?.nome,
      valor: carregado.evento.valor_fechamento,
    },
  });

  const nomeArquivo = nomeArquivoDocumento(documento, carregado.evento.nome);
  // filename= em ASCII puro pra navegador antigo; filename*= com o nome
  // original (acentos) em UTF-8, que todo navegador atual prefere.
  const nomeAscii = nomeArquivo.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(nomeArquivo)}`,
      "Cache-Control": "no-store",
    },
  });
}
