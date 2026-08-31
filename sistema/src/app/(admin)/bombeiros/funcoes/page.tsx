import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { criarFuncao } from "./actions";
import { AtivoToggle } from "./AtivoToggle";

export const dynamic = "force-dynamic";

type FuncaoBombeiro = { nome: string; ativo: boolean };

const MENSAGENS_ERRO: Record<string, string> = {
  "1": "Não foi possível concluir a ação. Tente novamente.",
  duplicada: "Já existe uma função com esse nome.",
};

export default async function FuncoesPage({ searchParams }: PageProps<"/bombeiros/funcoes">) {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const sp = await searchParams;
  const erroParam = typeof sp?.erro === "string" ? sp.erro : null;
  const mensagemErro = erroParam ? (MENSAGENS_ERRO[erroParam] ?? MENSAGENS_ERRO["1"]) : null;

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return (
      <div className="panel-block p-6 text-[13.5px]" style={{ color: "var(--text-soft)" }}>
        Funções exige um projeto Supabase configurado — não disponível no modo de demonstração.
      </div>
    );
  }

  const { data } = await supabase.from("funcoes_bombeiro").select("nome, ativo").order("nome", { ascending: true });
  const funcoes = (data ?? []) as FuncaoBombeiro[];

  return (
    <div>
      <div className="mb-6">
        <Link href="/bombeiros" className="mb-2 inline-block text-[12.5px]" style={{ color: "var(--text-soft)" }}>
          ← Bombeiros
        </Link>
        <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Funções
        </h1>
        <p className="max-w-[60ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Hierarquias/funções que um bombeiro pode ter. Desativar uma função só tira ela da lista oferecida pra
          cadastro novo — quem já tem essa função continua com ela normalmente.
        </p>
      </div>

      {mensagemErro && (
        <div
          className="mb-4 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {mensagemErro}
        </div>
      )}

      <div className="panel-block mb-4">
        <div className="overflow-x-auto">
          <table className="min-w-[360px]">
            <thead>
              <tr>
                <th>Função</th>
                <th>Ativa</th>
              </tr>
            </thead>
            <tbody>
              {funcoes.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-8 text-center" style={{ color: "var(--text-faint)" }}>
                    Nenhuma função cadastrada ainda.
                  </td>
                </tr>
              ) : (
                funcoes.map((f) => (
                  <tr key={f.nome}>
                    <td className="font-semibold">{f.nome}</td>
                    <td>
                      <AtivoToggle nome={f.nome} ativo={f.ativo} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form action={criarFuncao} className="panel-block flex max-w-[420px] items-end gap-2 p-5">
        <div className="field flex-1">
          <label htmlFor="nome">Nova função</label>
          <input type="text" id="nome" name="nome" placeholder="Ex.: Socorrista" maxLength={80} required />
        </div>
        <button type="submit" className="btn btn--primary">
          Adicionar
        </button>
      </form>
    </div>
  );
}
