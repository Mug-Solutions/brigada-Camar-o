import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { fmtDateBR } from "@/lib/domain";
import { gerarPixBombeiro } from "@/lib/pix";
import { PixListaBombeiros, type ItemPix } from "./PixListaBombeiros";

export const dynamic = "force-dynamic";

type LinhaFolha = {
  id: string;
  data: string;
  turno: string;
  valor: number;
  pago: boolean;
  bombeiros: { nome: string; chave_pix: string | null } | null;
};

export default async function PixEventoPage({ params, searchParams }: PageProps<"/financeiro/[id]/pix">) {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const mensagemErro = sp?.erro === "1" ? "Não foi possível concluir a ação. Tente novamente." : null;

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return (
      <div className="panel-block p-6 text-[13.5px]" style={{ color: "var(--text-soft)" }}>
        PIX exige um projeto Supabase configurado — não disponível no modo de demonstração.
      </div>
    );
  }

  const [{ data: evento }, { data: escalasData, error }] = await Promise.all([
    supabase.from("eventos").select("nome, clientes(nome)").eq("id", id).maybeSingle(),
    supabase
      .from("escalas")
      .select("id, data, turno, valor, pago, bombeiros(nome, chave_pix)")
      .eq("evento_id", id)
      .eq("tipo", "titular")
      .order("data", { ascending: true }),
  ]);

  if (!evento) notFound();

  const eventoTyped = evento as unknown as { nome: string; clientes: { nome: string } | null };
  const linhas = (escalasData ?? []) as unknown as LinhaFolha[];

  // Gera BR Code + QR de quem tem chave PIX cadastrada — em paralelo,
  // já que cada geração é só computação local (sem chamada de rede).
  const pixPorEscala = new Map<string, Awaited<ReturnType<typeof gerarPixBombeiro>>>(
    await Promise.all(
      linhas
        .filter((l) => l.bombeiros?.chave_pix)
        .map(async (l) => {
          const resultado = await gerarPixBombeiro({
            nomeBombeiro: l.bombeiros!.nome,
            chavePix: l.bombeiros!.chave_pix!,
            valor: Number(l.valor),
            descricao: `${eventoTyped.nome} ${fmtDateBR(l.data)} ${l.turno}`,
          });
          return [l.id, resultado] as const;
        })
    )
  );

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/financeiro/${id}`}
          className="mb-2 inline-block text-[12.5px]"
          style={{ color: "var(--text-soft)" }}
        >
          ← Folha de Pagamento
        </Link>
        <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Pagar via PIX
        </h1>
        <p className="text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          {eventoTyped.nome} · {eventoTyped.clientes?.nome ?? "Sem cliente"}
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
      {error && (
        <div className="panel-block mb-4 p-4 text-[13px]" style={{ color: "var(--crit)" }}>
          Erro ao carregar: {error.message}
        </div>
      )}

      {linhas.length === 0 ? (
        <div className="panel-block p-6 text-center text-[13.5px]" style={{ color: "var(--text-faint)" }}>
          Nenhum titular escalado neste evento ainda.
        </div>
      ) : (
        <PixListaBombeiros
          eventoId={id}
          itens={linhas.map((l): ItemPix => {
            const gerado = pixPorEscala.get(l.id);
            return {
              id: l.id,
              nomeBombeiro: l.bombeiros?.nome ?? "—",
              chavePix: l.bombeiros?.chave_pix ?? null,
              data: l.data,
              turno: l.turno,
              valor: Number(l.valor),
              pago: l.pago,
              pix:
                !gerado || gerado.error !== null
                  ? { erro: gerado?.error ?? "erro desconhecido" }
                  : { erro: null, brCode: gerado.brCode, qrCodeImage: gerado.qrCodeImage },
            };
          })}
        />
      )}
    </div>
  );
}
