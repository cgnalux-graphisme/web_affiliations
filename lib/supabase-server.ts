import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSuperAdmin } from "./admin";

/** Client Supabase côté serveur (Server Components, Server Actions), lié aux cookies de session. */
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Appelé depuis un Server Component : écriture impossible, le proxy s'en charge.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

/** Retourne l'utilisateur connecté s'il est SUPER_ADMIN, sinon null. */
export async function getSuperAdmin() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return (await isSuperAdmin(supabase, user.id)) ? user : null;
}
