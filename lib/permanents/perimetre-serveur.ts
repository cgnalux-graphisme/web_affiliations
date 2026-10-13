import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseService } from "../supabase-service";
import { aApp, estSuperAdmin, exigerApp, monProfil } from "../espace/acces";
import { companiesDuPermanent, fichesDuPerimetre } from "./perimetre";

/**
 * Périmètre d'un permanent, lu dans CG Link (companies.permanent_email). SERVEUR UNIQUEMENT (service_role).
 * Mis en cache pour la durée d'une requête.
 */

export type Perimetre = { email: string; companyIds: Set<string>; ficheIds: Set<string> };

export const perimetreDe = cache(async (email: string): Promise<Perimetre> => {
  const vide = { email, companyIds: new Set<string>(), ficheIds: new Set<string>() };
  const db = getSupabaseService();
  if (!db || !email.trim()) return vide;
  const [companies, fiches] = await Promise.all([
    db.from("companies").select("id, permanent_email"),
    db.from("site_entreprises").select("id, company_id, autres_company_ids"),
  ]);
  if (companies.error || fiches.error) {
    console.error("[permanents] périmètre :", companies.error?.code ?? fiches.error?.code);
    return vide;
  }
  const companyIds = companiesDuPermanent((companies.data ?? []) as { id: string; permanent_email: string | null }[], email);
  const ficheIds = fichesDuPerimetre(
    (fiches.data ?? []) as { id: string; company_id: string | null; autres_company_ids: string[] | null }[],
    companyIds
  );
  return { email, companyIds, ficheIds };
});

/** Périmètre de la personne connectée. */
export const monPerimetre = cache(async (): Promise<Perimetre> => perimetreDe((await monProfil())?.email ?? ""));

/**
 * Droit sur les délégués : tous (SUPER_ADMIN), ceux des fiches du périmètre (toute autre personne qui a l'app
 * « delegues », en pratique les permanents), ou aucun (null).
 */
export type AccesDelegues = { tout: true } | { tout: false; fiches: Set<string> };

export const accesDelegues = cache(async (): Promise<AccesDelegues | null> => {
  if (await estSuperAdmin()) return { tout: true };
  if (!(await aApp("delegues"))) return null;
  return { tout: false, fiches: (await monPerimetre()).ficheIds };
});

export function dansAcces(acces: AccesDelegues, entrepriseId: string | null | undefined): boolean {
  return acces.tout || Boolean(entrepriseId && acces.fiches.has(entrepriseId));
}

/** Comptes PERMANENT (sélecteur « Vu comme » du super admin, filtre du rapport). */
export const listePermanents = cache(async (): Promise<{ id: string; nom: string; email: string }[]> => {
  const db = getSupabaseService();
  if (!db) return [];
  const { data } = await db.from("profiles").select("id, name, email").eq("role", "PERMANENT").order("name");
  return ((data ?? []) as { id: string; name: string | null; email: string | null }[])
    .filter((p) => p.email)
    .map((p) => ({ id: p.id, nom: (p.name ?? p.email ?? "").replace(/\s*\(Permanent\)\s*$/i, ""), email: p.email as string }));
});

/** Garde d'une page de l'app Délégués : connexion, app, puis droit sur les délégués. */
export async function exigerAccesDelegues(): Promise<AccesDelegues> {
  await exigerApp("delegues");
  const acces = await accesDelegues();
  if (!acces) redirect("/espace/sans-acces?app=delegues");
  return acces;
}
