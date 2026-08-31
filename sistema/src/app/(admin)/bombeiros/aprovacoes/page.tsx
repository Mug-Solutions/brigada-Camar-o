import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { docStatus, fmtDateBR } from "@/lib/domain";
import { Chip } from "@/components/Chip";
import { DemoBanner } from "@/components/DemoBanner";
import {
  aprovarAtualizacaoDocumento,
  aprovarSolicitacao,
  convidarBombeiro,
  recusarAtualizacaoDocumento,
  recusarSolicitacao,
} from "./actions";

export const dynamic = "force-dynamic";

const LIMITE_FILA = 200;

type SolicitacaoConvidado = { id: string; email: string; criado_em: string };
type SolicitacaoPendente = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  funcao: string;
  email: string;
  dados_enviados_em: string;
  aso_data: string | null;
  esocial_matricula: string | null;
  credenciamento_data: string | null;
  chave_pix: string | null;
};
type SolicitacaoDocumentoPendente = {
  id: string;
  tipo_documento: "aso" | "credenciamento";
  data_nova: string;
  criado_em: string;
  bombeiros: { nome: string } | null;
};

const MENSAGENS_ERRO: Record<string, string> = {
  "1": "Não foi possível concluir a ação. Tente novamente.",
  convite: "Não foi possível enviar o convite por e-mail. Tente novamente em instantes.",
  ja_convidado: "Esse e-mail já foi convidado e ainda está em aberto.",
};

export default async function AprovacoesPage({ searchParams }: PageProps<"/bombeiros/aprovacoes">) {
  // Página de service-role: mesma defesa em profundidade das Server
  // Actions (ver decisão em docs/decisoes-tecnicas.md) — não depende só
  // do src/proxy.ts para barrar um bombeiro de ver a fila dos outros.
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const params = await searchParams;
  const erroParam = typeof params?.erro === "string" ? params.erro : null;
  const mensagemErro = erroParam ? (MENSAGENS_ERRO[erroParam] ?? MENSAGENS_ERRO["1"]) : null;

  const supabase = getServerSupabaseClient();
  const demo = !supabase;

  let convidados: SolicitacaoConvidado[] = [];
  let pendentes: SolicitacaoPendente[] = [];
  let documentosPendentes: SolicitacaoDocumentoPendente[] = [];
  let error: { message: string } | null = null;

  if (supabase) {
    const [resultConvidados, resultPendentes, resultDocumentos] = await Promise.all([
      supabase
        .from("solicitacoes_cadastro")
        .select("id, email, criado_em")
        .eq("status", "convidado")
        .order("criado_em", { ascending: true })
        .limit(LIMITE_FILA),
      supabase
        .from("solicitacoes_cadastro")
        .select("id, nome, cpf, telefone, funcao, email, dados_enviados_em, aso_data, esocial_matricula, credenciamento_data, chave_pix")
        .eq("status", "pendente")
        .order("dados_enviados_em", { ascending: true })
        .limit(LIMITE_FILA),
      supabase
        .from("solicitacoes_documento")
        .select("id, tipo_documento, data_nova, criado_em, bombeiros(nome)")
        .eq("status", "pendente")
        .order("criado_em", { ascending: true })
        .limit(LIMITE_FILA),
    ]);
    convidados = (resultConvidados.data ?? []) as SolicitacaoConvidado[];
    pendentes = (resultPendentes.data ?? []) as SolicitacaoPendente[];
    documentosPendentes = (resultDocumentos.data ?? []) as unknown as SolicitacaoDocumentoPendente[];
    error = resultConvidados.error ?? resultPendentes.error ?? resultDocumentos.error;
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Cadastro de Bombeiros
          </h1>
          <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
            Convide pelo e-mail, acompanhe quem já preencheu os dados e aprove ou recuse.
          </p>
        </div>
        <Link href="/bombeiros" className="btn">
          ← Voltar
        </Link>
      </div>

      {demo && <DemoBanner />}
      {mensagemErro && (
        <div
          className="mb-4 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {mensagemErro}
        </div>
      )}
      {error && (
        <div className="panel-block mb-4 p-4 text-[13px]" style={{ color: "var(--crit)" }}>
          Erro ao carregar: {error.message}
        </div>
      )}

      <div className="panel-block mb-6 p-5">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          Convidar bombeiro
        </h2>
        <form action={convidarBombeiro} className="flex items-end gap-2">
          <div className="field flex-1">
            <label htmlFor="email-convite">E-mail do bombeiro</label>
            <input type="email" id="email-convite" name="email" required />
          </div>
          <button type="submit" className="btn btn--primary">
            Enviar convite
          </button>
        </form>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
          Aguardando o bombeiro preencher os dados
        </h2>
        <div className="panel-block">
          <div className="overflow-x-auto">
            <table className="min-w-[480px]">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Convidado em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {convidados.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center" style={{ color: "var(--text-faint)" }}>
                      Nenhum convite aguardando preenchimento.
                    </td>
                  </tr>
                ) : (
                  convidados.map((c) => (
                    <tr key={c.id}>
                      <td className="font-semibold">{c.email}</td>
                      <td>{fmtDateBR(c.criado_em.slice(0, 10))}</td>
                      <td>
                        <div className="flex justify-end">
                          <form action={recusarSolicitacao}>
                            <input type="hidden" name="solicitacao_id" value={c.id} />
                            <button type="submit" className="btn">
                              Revogar convite
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
          Aguardando aprovação
        </h2>
        <div className="panel-block">
          <div className="overflow-x-auto">
            <table className="min-w-[960px]">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Telefone</th>
                  <th>Função</th>
                  <th>E-mail</th>
                  <th>ASO</th>
                  <th>E-Social</th>
                  <th>Credenciamento</th>
                  <th>Chave PIX</th>
                  <th>Enviado em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendentes.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center" style={{ color: "var(--text-faint)" }}>
                      Nenhuma solicitação pendente.
                    </td>
                  </tr>
                ) : (
                  pendentes.map((s) => {
                    const aso = docStatus(s.aso_data);
                    const cred = docStatus(s.credenciamento_data);
                    return (
                    <tr key={s.id}>
                      <td className="font-semibold">{s.nome}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{s.cpf}</td>
                      <td>{s.telefone}</td>
                      <td>{s.funcao}</td>
                      <td>{s.email}</td>
                      <td>
                        <Chip level={aso.level} label={`${fmtDateBR(s.aso_data)} · ${aso.label}`} />
                      </td>
                      <td>{s.esocial_matricula ?? "—"}</td>
                      <td>
                        <Chip level={cred.level} label={`${fmtDateBR(s.credenciamento_data)} · ${cred.label}`} />
                      </td>
                      <td>{s.chave_pix ?? "—"}</td>
                      <td>{fmtDateBR(s.dados_enviados_em?.slice(0, 10) ?? null)}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <form action={recusarSolicitacao}>
                            <input type="hidden" name="solicitacao_id" value={s.id} />
                            <button type="submit" className="btn">
                              Recusar
                            </button>
                          </form>
                          <form action={aprovarSolicitacao}>
                            <input type="hidden" name="solicitacao_id" value={s.id} />
                            <button type="submit" className="btn btn--primary">
                              Aprovar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-soft)" }}>
          Atualizações de documento pendentes
        </h2>
        <div className="panel-block">
          <div className="overflow-x-auto">
            <table className="min-w-[560px]">
              <thead>
                <tr>
                  <th>Bombeiro</th>
                  <th>Documento</th>
                  <th>Nova data</th>
                  <th>Enviado em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documentosPendentes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center" style={{ color: "var(--text-faint)" }}>
                      Nenhuma atualização de documento pendente.
                    </td>
                  </tr>
                ) : (
                  documentosPendentes.map((d) => (
                    <tr key={d.id}>
                      <td className="font-semibold">{d.bombeiros?.nome ?? "—"}</td>
                      <td>{d.tipo_documento === "aso" ? "ASO" : "Credenciamento"}</td>
                      <td>{fmtDateBR(d.data_nova)}</td>
                      <td>{fmtDateBR(d.criado_em.slice(0, 10))}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <form action={recusarAtualizacaoDocumento}>
                            <input type="hidden" name="solicitacao_id" value={d.id} />
                            <button type="submit" className="btn">
                              Recusar
                            </button>
                          </form>
                          <form action={aprovarAtualizacaoDocumento}>
                            <input type="hidden" name="solicitacao_id" value={d.id} />
                            <button type="submit" className="btn btn--primary">
                              Aprovar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
