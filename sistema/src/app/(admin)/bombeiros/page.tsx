import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { MOCK_BOMBEIROS } from "@/lib/mock-data";
import { DemoBanner } from "@/components/DemoBanner";
import type { Bombeiro, BombeiroDocumento } from "@/lib/types";
import { BombeirosTabela } from "./BombeirosTabela";

export const dynamic = "force-dynamic";

export default async function BombeirosPage() {
  // Defesa em profundidade — não depende só do matcher de src/proxy.ts
  // (ver comentário lá: um matcher desatualizado já deixou /clientes e
  // /precos sem proteção nenhuma, achado real em 2026-08-29).
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const supabase = getServerSupabaseClient();
  const demo = !supabase;

  let bombeiros: Bombeiro[] = MOCK_BOMBEIROS;
  let documentos: BombeiroDocumento[] = [];

  if (supabase) {
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
    bombeiros = (data ?? []) as Bombeiro[];

    if (bombeiros.length > 0) {
      const { data: documentosData } = await supabase
        .from("bombeiro_documentos")
        .select("*")
        .in("bombeiro_id", bombeiros.map((b) => b.id))
        .order("enviado_em", { ascending: false });
      documentos = (documentosData ?? []) as BombeiroDocumento[];
    }
  }

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
        <div className="flex gap-2">
          <Link href="/bombeiros/funcoes" className="btn">
            Funções
          </Link>
          <Link href="/bombeiros/importar" className="btn">
            Importar CSV
          </Link>
          <Link href="/bombeiros/aprovacoes" className="btn">
            Convidar Bombeiro
          </Link>
          <Link href="/bombeiros/novo" className="btn btn--primary">
            + Novo Bombeiro
          </Link>
        </div>
      </div>

      {demo && <DemoBanner />}

      <div className="panel-block">
        <div className="overflow-x-auto">
          <BombeirosTabela bombeiros={bombeiros} documentos={documentos} />
        </div>
      </div>
    </div>
  );
}
