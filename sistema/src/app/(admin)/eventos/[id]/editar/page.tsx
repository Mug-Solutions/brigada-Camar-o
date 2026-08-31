import { notFound, redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/session";
import type { Evento } from "@/lib/types";
import { EditarEventoForm } from "./EditarEventoForm";

export const dynamic = "force-dynamic";

type ClienteResumo = { id: string; nome: string };

export default async function EditarEventoPage({ params }: PageProps<"/eventos/[id]/editar">) {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const { id } = await params;

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return (
      <div className="panel-block p-6 text-[13.5px]" style={{ color: "var(--text-soft)" }}>
        Edição de evento exige um projeto Supabase configurado — não disponível no modo de demonstração.
      </div>
    );
  }

  const [{ data: evento }, { data: clientesData }] = await Promise.all([
    supabase.from("eventos").select("*").eq("id", id).maybeSingle(),
    supabase.from("clientes").select("id, nome").order("nome", { ascending: true }),
  ]);

  if (!evento) notFound();

  const eventoTyped = evento as Evento;
  const clientes = (clientesData ?? []) as ClienteResumo[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-[26px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Editar Evento
        </h1>
        <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          {eventoTyped.nome}
        </p>
      </div>
      <EditarEventoForm evento={eventoTyped} clientes={clientes} />
    </div>
  );
}
