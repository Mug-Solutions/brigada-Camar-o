import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { MOCK_CLIENTES } from "@/lib/mock-data";
import { DemoBanner } from "@/components/DemoBanner";
import type { Cliente } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  // Defesa em profundidade — não depende só do matcher de src/proxy.ts
  // (achado real: esta rota ficou sem proteção nenhuma até o matcher
  // ser corrigido em 2026-08-29, porque o proxy não roda pra paths
  // fora dele, independente do que ROTAS_POR_PAPEL diga).
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const supabase = getServerSupabaseClient();
  const demo = !supabase;

  let clientes: Cliente[] = MOCK_CLIENTES;

  if (supabase) {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      return (
        <div className="panel-block p-6 text-sm" style={{ color: "var(--crit)" }}>
          Erro ao carregar clientes: {error.message}
        </div>
      );
    }
    clientes = (data ?? []) as Cliente[];
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="mb-1 text-[26px] uppercase tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Clientes
          </h1>
          <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
            Empresas contratantes que fecham eventos com a Brigada Camarão.
          </p>
        </div>
        <Link href="/clientes/novo" className="btn btn--primary">
          + Novo Cliente
        </Link>
      </div>

      {demo && <DemoBanner />}

      <div className="panel-block">
        <div className="overflow-x-auto">
          <table className="min-w-[640px]">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Contato</th>
                <th>E-mail</th>
                <th>Endereço</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center" style={{ color: "var(--text-faint)" }}>
                    Nenhum cliente cadastrado ainda.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.nome}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{c.cnpj ?? "—"}</td>
                    <td>{c.contato ?? "—"}</td>
                    <td>{c.email ?? "—"}</td>
                    <td>{c.endereco ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
