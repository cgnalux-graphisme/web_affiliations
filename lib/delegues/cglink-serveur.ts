import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "../supabase-server";
import { champsAEnvoyer, fusionnerEntree, lireReponseFonction, versCgLink } from "./cglink";
import type { Delegue, DelegueCgLink, Mandat } from "./types";

/**
 * Accès à CG Link. SERVEUR UNIQUEMENT, après vérification du rôle SUPER_ADMIN.
 * `companies.delegates` est un seul champ par entreprise, modifiable en même temps par CG Link : on relit,
 * on modifie seulement l'entrée du délégué, on écrit si `updated_at` n'a pas bougé (3 essais).
 */

export const ERREUR_SYNCHRO = "Enregistré dans l'Espace, mais CG Link n'a pas pu être mis à jour : utilisez « Envoyer à CG Link ».";

export async function modifierDelegues(
  db: SupabaseClient,
  companyId: string,
  transformer: (ds: DelegueCgLink[]) => DelegueCgLink[] | null
): Promise<"ok" | "introuvable" | "conflit" | "erreur"> {
  for (let essai = 0; essai < 3; essai++) {
    const { data, error } = await db.from("companies").select("delegates, updated_at").eq("id", companyId).maybeSingle();
    if (error || !data) return "erreur";
    const suivant = transformer(((data.delegates ?? []) as DelegueCgLink[]));
    if (!suivant) return "introuvable";
    const r = await db.from("companies").update({ delegates: suivant }).eq("id", companyId).eq("updated_at", data.updated_at).select("id");
    if (r.error) {
      console.error("[delegues] écriture CG Link :", r.error.code);
      return "erreur";
    }
    if (r.data?.length) return "ok";
  }
  return "conflit";
}

/** Entreprise CG Link qui contient l'entrée du délégué ; « erreur » si CG Link n'a pas répondu (≠ introuvable). */
export async function companyDuDelegue(db: SupabaseClient, cglinkId: string): Promise<{ id: string; entree: DelegueCgLink } | null | "erreur"> {
  const { data, error } = await db.from("companies").select("id, delegates").order("id");
  if (error) {
    console.error("[delegues] lecture CG Link :", error.code);
    return "erreur";
  }
  for (const c of (data ?? []) as { id: string; delegates: DelegueCgLink[] | null }[]) {
    const entree = (c.delegates ?? []).find((d) => d.id === cglinkId);
    if (entree) return { id: c.id, entree };
  }
  return null;
}

/** Appel d'une fonction de CG Link avec la session du super admin (CG Link revérifie ses droits). */
export async function appelerFonctionCgLink(nom: "invite-user" | "cancel-invite", corps: Record<string, unknown>) {
  const supabase = await getSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false as const, erreur: "Votre session a expiré. Reconnectez-vous puis réessayez." };
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${nom}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    const json = await r.json().catch(() => null);
    return lireReponseFonction(r.status, json);
  } catch {
    return { ok: false as const, erreur: "CG Link n'a pas répondu. Réessayez dans un instant." };
  }
}

/** Envoie la carte (nom, téléphone, mandats ; jamais l'e-mail) dans l'entrée CG Link du délégué, + profiles.name. */
export async function synchroniser(db: SupabaseClient, d: Delegue, mandats: Mandat[]) {
  if (!d.cglink_user_id) return { ok: true as const };
  const lieu = await companyDuDelegue(db, d.cglink_user_id);
  if (lieu === "erreur") return { ok: false as const, erreur: ERREUR_SYNCHRO };
  if (!lieu) return { ok: false as const, erreur: "Compte CG Link introuvable : retirez le lien ou relancez l'import." };
  const champs = versCgLink(d, mandats, new Date().toISOString().slice(0, 10));
  const r = await modifierDelegues(db, lieu.id, (ds) => fusionnerEntree(ds, d.cglink_user_id!, champsAEnvoyer(champs)));
  if (r !== "ok") return { ok: false as const, erreur: r === "conflit" ? "CG Link a été modifié en même temps. Réessayez." : ERREUR_SYNCHRO };
  const p = await db.from("profiles").update({ name: champs.name }).eq("id", d.cglink_user_id);
  if (p.error) console.error("[delegues] profil CG Link :", p.error.code);
  return { ok: true as const };
}
