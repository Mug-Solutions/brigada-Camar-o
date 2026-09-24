import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { DemoBanner } from "@/components/DemoBanner";
import { criarTurno } from "./actions";
import { TurnoLinha } from "./TurnoLinha";

export const dynamic = "force-dynamic";

type TurnoConfig = { nome: string; hora_inicio: string; hora_fim: string; valor: number; ativo: boolean };

const MENSAGENS_ERRO: Record<string, string> = {
  "1": "Não foi possível concluir a ação. Tente novamente.",
  duplicada: "Já existe um turno com esse nome.",
  "horario-igual": "Início e fim não podem ser o mesmo horário.",
  "em-uso": "Esse turno já foi usado numa escala ou disponibilidade — desative em vez de excluir.",
};

export default async function TurnosPage({ searchParams }: PageProps<"/precos/turnos">) {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const sp = await searchParams;
  const erroParam = typeof sp?.erro === "string" ? sp.erro : null;
  const mensagemErro = erroParam ? (MENSAGENS_ERRO[erroParam] ?? MENSAGENS_ERRO["1"]) : null;

  const supabase = getServerSupabaseClient();
  const demo = !supabase;

  let turnos: TurnoConfig[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("turnos_config")
      .select("nome, hora_inicio, hora_fim, valor, ativo")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    turnos = (data ?? []) as TurnoConfig[];
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/precos" className="mb-2 inline-block text-[12.5px]" style={{ color: "var(--text-soft)" }}>
          ← Preços
        </Link>
        <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Turnos
        </h1>
        <p className="max-w-[60ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Turnos disponíveis pra escalar bombeiro e cadastrar disponibilidade. Desativar só tira da lista oferecida
          pra escolha nova — escalas já feitas continuam normalmente. Nome não pode ser alterado depois de criado.
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

      <div className="panel-block mb-4">
        <div className="overflow-x-auto">
          <table className="min-w-[560px]">
            <thead>
              <tr>
                <th>Turno</th>
                <th colSpan={3}>Horário e valor</th>
                <th>Ativo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center" style={{ color: "var(--text-faint)" }}>
                    Nenhum turno cadastrado ainda.
                  </td>
                </tr>
              ) : (
                turnos.map((t) => (
                  <TurnoLinha
                    key={t.nome}
                    nome={t.nome}
                    horaInicio={t.hora_inicio.slice(0, 5)}
                    horaFim={t.hora_fim.slice(0, 5)}
                    valor={Number(t.valor)}
                    ativo={t.ativo}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form action={criarTurno} className="panel-block flex flex-wrap items-end gap-2 p-5">
        <div className="field">
          <label htmlFor="nome">Nome do turno</label>
          <input type="text" id="nome" name="nome" placeholder="Ex.: Vespertino" maxLength={80} required />
        </div>
        <div className="field">
          <label htmlFor="hora_inicio">Início</label>
          <input type="time" id="hora_inicio" name="hora_inicio" required />
        </div>
        <div className="field">
          <label htmlFor="hora_fim">Fim</label>
          <input type="time" id="hora_fim" name="hora_fim" required />
        </div>
        <div className="field">
          <label htmlFor="valor">Valor</label>
          <input type="number" id="valor" name="valor" min={0} step="0.01" required className="w-[110px]" />
        </div>
        <button type="submit" className="btn btn--primary">
          Adicionar
        </button>
      </form>
    </div>
  );
}
