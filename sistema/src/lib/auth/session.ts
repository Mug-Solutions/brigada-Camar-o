import "server-only";
import { getSessionSupabaseClient } from "@/lib/supabase/server-auth";
import { HOME_POR_PAPEL, type Papel } from "@/lib/constants";
import type { Usuario } from "@/lib/types";

/**
 * Para onde redirecionar depois do login (ou ao acessar uma área que não
 * é a do papel do usuário). Função pura — sem I/O — para ser testada
 * isoladamente da sessão real do Supabase.
 */
export function resolveHomePath(papel: Papel): string {
  return HOME_POR_PAPEL[papel];
}

/**
 * `configured: false` (auth não configurada — modo apresentação) e
 * `loggedIn: false` (auth configurada, mas sem sessão válida) são
 * estados diferentes de propósito: o primeiro é "deixa passar" (mesma
 * postura do proxy, ver src/proxy.ts), o segundo é "nega acesso". Um
 * union só com `usuario: null` nos dois casos esconderia essa diferença
 * de quem for reusar isso para autorizar uma Server Action.
 */
export type SessionResult =
  | { configured: false }
  | { configured: true; loggedIn: false }
  | { configured: true; loggedIn: true; authId: string; email: string | null; usuario: Usuario | null };

export async function getSessionUsuario(): Promise<SessionResult> {
  const supabase = await getSessionSupabaseClient();
  if (!supabase) return { configured: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { configured: true, loggedIn: false };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();

  return {
    configured: true,
    loggedIn: true,
    authId: user.id,
    email: user.email ?? null,
    usuario: (usuario as Usuario) ?? null,
  };
}

export type RoleCheck = { ok: true } | { ok: false; error: string };

/**
 * Guard de defesa em profundidade para Server Actions que usam a
 * service-role key (ignora RLS) — ex.: src/app/(admin)/bombeiros/actions.ts.
 * A documentação do Next.js 16 é explícita: um Server Function não é uma
 * rota separada na cadeia do proxy, então uma mudança de matcher ou de
 * rota pode silenciosamente remover a proteção do proxy sem que a action
 * perceba. Toda Server Action que usa createServerSupabaseClient() (a
 * versão service-role) deve chamar requireStaff() como primeira linha.
 *
 * Em modo apresentação (auth não configurada) deixa passar — mesma
 * postura do proxy, para não quebrar o fluxo de demonstração sem banco.
 */
export async function requireStaff(): Promise<RoleCheck> {
  const session = await getSessionUsuario();
  if (!session.configured) return { ok: true };
  if (!session.loggedIn) return { ok: false, error: "Sessão expirada. Faça login novamente." };
  if (!session.usuario || session.usuario.papel !== "staff" || !session.usuario.ativo) {
    return { ok: false, error: "Acesso restrito à equipe da Brigada Camarão." };
  }
  return { ok: true };
}
