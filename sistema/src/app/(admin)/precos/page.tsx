import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { MOCK_PRECOS } from "@/lib/mock-data";
import { DemoBanner } from "@/components/DemoBanner";
import type { PrecoConfig } from "@/lib/types";
import { PrecosTabela } from "./PrecosTabela";

export const dynamic = "force-dynamic";

const MENSAGENS_ERRO: Record<string, string> = {
  "1": "Não foi possível salvar o preço. Tente novamente.",
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
      <div className="mb-6">
        <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Régua de Preços
        </h1>
        <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Valores usados ao escalar bombeiros — alterar aqui não muda escalas já registradas, só as novas.
        </p>
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

      <div className="panel-block">
        <div className="overflow-x-auto">
          <PrecosTabela precos={precos} demo={demo} />
        </div>
      </div>
    </div>
  );
}
