import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { bombeiroAptidao, docStatus, fmtDateBR } from "@/lib/domain";
import { Chip } from "@/components/Chip";
import type { Bombeiro } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BombeirosPage() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("bombeiros")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    return (
      <div className="panel-block p-6 text-sm" style={{ color: "var(--crit)" }}>
        Erro ao carregar bombeiros: {error.message}
      </div>
    );
  }

  const bombeiros = (data ?? []) as Bombeiro[];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="mb-1 text-[26px] uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Bombeiros
          </h1>
          <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
            Cadastro do quadro de bombeiros civis e status de documentação obrigatória.
          </p>
        </div>
        <Link href="/bombeiros/novo" className="btn btn--primary">
          + Novo Bombeiro
        </Link>
      </div>

      <div className="panel-block">
        <div className="overflow-x-auto">
          <table className="min-w-[640px]">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Função</th>
                <th>ASO</th>
                <th>E-Social</th>
                <th>Credenciamento</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {bombeiros.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center" style={{ color: "var(--text-faint)" }}>
                    Nenhum bombeiro cadastrado ainda.
                  </td>
                </tr>
              ) : (
                bombeiros.map((b) => {
                  const aso = docStatus(b.aso_data);
                  const cred = docStatus(b.credenciamento_data);
                  const aptidao = bombeiroAptidao(b);
                  return (
                    <tr key={b.id}>
                      <td className="font-semibold">
                        {b.nome}
                        <span
                          className="mt-0.5 block text-[11.5px] font-normal"
                          style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}
                        >
                          {b.cpf}
                        </span>
                      </td>
                      <td>{b.funcao}</td>
                      <td>
                        <Chip level={aso.level} label={`${fmtDateBR(b.aso_data)} · ${aso.label}`} />
                      </td>
                      <td>
                        <Chip
                          level={b.esocial_status === "Ativo" ? "ok" : "crit"}
                          label={`${b.esocial_matricula ?? "—"} · ${b.esocial_status}`}
                        />
                      </td>
                      <td>
                        <Chip
                          level={cred.level}
                          label={`${fmtDateBR(b.credenciamento_data)} · ${cred.label}`}
                        />
                      </td>
                      <td>
                        <Chip level={aptidao.level} label={aptidao.label} />
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
  );
}
