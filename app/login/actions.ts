"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "../../lib/supabase-server";

export async function deconnexion() {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login?deconnecte=1");
}
