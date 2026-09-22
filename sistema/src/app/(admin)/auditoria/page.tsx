import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import type { AuditoriaLog } from "@/lib/types";

export const dynamic = "force-dynamic";

type AuditoriaLogComUsuario = AuditoriaLog & { usuarios: { nome: string } | null };

const ROTULO_ACAO: Record<AuditoriaLog["acao"], string> = {
  criar: "Criou",
  editar: "Editou",
  excluir: "Excluiu",
  aprovar: "Aprovou",
  recusar: "Recusou",
  gerar: "Gerou",
};

const LIMITE = 200;

function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function AuditoriaPage() {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return (
      <div className="panel-block p-6 text-[13.5px]" style={{ color: "var(--text-soft)" }}>
        Auditoria exige um projeto Supabase configurado — não disponível no modo de demonstração.
      </div>
    );
  }

  const { data, error } = await supabase
    .from("auditoria_logs")
    .select("*, usuarios(nome)")
    .order("criado_em", { ascending: false })
    .limit(LIMITE);

  const logs = (data ?? []) as unknown as AuditoriaLogComUsuario[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Auditoria
        </h1>
        <p className="max-w-[70ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Quem alterou o quê — cadastro/edição/exclusão de bombeiros e eventos, aprovações e recusas, mudanças de
          status financeiro. Mostra os {LIMITE} registros mais recentes.
        </p>
      </div>

      {error ? (
        <div className="panel-block p-6 text-[13px]" style={{ color: "var(--crit)" }}>
          Erro ao carregar auditoria: {error.message}
        </div>
      ) : logs.length === 0 ? (
        <div className="panel-block p-10 text-center text-[13px]" style={{ color: "var(--text-faint)" }}>
          Nenhum registro de auditoria ainda.
        </div>
      ) : (
        <div className="panel-block">
          <div className="overflow-x-auto">
            <table className="min-w-[720px]">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Quem</th>
                  <th>Ação</th>
                  <th>Tabela</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="num whitespace-nowrap">{fmtDataHora(log.criado_em)}</td>
                    <td>{log.usuarios?.nome ?? "—"}</td>
                    <td>
                      <span className="pill">{ROTULO_ACAO[log.acao] ?? log.acao}</span>
                    </td>
                    <td className="font-mono text-[12px]">{log.tabela}</td>
                    <td className="max-w-[420px] truncate text-[12px]" style={{ color: "var(--text-soft)" }}>
                      {log.valor_depois ? JSON.stringify(log.valor_depois) : log.valor_antes ? JSON.stringify(log.valor_antes) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
