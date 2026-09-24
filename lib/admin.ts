import type { SupabaseClient } from "@supabase/supabase-js";

export const SUPER_ADMIN = "SUPER_ADMIN";

/** Lit le rôle dans profiles (profiles.id = id de l'utilisateur connecté). */
export async function isSuperAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return !error && data?.role === SUPER_ADMIN;
}

/** N'accepte qu'un chemin interne (évite les redirections vers un autre site). */
export function safeNext(next: string | null | undefined, fallback = "/suivi-actions"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
