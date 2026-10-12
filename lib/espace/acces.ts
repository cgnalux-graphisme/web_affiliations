import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseServer } from "../supabase-server";
import { ROLES_EQUIPE, type Role } from "./roles";

/**
 * Droits de l'Espace CG, toujours lus dans la base avec la session de la personne :
 * - site_mes_apps() : codes des apps de l'utilisateur connecté (SUPER_ADMIN = toutes) ;
 * - site_a_app(p_code) : vrai / faux pour une app.
 * Rien n'est codé en dur : rôles par défaut (site_app_roles) et exceptions (site_app_acces) sont en base.
 * Toutes les fonctions sont mises en cache pour la durée d'une requête (layout + page + actions).
 */

export const utilisateurConnecte = cache(async (): Promise<User | null> => {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

export type Profil = { id: string; email: string; nom: string | null; role: Role | string };

/** Profil de la personne connectée (profiles : nom, e-mail, rôle partagé avec CG Link). */
export const monProfil = cache(async (): Promise<Profil | null> => {
  const user = await utilisateurConnecte();
  if (!user) return null;
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("profiles").select("id, email, name, role").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: (data?.email as string | null) ?? user.email ?? "",
    nom: (data?.name as string | null) ?? null,
    role: (data?.role as string | null) ?? "",
  };
});

/** Codes des apps auxquelles la personne connectée a droit (liste vide si non connectée ou en cas d'erreur). */
export const mesApps = cache(async (): Promise<string[]> => {
  if (!(await utilisateurConnecte())) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("site_mes_apps");
  if (error || !data) {
    if (error) console.error("[espace] site_mes_apps :", error.code);
    return [];
  }
  return lireCodes(data);
});

/** La fonction SQL peut renvoyer un tableau de textes ou un ensemble de lignes : on accepte les deux. */
export function lireCodes(data: unknown): string[] {
  const liste = Array.isArray(data) ? data : [data];
  return liste
    .map((l) => (typeof l === "string" ? l : l && typeof l === "object" ? Object.values(l)[0] : null))
    .filter((c): c is string => typeof c === "string" && c.length > 0);
}

/** Renvoie l'utilisateur s'il a droit à l'app, sinon null (actions serveur, routes API). */
export const aApp = cache(async (code: string): Promise<User | null> => {
  const user = await utilisateurConnecte();
  if (!user) return null;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("site_a_app", { p_code: code });
  if (error) {
    console.error("[espace] site_a_app :", error.code);
    return null;
  }
  return data === true ? user : null;
});

/** Droit sur au moins une des apps (route partagée par plusieurs apps, ex. téléchargement d'image). */
export async function aUneDesApps(codes: string[]): Promise<User | null> {
  for (const code of codes) {
    const user = await aApp(code);
    if (user) return user;
  }
  return null;
}

/**
 * Garde d'une page d'app : non connecté → connexion ; pas de droit → page « pas accès ».
 * (Le layout de l'app fait déjà la même vérification ; la page la refait par sécurité.)
 */
export async function exigerApp(code: string): Promise<User> {
  const user = await utilisateurConnecte();
  if (!user) redirect("/login?next=/espace");
  if (!(await aApp(code))) redirect(`/espace/sans-acces?app=${encodeURIComponent(code)}`);
  return user;
}

/**
 * Accès à l'Espace lui-même : l'équipe (SUPER_ADMIN, ADMIN_OP, PERMANENT) entre toujours, même sans app.
 * Les autres rôles (délégués) n'entrent que si la base leur donne au moins une app (site_app_roles ou exception) :
 * les ouvrir plus tard = cocher des apps pour DELEGATE, sans changer le code.
 */
export async function accesEspace(): Promise<"equipe" | "apps" | "refuse"> {
  const profil = await monProfil();
  if (!profil) return "refuse";
  if ((ROLES_EQUIPE as readonly string[]).includes(profil.role)) return "equipe";
  return (await mesApps()).length > 0 ? "apps" : "refuse";
}
