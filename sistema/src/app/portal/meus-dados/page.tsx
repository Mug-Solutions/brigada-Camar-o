import { redirect } from "next/navigation";
import { getSessionUsuario } from "@/lib/auth/session";
import { getSessionSupabaseClient } from "@/lib/supabase/server-auth";
import type { Disponibilidade } from "@/lib/types";
import { AdicionarDisponibilidadeForm } from "./AdicionarDisponibilidadeForm";
import { MeusDadosForm } from "./MeusDadosForm";
import { removerDisponibilidade } from "./actions";

export const dynamic = "force-dynamic";

const MENSAGENS_ERRO: Record<string, string> = {
  "1": "Não foi possível concluir a ação. Tente novamente.",
  duplicada: "Essa disponibilidade já estava cadastrada.",
  limite: "Limite de disponibilidades cadastradas atingido — remova alguma antes de adicionar outra.",
};

export default async function PortalMeusDadosPage({ searchParams }: PageProps<"/portal/meus-dados">) {
  const params = await searchParams;
  const erroParam = typeof params?.erro === "string" ? params.erro : null;
  const mensagemErro = erroParam ? (MENSAGENS_ERRO[erroParam] ?? MENSAGENS_ERRO["1"]) : null;

  const sessao = await getSessionUsuario();
  if (!sessao.configured) {
    return (
      <div className="panel-block p-5">
        <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
          Meus Dados exige um projeto Supabase configurado — não disponível no modo de demonstração.
        </p>
      </div>
    );
  }
  if (!sessao.loggedIn) redirect("/login");

  let disponibilidades: Disponibilidade[] = [];
  let bombeiro: { telefone: string | null; chave_pix: string | null } | null = null;
  let turnos: string[] = [];
  if (sessao.usuario?.bombeiro_id) {
    const supabase = await getSessionSupabaseClient();
    if (supabase) {
      const [{ data: disponibilidadesData }, { data: bombeiroData }, { data: turnosData }] = await Promise.all([
        supabase.from("disponibilidades").select("*").order("dia_semana", { ascending: true }),
        supabase.from("bombeiros").select("telefone, chave_pix").eq("id", sessao.usuario.bombeiro_id).maybeSingle(),
        supabase
          .from("turnos_config")
          .select("nome")
          .eq("ativo", true)
          .order("ordem", { ascending: true })
          .order("nome", { ascending: true }),
      ]);
      disponibilidades = (disponibilidadesData ?? []) as Disponibilidade[];
      bombeiro = bombeiroData ?? null;
      turnos = ((turnosData ?? []) as { nome: string }[]).map((t) => t.nome);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Meus Dados
      </h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--text-soft)" }}>
        Telefone, chave PIX e disponibilidade.
      </p>

      {mensagemErro && (
        <div
          className="mb-4 rounded-md border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }}
        >
          {mensagemErro}
        </div>
      )}

      <div className="panel-block mb-4 p-5">
        <h2
          className="mb-1 text-[13px] font-semibold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Contato e Pagamento
        </h2>
        <p className="mb-4 text-[12.5px]" style={{ color: "var(--text-soft)" }}>
          Atualiza direto, sem precisar de aprovação da coordenação.
        </p>
        <MeusDadosForm telefone={bombeiro?.telefone ?? null} chavePix={bombeiro?.chave_pix ?? null} />
      </div>

      <div className="panel-block p-5">
        <h2
          className="mb-1 text-[13px] font-semibold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Disponibilidade
        </h2>
        <p className="mb-4 text-[12.5px]" style={{ color: "var(--text-soft)" }}>
          Dias e turnos em que você está disponível pra ser escalado.
        </p>

        {disponibilidades.length > 0 && (
          <ul className="mb-4 space-y-1.5">
            {disponibilidades.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-[13px]">
                <span>
                  {d.dia_semana} · {d.turno}
                  {d.regiao ? ` · ${d.regiao}` : ""}
                </span>
                <form action={removerDisponibilidade}>
                  <input type="hidden" name="disponibilidade_id" value={d.id} />
                  <button type="submit" className="btn">
                    Remover
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <AdicionarDisponibilidadeForm turnos={turnos} />
      </div>
    </div>
  );
}
