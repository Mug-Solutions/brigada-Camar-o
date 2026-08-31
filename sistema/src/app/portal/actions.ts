"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUsuario } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** `bombeiro_id` vem da sessão, nunca de um campo de formulário — o
 * `notificacao_id` sozinho não seria suficiente pra impedir um
 * bombeiro marcar como lida a notificação de outro, por isso o
 * update é sempre escopado também a bombeiro_id. */
export async function marcarNotificacaoLida(formData: FormData): Promise<void> {
  const sessao = await getSessionUsuario();
  if (!sessao.configured || !sessao.loggedIn) redirect("/login");

  const bombeiroId = sessao.usuario?.bombeiro_id;
  if (!bombeiroId) redirect("/login");

  const notificacaoId = String(formData.get("notificacao_id") ?? "");
  if (!notificacaoId) redirect("/portal");

  const supabase = createServerSupabaseClient();
  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", notificacaoId)
    .eq("bombeiro_id", bombeiroId);

  revalidatePath("/portal");
}
