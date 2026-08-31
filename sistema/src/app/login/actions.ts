"use server";

import { redirect } from "next/navigation";
import { getSessionSupabaseClient } from "@/lib/supabase/server-auth";
import { resolveHomePath } from "@/lib/auth/session";
import type { Papel } from "@/lib/constants";

export type LoginState = { error: string | null };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await getSessionSupabaseClient();
  if (!supabase) {
    return { error: "Autenticação não configurada neste ambiente." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (signInError) {
    return { error: "E-mail ou senha incorretos." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("papel, ativo")
    .eq("auth_id", user!.id)
    .maybeSingle();

  if (!usuario) {
    return { error: "Conta sem cadastro de acesso no sistema. Fale com a coordenação." };
  }
  if (!usuario.ativo) {
    return { error: "Seu cadastro ainda está em análise pela coordenação." };
  }

  redirect(resolveHomePath(usuario.papel as Papel));
}
