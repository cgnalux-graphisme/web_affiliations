import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSuperAdmin } from "./supabase-server";
import { getSupabaseService } from "./supabase-service";
import {
  DEMANDES,
  PAR_PAGE,
  TYPES_DEMANDE,
  debutJourBruxelles,
  lendemain,
  motsRecherche,
  type LigneDemande,
  type ReponseListe,
  type Tri,
  type TypeDemande,
} from "./demandes";

/**
 * Back-office des demandes — SERVEUR UNIQUEMENT (routes /api/admin/demandes).
 * Données personnelles d'affiliés : lues avec la clé service_role, après vérification du rôle SUPER_ADMIN.
 * Rien n'est jamais écrit. Aucune donnée de demande n'est journalisée.
 */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** En-têtes des réponses : jamais de cache (ni navigateur ni CDN), pas d'indexation. */
export const SANS_CACHE = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex" };

export function erreurJson(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status, headers: SANS_CACHE });
}

/** Vérifie la session super admin puis ouvre le client service_role ; sinon, la réponse d'erreur à renvoyer. */
export async function accesDemandes(): Promise<{ db: SupabaseClient } | { refus: NextResponse }> {
  if (!(await getSuperAdmin())) return { refus: erreurJson("Accès refusé. Reconnectez-vous.", 401) };
  const db = getSupabaseService();
  if (!db) {
    return { refus: erreurJson("Le back-office n'est pas configuré : la variable SUPABASE_SERVICE_ROLE_KEY manque sur le serveur.", 503) };
  }
  return { db };
}

/** Sélection de base d'un type : la bonne table, restreinte au bon type de mandat pour le SEPA. */
function requete<T>(type: TypeDemande, q: T): T {
  // Le typage fin de supabase-js est trop profond pour une fonction générique : on passe par un type minimal.
  const b = q as unknown as { eq: (c: string, v: string) => unknown; or: (f: string) => unknown };
  if (type === "changement") return b.eq("type_demande", "changement_compte") as T;
  // Mandats plus anciens sans type : comptés comme nouveaux mandats.
  if (type === "sepa") return b.or("type_demande.is.null,type_demande.neq.changement_compte") as T;
  return q;
}

export type FiltresListe = {
  type: TypeDemande;
  q?: string | null;
  /** Dates ISO aaaa-mm-jj (bornes incluses). */
  du?: string | null;
  au?: string | null;
  tri: Tri;
  page: number;
};

export async function listerDemandes(db: SupabaseClient, f: FiltresListe): Promise<ReponseListe> {
  const config = DEMANDES[f.type];
  const colonnes = "id, created_at, nom, prenom, email";

  const chercher = (page: number) => {
    let q = requete(f.type, db.from(config.table).select(colonnes, { count: "exact" }));
    // Chaque mot doit se trouver dans le nom, le prénom ou l'e-mail.
    for (const mot of motsRecherche(f.q)) {
      q = q.or(`nom.ilike.*${mot}*,prenom.ilike.*${mot}*,email.ilike.*${mot}*`);
    }
    if (f.du) q = q.gte("created_at", debutJourBruxelles(f.du));
    if (f.au) q = q.lt("created_at", debutJourBruxelles(lendemain(f.au)));
    if (f.tri === "nom_asc" || f.tri === "nom_desc") {
      const asc = f.tri === "nom_asc";
      q = q.order("nom", { ascending: asc, nullsFirst: false }).order("prenom", { ascending: asc, nullsFirst: false });
    }
    q = q.order("created_at", { ascending: f.tri === "date_asc" });
    const debut = (page - 1) * PAR_PAGE;
    return q.range(debut, debut + PAR_PAGE - 1);
  };

  let page = Math.max(1, f.page);
  let { data, error, count } = await chercher(page);
  // Page au-delà de la dernière (adresse modifiée, filtres changés) : on sert la dernière page.
  // Le nombre de lignes est dans error.details (« … but there are only 29 rows. ») ; à défaut, page 1.
  if (error?.code === "PGRST103" && page > 1) {
    const total = Number(/only (\d+) rows?/.exec(error.details ?? "")?.[1] ?? 0);
    page = Math.max(1, Math.ceil(total / PAR_PAGE));
    ({ data, error, count } = await chercher(page));
  }
  if (error) throw new Error(`liste ${f.type} : ${error.code ?? ""} ${error.message}`);

  // Compteurs des onglets (sans filtre) : requêtes « head », aucune ligne transférée.
  const compteurs: ReponseListe["compteurs"] = {};
  await Promise.all(
    TYPES_DEMANDE.map(async (t) => {
      const { count: n, error: e } = await requete(t, db.from(DEMANDES[t].table).select("id", { count: "exact", head: true }));
      if (!e && n !== null) compteurs[t] = n;
    })
  );

  const lignes = ((data ?? []) as unknown as Record<string, unknown>[]).map(
    (l): LigneDemande => ({
      id: String(l.id),
      created_at: String(l.created_at ?? ""),
      nom: (l.nom as string | null) ?? null,
      prenom: (l.prenom as string | null) ?? null,
      email: (l.email as string | null) ?? null,
    })
  );
  return { lignes, total: count ?? lignes.length, page, parPage: PAR_PAGE, compteurs };
}

/** Une demande complète (toutes ses colonnes), ou null si elle n'existe pas pour ce type. */
export async function lireDemande(db: SupabaseClient, type: TypeDemande, id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await requete(type, db.from(DEMANDES[type].table).select("*").eq("id", id)).maybeSingle();
  if (error) throw new Error(`détail ${type} : ${error.code ?? ""} ${error.message}`);
  return (data as Record<string, unknown> | null) ?? null;
}
