import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import { MOCK_CLIENTES } from "@/lib/mock-data";
import { NovoEventoForm } from "./NovoEventoForm";

export const dynamic = "force-dynamic";

type ClienteResumo = { id: string; nome: string };

export default async function NovoEventoPage() {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const supabase = getServerSupabaseClient();

  let clientes: ClienteResumo[] = MOCK_CLIENTES.map(({ id, nome }) => ({ id, nome }));
  if (supabase) {
    const { data } = await supabase.from("clientes").select("id, nome").order("nome", { ascending: true });
    clientes = (data ?? []) as ClienteResumo[];
  }

  return (
    <div>
      <div className="mb-6">
        <h1
          className="mb-1 text-[26px] uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Novo Evento
        </h1>
        <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Contrato de um cliente já cadastrado. O orçamento entra como proposto e é aprovado depois, na
          listagem de eventos.
        </p>
      </div>
      <NovoEventoForm clientes={clientes} />
    </div>
  );
}
