import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { MOCK_EVENTOS } from "@/lib/mock-data";
import { DemoBanner } from "@/components/DemoBanner";
import { ALIMENTACAO_DIA } from "@/lib/constants";
import { buscarPrecoAlimentacao } from "@/lib/precos";
import type { Escala, Evento } from "@/lib/types";
import { EventosTabela } from "./EventosTabela";

export const dynamic = "force-dynamic";

type EventoComCliente = Evento & { clientes: { nome: string } | null };
export type EscalaComBombeiro = Escala & { bombeiros: { nome: string } | null };

const MENSAGENS_ERRO: Record<string, string> = {
  "1": "Não foi possível concluir a ação. Tente novamente.",
};

export default async function EventosPage({ searchParams }: PageProps<"/eventos">) {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const params = await searchParams;
  const erroParam = typeof params?.erro === "string" ? params.erro : null;
  const mensagemErro = erroParam ? (MENSAGENS_ERRO[erroParam] ?? MENSAGENS_ERRO["1"]) : null;

  const supabase = getServerSupabaseClient();
  const demo = !supabase;

  let eventos: EventoComCliente[] = MOCK_EVENTOS.map((e) => ({ ...e, clientes: null }));
  let escalas: EscalaComBombeiro[] = [];
  let precoAlimentacao = ALIMENTACAO_DIA;
  let error: { message: string } | null = null;

  if (supabase) {
    const result = await supabase
      .from("eventos")
      .select("*, clientes(nome)")
      .order("data_inicio", { ascending: true });
    eventos = (result.data ?? []) as unknown as EventoComCliente[];
    error = result.error;

    if (eventos.length > 0) {
      const { data: escalasData } = await supabase
        .from("escalas")
        .select("*, bombeiros(nome)")
        .in("evento_id", eventos.map((e) => e.id))
        .order("data", { ascending: true });
      escalas = (escalasData ?? []) as unknown as EscalaComBombeiro[];
    }

    precoAlimentacao = await buscarPrecoAlimentacao(supabase);
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="mb-1 text-[26px] uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Eventos &amp; Escalas
          </h1>
          <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
            Contratos recebidos de empresas organizadoras e a escala de bombeiros alocada em cada um.
          </p>
        </div>
        <Link href="/eventos/novo" className="btn btn--primary">
          + Novo Evento
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

      {error ? (
        <div className="panel-block p-6 text-[13px]" style={{ color: "var(--crit)" }}>
          Erro ao carregar eventos: {error.message}
        </div>
      ) : eventos.length === 0 ? (
        <div className="panel-block p-10 text-center text-[13px]" style={{ color: "var(--text-faint)" }}>
          Nenhum evento cadastrado ainda.
        </div>
      ) : (
        <div className="panel-block mb-4">
          <div className="overflow-x-auto">
            <EventosTabela eventos={eventos} escalas={escalas} precoAlimentacao={precoAlimentacao} />
          </div>
        </div>
      )}

      <div
        className="rounded-md border px-4 py-3 text-[13px]"
        style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--text-soft)" }}
      >
        Clique no nome de um evento para ver a ficha completa — a montagem de escala fica num botão dentro dela.
      </div>
    </div>
  );
}
