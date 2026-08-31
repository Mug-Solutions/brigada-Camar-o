import { redirect } from "next/navigation";
import { getSessionSupabaseClient } from "@/lib/supabase/server-auth";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { buscarFuncoesAtivas } from "@/lib/funcoes";
import { FUNCOES } from "@/lib/constants";
import { CompletarCadastroForm } from "./CompletarCadastroForm";

export const dynamic = "force-dynamic";

export default async function CompletarCadastroPage() {
  const sessionClient = await getSessionSupabaseClient();
  if (!sessionClient) redirect("/login");

  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = getServerSupabaseClient();
  const solicitacao = supabase
    ? (
        await supabase.from("solicitacoes_cadastro").select("status").eq("auth_id", user.id).maybeSingle()
      ).data
    : null;

  if (!solicitacao || solicitacao.status === "aprovado" || solicitacao.status === "recusado") {
    redirect("/login");
  }

  const funcoes = supabase ? await buscarFuncoesAtivas(supabase) : [...FUNCOES];

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div style={{ fontFamily: "var(--font-display)" }}>
            <span className="block text-[15px] tracking-wide" style={{ color: "var(--text-soft)" }}>
              BRIGADA
            </span>
            <span className="block text-[26px] leading-tight" style={{ color: "var(--accent)" }}>
              CAMARÃO
            </span>
          </div>
        </div>

        {solicitacao.status === "convidado" ? (
          <>
            <p className="mb-4 text-center text-[12.5px]" style={{ color: "var(--text-faint)" }}>
              Falta pouco — preencha seus dados pra coordenação revisar.
            </p>
            <CompletarCadastroForm funcoes={funcoes} />
          </>
        ) : (
          <div className="panel-block p-6 text-center">
            <p className="text-[13.5px]" style={{ color: "var(--ok)" }}>
              Cadastro enviado! Avise a coordenação que você concluiu o cadastro — o acesso é liberado assim que for
              aprovado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
