"use server";

import { redirect } from "next/navigation";
import { getSessionSupabaseClient } from "@/lib/supabase/server-auth";

export async function signOut(): Promise<void> {
  const supabase = await getSessionSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}
