import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { buscarFuncoesAtivas } from "@/lib/funcoes";
import { FUNCOES } from "@/lib/constants";
import { NovoBombeiroForm } from "./NovoBombeiroForm";

export default async function NovoBombeiroPage() {
  const acesso = await requireStaff();
  if (!acesso.ok) redirect("/login");

  const supabase = getServerSupabaseClient();
  const funcoes = supabase ? await buscarFuncoesAtivas(supabase) : [...FUNCOES];

  return (
    <div>
      <div className="mb-6">
        <h1
          className="mb-1 text-[26px] uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Novo Bombeiro
        </h1>
        <p className="max-w-[56ch] text-[13.5px]" style={{ color: "var(--text-soft)" }}>
          Cadastro e documentação obrigatória.
        </p>
      </div>
      <NovoBombeiroForm funcoes={funcoes} />
    </div>
  );
}
