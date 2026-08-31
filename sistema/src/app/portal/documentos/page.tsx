import { redirect } from "next/navigation";
import { getSessionUsuario } from "@/lib/auth/session";
import { getSessionSupabaseClient } from "@/lib/supabase/server-auth";
import { docStatus, fmtDateBR } from "@/lib/domain";
import { Chip } from "@/components/Chip";
import type { BombeiroDocumento, SolicitacaoDocumento } from "@/lib/types";
import { AtualizarDocumentoForm } from "./AtualizarDocumentoForm";
import { EnviarDocumentoForm } from "./EnviarDocumentoForm";

const ROTULO_TIPO_ANEXO: Record<BombeiroDocumento["tipo_documento"], string> = {
  aso: "ASO",
  credenciamento: "Credenciamento",
  curso: "Curso",
};

export const dynamic = "force-dynamic";

export default async function PortalDocumentosPage() {
  const sessao = await getSessionUsuario();
  if (!sessao.configured) {
    return (
      <div className="panel-block p-5">
        <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
          Documentos exige um projeto Supabase configurado — não disponível no modo de demonstração.
        </p>
      </div>
    );
  }
  if (!sessao.loggedIn) redirect("/login");

  const bombeiroId = sessao.usuario?.bombeiro_id;
  if (!bombeiroId) redirect("/login");

  const supabase = await getSessionSupabaseClient();
  if (!supabase) redirect("/login");

  const [{ data: bombeiro }, { data: solicitacoesData }, { data: documentosData }] = await Promise.all([
    supabase.from("bombeiros").select("aso_data, credenciamento_data").eq("id", bombeiroId).maybeSingle(),
    supabase
      .from("solicitacoes_documento")
      .select("*")
      .eq("bombeiro_id", bombeiroId)
      .order("criado_em", { ascending: false }),
    supabase
      .from("bombeiro_documentos")
      .select("*")
      .eq("bombeiro_id", bombeiroId)
      .order("enviado_em", { ascending: false }),
  ]);

  const solicitacoes = (solicitacoesData ?? []) as SolicitacaoDocumento[];
  const documentos = (documentosData ?? []) as BombeiroDocumento[];
  const pendenteAso = solicitacoes.find((s) => s.tipo_documento === "aso" && s.status === "pendente");
  const pendenteCredenciamento = solicitacoes.find(
    (s) => s.tipo_documento === "credenciamento" && s.status === "pendente"
  );

  const aso = docStatus(bombeiro?.aso_data ?? null);
  const credenciamento = docStatus(bombeiro?.credenciamento_data ?? null);

  return (
    <div>
      <h1 className="mb-1 text-[22px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Documentos
      </h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--text-soft)" }}>
        Status do ASO e do Credenciamento. Atualizações passam por aprovação da coordenação antes de valer.
      </p>

      <div className="space-y-4">
        <div className="panel-block p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">ASO</span>
            <Chip level={aso.level} label={`${fmtDateBR(bombeiro?.aso_data ?? null)} · ${aso.label}`} />
          </div>
          {pendenteAso ? (
            <p className="text-[12.5px]" style={{ color: "var(--text-soft)" }}>
              Pedido de atualização enviado em {fmtDateBR(pendenteAso.criado_em.slice(0, 10))} (nova data:{" "}
              {fmtDateBR(pendenteAso.data_nova)}) — aguardando aprovação da coordenação.
            </p>
          ) : (
            <AtualizarDocumentoForm tipoDocumento="aso" label="Nova data do ASO" />
          )}
          <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
            <EnviarDocumentoForm tipoDocumento="aso" label="Anexar arquivo do ASO (PDF/JPG/PNG)" />
          </div>
        </div>

        <div className="panel-block p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">Credenciamento</span>
            <Chip
              level={credenciamento.level}
              label={`${fmtDateBR(bombeiro?.credenciamento_data ?? null)} · ${credenciamento.label}`}
            />
          </div>
          {pendenteCredenciamento ? (
            <p className="text-[12.5px]" style={{ color: "var(--text-soft)" }}>
              Pedido de atualização enviado em {fmtDateBR(pendenteCredenciamento.criado_em.slice(0, 10))} (nova
              data: {fmtDateBR(pendenteCredenciamento.data_nova)}) — aguardando aprovação da coordenação.
            </p>
          ) : (
            <AtualizarDocumentoForm tipoDocumento="credenciamento" label="Nova validade do Credenciamento" />
          )}
          <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
            <EnviarDocumentoForm tipoDocumento="credenciamento" label="Anexar arquivo do Credenciamento (PDF/JPG/PNG)" />
          </div>
        </div>

        <div className="panel-block p-4">
          <div className="mb-2 font-semibold">Cursos</div>
          <p className="mb-2 text-[12.5px]" style={{ color: "var(--text-soft)" }}>
            Anexe certificados de curso (NR-23 etc.) — não tem data de validade nem aprovação, fica só arquivado.
          </p>
          <EnviarDocumentoForm tipoDocumento="curso" label="Anexar certificado de curso" />
        </div>

        {documentos.length > 0 && (
          <div className="panel-block p-4">
            <div className="mb-2 font-semibold">Arquivos enviados</div>
            <ul className="space-y-1.5">
              {documentos.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span>
                    {ROTULO_TIPO_ANEXO[doc.tipo_documento]} · {doc.nome_arquivo} ·{" "}
                    {fmtDateBR(doc.enviado_em.slice(0, 10))}
                  </span>
                  <a href={`/api/documentos/${doc.id}`} target="_blank" rel="noopener noreferrer" className="btn">
                    Ver
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
