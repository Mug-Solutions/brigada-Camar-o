import { getSessionUsuario } from "@/lib/auth/session";
import { getSessionSupabaseClient } from "@/lib/supabase/server-auth";
import type { Notificacao } from "@/lib/types";
import { marcarNotificacaoLida } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalInicioPage() {
  const sessao = await getSessionUsuario();
  const nome =
    sessao?.configured && sessao.loggedIn && sessao.usuario?.nome ? sessao.usuario.nome.split(" ")[0] : "Bombeiro";

  let notificacoes: Notificacao[] = [];
  if (sessao.configured && sessao.loggedIn && sessao.usuario?.bombeiro_id) {
    const supabase = await getSessionSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("lida", false)
        .order("criado_em", { ascending: false });
      notificacoes = (data ?? []) as Notificacao[];
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-[22px] uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Olá, {nome}
      </h1>
      <p className="mb-6 text-[13px]" style={{ color: "var(--text-soft)" }}>
        Bem-vindo ao Portal do Bombeiro.
      </p>

      {notificacoes.length > 0 && (
        <div className="mb-5 space-y-2">
          {notificacoes.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-[13px]"
              style={
                n.nivel === "crit"
                  ? { borderColor: "var(--crit)", background: "var(--crit-bg)", color: "var(--crit)" }
                  : { borderColor: "var(--warn)", background: "var(--warn-bg)", color: "var(--warn)" }
              }
            >
              <span>{n.mensagem}</span>
              <form action={marcarNotificacaoLida}>
                <input type="hidden" name="notificacao_id" value={n.id} />
                <button type="submit" className="btn">
                  Marcar como lida
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <div className="panel-block p-5">
        <p className="text-[13px]" style={{ color: "var(--text-soft)" }}>
          Sua escala e seus documentos aparecem no menu abaixo.
        </p>
      </div>
    </div>
  );
}
