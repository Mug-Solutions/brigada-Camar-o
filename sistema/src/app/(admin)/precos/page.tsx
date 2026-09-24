import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { MOCK_PRECOS } from "@/lib/mock-data";
import { DemoBanner } from "@/components/DemoBanner";
import type { PrecoConfig } from "@/lib/types";
import { PrecosTabela } from "./PrecosTabela";
import { criarPreco } from "./actions";

export const dynamic = "force-dynamic";

const MENSAGENS_ERRO: Record<string, string> = {
  "1": "Não foi possível salvar o preço. Tente novamente.",
  protegido: "Esse item é usado pelo cálculo de custo do sistema e não pode ser excluído.",
};

export default async function PrecosPage({ searchParams }: PageProps<"/precos">) {
  // CRITICAL corrigido em 2026-08-29: esta rota ficou acessível sem
  // login nenhum até este guard existir, porque /precos não estava no
  // matcher de src/proxy.ts (ver comentário lá) — o proxy simplesmente
  // não rodava pra este path, então nenhuma checagem de sessão
  // acontecia antes deste guard ser adicionado.
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const params = await searchParams;
  const erroParam = typeof params?.erro === "string" ? params.erro : null;
  const mensagemErro = erroParam ? (MENSAGENS_ERRO[erroParam] ?? MENSAGENS_ERRO["1"]) : null;

  const supabase = getServerSupabaseClient();
  const demo = !supabase;

  let precos: PrecoConfig[] = MOCK_PRECOS;
  let error: { message: string } | null = null;

  if (supabase) {
    const result = await supabase.from("precos_config").select("*").order("chave", { ascending: true });
    precos = (result.data ?? []) as PrecoConfig[];
    error = result.error;
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Régua de Preços
          </h1>
          <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
            Tipos de gasto tabelados (alimentação e outros) — alterar aqui não muda eventos já registrados, só os
            novos. Valores de turno (Diurno, Noturno etc.) agora ficam em Turnos.
          </p>
        </div>
        <Link href="/precos/turnos" className="btn btn--primary">
          Turnos →
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
          Erro ao carregar preços: {error.message}
        </div>
      )}

      <div className="panel-block mb-4">
        <div className="overflow-x-auto">
          <PrecosTabela precos={precos} demo={demo} />
        </div>
      </div>

      <form action={criarPreco} className="panel-block flex flex-wrap items-end gap-2 p-5">
        <div className="field flex-1" style={{ minWidth: "200px" }}>
          <label htmlFor="descricao">Novo tipo de gasto</label>
          <input
            type="text"
            id="descricao"
            name="descricao"
            placeholder="Ex.: Transporte, Hospedagem"
            maxLength={140}
            disabled={demo}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="valor-novo">Valor</label>
          <input
            type="number"
            id="valor-novo"
            name="valor"
            min={0}
            step="0.01"
            defaultValue={0}
            className="w-[110px]"
            disabled={demo}
            required
          />
        </div>
        <button type="submit" className="btn btn--primary" disabled={demo}>
          Adicionar
        </button>
      </form>
    </div>
  );
}
