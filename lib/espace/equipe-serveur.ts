import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseService } from "../supabase-service";
import { ROLES_EQUIPE } from "./roles";
import type { Exception } from "./gestion-acces";

/**
 * Lecture de l'équipe pour « Comptes & accès ». SERVEUR UNIQUEMENT, clé service_role : à n'appeler
 * qu'après avoir vérifié le droit sur l'app « parametres » (exigerApp / aApp).
 * Les délégués ne sont pas listés pour l'instant (ROLES_EQUIPE).
 */

export type MembreEquipe = {
  id: string;
  nom: string;
  email: string;
  role: string;
  exceptions: Exception[];
  derniereConnexion: string | null;
  suspendu: boolean;
  /** Invité, mais jamais connecté. */
  invitationEnAttente: boolean;
};

export type DonneesEquipe = {
  membres: MembreEquipe[];
  rolesApps: { app_code: string; role: string }[];
};

/** Tous les comptes Auth (API admin, par pages de 1000). */
export async function tousLesComptes(db: SupabaseClient): Promise<User[]> {
  const comptes: User[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers : ${error.message}`);
    comptes.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return comptes;
}

export function estSuspendu(u: User | undefined): boolean {
  const fin = (u as (User & { banned_until?: string | null }) | undefined)?.banned_until;
  return Boolean(fin && new Date(fin).getTime() > Date.now());
}

export async function chargerEquipe(): Promise<DonneesEquipe | null> {
  const db = getSupabaseService();
  if (!db) return null;
  const [profils, acces, roles, comptes] = await Promise.all([
    db.from("profiles").select("id, name, email, role").in("role", [...ROLES_EQUIPE]),
    db.from("site_app_acces").select("id, user_id, app_code, type"),
    db.from("site_app_roles").select("app_code, role"),
    tousLesComptes(db),
  ]);
  if (profils.error || acces.error || roles.error) {
    console.error("[equipe]", profils.error?.code ?? acces.error?.code ?? roles.error?.code);
    return null;
  }
  const parId = new Map(comptes.map((u) => [u.id, u]));
  const exceptions = (acces.data ?? []) as (Exception & { user_id: string })[];
  const membres = ((profils.data ?? []) as { id: string; name: string | null; email: string | null; role: string }[])
    .map((p): MembreEquipe => {
      const u = parId.get(p.id);
      return {
        id: p.id,
        nom: p.name?.trim() || p.email || "Sans nom",
        email: p.email ?? u?.email ?? "",
        role: p.role,
        exceptions: exceptions.filter((e) => e.user_id === p.id).map(({ id, app_code, type }) => ({ id, app_code, type })),
        derniereConnexion: u?.last_sign_in_at ?? null,
        suspendu: estSuspendu(u),
        invitationEnAttente: Boolean(u?.invited_at && !u?.last_sign_in_at),
      };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return { membres, rolesApps: (roles.data ?? []) as { app_code: string; role: string }[] };
}

/** Noms à afficher pour une liste d'identifiants (journal). */
export async function nomsDesPersonnes(db: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const uniques = [...new Set(ids.filter(Boolean))];
  if (!uniques.length) return new Map();
  const { data } = await db.from("profiles").select("id, name, email").in("id", uniques);
  return new Map(((data ?? []) as { id: string; name: string | null; email: string | null }[]).map((p) => [p.id, p.name?.trim() || p.email || "Compte supprimé"]));
}
