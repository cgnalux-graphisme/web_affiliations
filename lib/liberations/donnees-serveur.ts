import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseService } from "../supabase-service";
import { aApp, exigerApp, monProfil, utilisateurConnecte } from "../espace/acces";
import { monPerimetre } from "../permanents/perimetre-serveur";
import { blocAdresse, nomAffiche } from "../entreprises/regles";
import { libelleCommission } from "../commissions-paritaires";
import { formaterNumeroBce } from "../bce/numero";
import { COLONNES_ENTREPRISE, COLONNES_SITE, COLONNES_UNITE, type Entreprise, type Site, type Unite } from "../entreprises/types";
import { manquesDelegue, resumeManques } from "./regles";
import { actionsPossibles, peutModifier, peutSupprimer, type CodeAction } from "./statuts";
import {
  COLONNES_DATE, COLONNES_DOSSIER, COLONNES_FICHIER, COLONNES_LIEU, COLONNES_PARTICIPANT,
  type DateDossier, type Dossier, type FichierDossier, type Lieu, type Manque, type Participant, type StatutLiberation, type TauxKm,
} from "./types";

/**
 * Lectures de l'app Libérations. SERVEUR UNIQUEMENT (service_role), toujours après vérification du droit :
 * - admin (ADMIN_OP ou SUPER_ADMIN avec l'app) : tous les dossiers, tous les délégués ;
 * - toute autre personne qui a l'app (les permanents) : ses dossiers, les délégués de ses entreprises.
 * Les pièces jointes du bucket privé sont servies par liens signés courts.
 */

export const BUCKET_LIBERATIONS = "liberations";
const DUREE_LIEN = 60 * 60;
export const ROLES_ADMIN = ["ADMIN_OP", "SUPER_ADMIN"] as const;
const UUID = /^[0-9a-f-]{36}$/i;

export type ContexteLiberations = { user: User; admin: boolean; superAdmin: boolean; fiches: Set<string> | "toutes" };

/** Droit de la personne connectée sur l'app (null = pas d'accès). Mis en cache pour la requête. */
export const contexteLiberations = cache(async (): Promise<ContexteLiberations | null> => {
  const user = await utilisateurConnecte();
  if (!user || !(await aApp("liberations"))) return null;
  const role = (await monProfil())?.role ?? "";
  const admin = (ROLES_ADMIN as readonly string[]).includes(role);
  return { user, admin, superAdmin: role === "SUPER_ADMIN", fiches: admin ? "toutes" : (await monPerimetre()).ficheIds };
});

export async function exigerLiberations(): Promise<ContexteLiberations> {
  await exigerApp("liberations");
  const c = await contexteLiberations();
  if (!c) redirect("/espace/sans-acces?app=liberations");
  return c;
}

export async function exigerAdminLiberations(): Promise<ContexteLiberations> {
  const c = await exigerLiberations();
  if (!c.admin) redirect("/espace/sans-acces?app=liberations");
  return c;
}

export function dansPerimetre(c: ContexteLiberations, entrepriseId: string | null | undefined): boolean {
  return c.fiches === "toutes" || Boolean(entrepriseId && c.fiches.has(entrepriseId));
}

const tablesAbsentes = (code?: string) => code === "42P01" || code === "PGRST205" || code === "42703";

// ── Listes de référence ─────────────────────────────────────────────────────

export async function lieux(actifsSeulement = false): Promise<Lieu[] | null> {
  const db = getSupabaseService();
  if (!db) return null;
  let q = db.from("site_liberations_lieux").select(COLONNES_LIEU).order("ordre").order("nom");
  if (actifsSeulement) q = q.eq("actif", true);
  const { data, error } = await q;
  if (error) {
    console.error("[liberations] lieux :", error.code);
    return null;
  }
  return (data ?? []) as Lieu[];
}

export async function tauxKm(): Promise<TauxKm[] | null> {
  const db = getSupabaseService();
  if (!db) return null;
  const { data, error } = await db.from("site_liberations_taux_km").select("id, valable_du, taux").order("valable_du", { ascending: false });
  if (error) {
    console.error("[liberations] taux :", error.code);
    return null;
  }
  return ((data ?? []) as { id: string; valable_du: string; taux: number | string }[]).map((t) => ({ ...t, taux: Number(t.taux) }));
}

export const secteurs = cache(async (): Promise<{ id: string; nom: string }[]> => {
  const db = getSupabaseService();
  if (!db) return [];
  const { data } = await db.from("site_secteurs").select("id, nom").order("nom");
  return (data ?? []) as { id: string; nom: string }[];
});

export type EntrepriseChoix = { id: string; nom: string; secteurId: string | null };

/** Fiches entreprises (noms résolus avec CG Link), triées par nom. */
export const entreprises = cache(async (): Promise<EntrepriseChoix[]> => {
  const db = getSupabaseService();
  if (!db) return [];
  const [{ data: fiches }, { data: companies }] = await Promise.all([
    db.from("site_entreprises").select("id, nom, company_id, secteur_id"),
    db.from("companies").select("id, name"),
  ]);
  const cos = new Map(((companies ?? []) as { id: string; name: string }[]).map((c) => [c.id, c]));
  return ((fiches ?? []) as { id: string; nom: string | null; company_id: string | null; secteur_id: string | null }[])
    .map((f) => ({ id: f.id, nom: nomAffiche(f, f.company_id ? cos.get(f.company_id) ?? null : null), secteurId: f.secteur_id }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
});

async function nomsPersonnes(ids: (string | null)[]): Promise<Map<string, string>> {
  const db = getSupabaseService();
  const uniques = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!db || !uniques.length) return new Map();
  const { data } = await db.from("profiles").select("id, name, email").in("id", uniques);
  return new Map(((data ?? []) as { id: string; name: string | null; email: string | null }[]).map((p) => [
    p.id, (p.name ?? p.email ?? "").replace(/\s*\((Permanent|OP)\)\s*$/i, ""),
  ]));
}

// ── Délégués qu'on peut inviter ─────────────────────────────────────────────

export type DelegueChoix = { id: string; prenom: string | null; nom: string; entrepriseId: string; entreprise: string; secteurId: string | null };

/** Délégués du périmètre (tous pour un admin), avec leur entreprise et son secteur. */
export async function deleguesChoix(c: ContexteLiberations): Promise<DelegueChoix[]> {
  const db = getSupabaseService();
  if (!db) return [];
  const [{ data }, liste] = await Promise.all([
    db.from("site_delegues").select("id, prenom, nom, entreprise_id").order("nom"),
    entreprises(),
  ]);
  const parId = new Map(liste.map((e) => [e.id, e]));
  return ((data ?? []) as { id: string; prenom: string | null; nom: string; entreprise_id: string }[])
    .filter((d) => dansPerimetre(c, d.entreprise_id))
    .map((d) => ({
      id: d.id, prenom: d.prenom, nom: d.nom, entrepriseId: d.entreprise_id,
      entreprise: parId.get(d.entreprise_id)?.nom ?? "", secteurId: parId.get(d.entreprise_id)?.secteurId ?? null,
    }));
}

// ── Liste des dossiers ──────────────────────────────────────────────────────

export type LigneDossier = {
  id: string; numero: number; type: string; objet: string | null; statut: StatutLiberation; premiereDate: string | null;
  nbDates: number; nbParticipants: number; demandeur: string; demandeurId: string; secteurId: string | null; updated_at: string;
  /** Noms des participants et de leurs entreprises (recherche, archives comprises). */
  recherche: string;
};

export async function lignesDossiers(c: ContexteLiberations): Promise<{ ok: true; lignes: LigneDossier[] } | { ok: false; tablesAbsentes: boolean }> {
  const db = getSupabaseService();
  if (!db) return { ok: false, tablesAbsentes: false };
  let q = db.from("site_liberations").select("id, numero, type, objet, statut, demandeur_id, secteur_id, updated_at").order("numero", { ascending: false });
  if (!c.admin) q = q.eq("demandeur_id", c.user.id);
  const { data, error } = await q;
  if (error) {
    console.error("[liberations] liste :", error.code);
    return { ok: false, tablesAbsentes: tablesAbsentes(error.code) };
  }
  const dossiers = (data ?? []) as { id: string; numero: number; type: string; objet: string | null; statut: StatutLiberation; demandeur_id: string; secteur_id: string | null; updated_at: string }[];
  const ids = dossiers.map((d) => d.id);
  const [{ data: dates }, { data: participants }, noms] = await Promise.all([
    ids.length ? db.from("site_liberation_dates").select("liberation_id, jour").in("liberation_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from("site_liberation_participants").select("liberation_id, prenom, nom, entreprise_id").in("liberation_id", ids) : Promise.resolve({ data: [] }),
    nomsPersonnes(dossiers.map((d) => d.demandeur_id)),
  ]);
  const nomEntreprise = new Map((await entreprises()).map((e) => [e.id, e.nom]));
  const recherche = new Map<string, string[]>();
  for (const x of (participants ?? []) as { liberation_id: string; prenom: string | null; nom: string; entreprise_id: string | null }[]) {
    recherche.set(x.liberation_id, [...(recherche.get(x.liberation_id) ?? []), x.prenom ?? "", x.nom, (x.entreprise_id && nomEntreprise.get(x.entreprise_id)) || ""]);
  }
  const parDossier = new Map<string, string[]>();
  for (const x of (dates ?? []) as { liberation_id: string; jour: string }[]) parDossier.set(x.liberation_id, [...(parDossier.get(x.liberation_id) ?? []), x.jour]);
  const nbPart = new Map<string, number>();
  for (const x of (participants ?? []) as { liberation_id: string }[]) nbPart.set(x.liberation_id, (nbPart.get(x.liberation_id) ?? 0) + 1);
  return {
    ok: true,
    lignes: dossiers.map((d) => {
      const jours = (parDossier.get(d.id) ?? []).sort();
      return {
        id: d.id, numero: d.numero, type: d.type, objet: d.objet, statut: d.statut, premiereDate: jours[0] ?? null, nbDates: jours.length,
        nbParticipants: nbPart.get(d.id) ?? 0, demandeur: noms.get(d.demandeur_id) ?? "", demandeurId: d.demandeur_id,
        secteurId: d.secteur_id, updated_at: d.updated_at, recherche: [...new Set(recherche.get(d.id) ?? [])].join(" "),
      };
    }),
  };
}

/** Badge de la tuile : demandes à traiter (admin) ou mes brouillons. */
export async function badgeLiberations(): Promise<string | null> {
  const c = await contexteLiberations();
  const db = getSupabaseService();
  if (!c || !db) return null;
  let q = db.from("site_liberations").select("id", { count: "exact", head: true });
  q = c.admin ? q.eq("statut", "demande") : q.eq("demandeur_id", c.user.id).eq("statut", "brouillon");
  const { count, error } = await q;
  if (error || !count) return null;
  return c.admin ? `${count} à traiter` : `${count} brouillon${count > 1 ? "s" : ""}`;
}

// ── Un dossier ──────────────────────────────────────────────────────────────

/** Données du délégué que l'on peut compléter depuis le dossier (domicile, genre, registre national). */
export type FicheDelegue = {
  genre: string | null; registre_national: string | null; adresse_rue: string | null; adresse_numero: string | null;
  adresse_boite: string | null; adresse_code_postal: string | null; adresse_localite: string | null; adresse_pays: string | null;
  /** N° de compte (fiche de paiement, lot 2). */
  iban: string | null;
  /** E-mail du délégué (convocation). */
  email: string | null;
};
const COLONNES_FICHE_DELEGUE = "genre, registre_national, adresse_rue, adresse_numero, adresse_boite, adresse_code_postal, adresse_localite, adresse_pays, iban, email";

export type ParticipantAffiche = Participant & {
  entreprise: string; manques: Manque[]; employeurCle: string | null; employeurEmail: string | null; employeurAdresse: string[];
  /** Employeur pour les formulaires : dénomination, adresse seule (sans « À l'attention de »), n° d'entreprise. */
  employeurNom: string | null; employeurAdresseSeule: string[]; employeurNumero: string | null;
  /** Entreprise du délégué (lien vers l'app Entreprises pour compléter l'adresse ou l'e-mail). */
  entrepriseId: string | null;
  fiche: FicheDelegue | null;
};

export type DossierAffiche = Dossier & {
  dates: (DateDossier & { id: string })[];
  participants: ParticipantAffiche[];
  fichiers: (FichierDossier & { url: string | null })[];
  historique: { id: string; statut_avant: string | null; statut_apres: string; auteur: string; created_at: string }[];
  demandeur: string; traitePar: string | null; secteur: string | null; entreprise: string | null; commission: string;
  /** Résumé de ce qui manque aux participants et aux employeurs (« 2 employeurs sans e-mail »). */
  manques: string[];
};

export type DroitsDossier = { modifiable: boolean; supprimable: boolean; actions: CodeAction[] };

/** Employeur d'un participant : site de son unité de rattachement, sinon le siège (règle du bloc adresse). */
function employeur(e: Entreprise | undefined, nomCgLink: string | null, uniteId: string | null, sites: Site[], unites: Unite[]) {
  if (!e) return { cle: null, email: null, adresse: [] as string[], incomplet: true, nom: null, adresseSeule: [] as string[], numero: null };
  const unite = uniteId ? unites.find((u) => u.id === uniteId) : undefined;
  const site = unite?.site_id ? sites.find((s) => s.id === unite.site_id) ?? null : null;
  const bloc = blocAdresse(e, nomCgLink, site, unites.filter((u) => u.entreprise_id === e.id));
  const email = site?.ref_email?.trim() || e.ref_email?.trim() || null;
  const nom = e.denomination_bce?.trim() || e.nom?.trim() || nomCgLink?.trim() || null;
  const adresseSeule = blocAdresse(e, nomCgLink, site, unites.filter((u) => u.entreprise_id === e.id)).lignes
    .slice(bloc.lignes.findIndex((l) => l === nom) + 1);
  return {
    cle: `${e.id}:${site?.id ?? "siege"}`, email, adresse: bloc.lignes, incomplet: bloc.incomplet, nom, adresseSeule,
    numero: e.numero_bce ? formaterNumeroBce(e.numero_bce) : null,
  };
}

/** Un dossier complet, s'il est lisible par la personne (admin ou demandeur). null = introuvable. */
export async function chargerDossier(id: string, c: ContexteLiberations): Promise<{ dossier: DossierAffiche; droits: DroitsDossier } | null> {
  const db = getSupabaseService();
  if (!db || !UUID.test(id)) return null;
  const { data } = await db.from("site_liberations").select(COLONNES_DOSSIER).eq("id", id).maybeSingle();
  const d = (data as Dossier | null) ?? null;
  if (!d) return null;
  const qui = { admin: c.admin, demandeur: d.demandeur_id === c.user.id };
  if (!qui.admin && !qui.demandeur) return null;

  const [{ data: dates }, { data: parts }, { data: fichiers }, { data: histo }, listeSecteurs, listeEntreprises] = await Promise.all([
    db.from("site_liberation_dates").select(COLONNES_DATE).eq("liberation_id", id).order("jour"),
    db.from("site_liberation_participants").select(COLONNES_PARTICIPANT).eq("liberation_id", id).order("nom"),
    db.from("site_liberation_fichiers").select(COLONNES_FICHIER).eq("liberation_id", id).order("created_at"),
    db.from("site_liberation_historique").select("id, statut_avant, statut_apres, auteur_id, created_at").eq("liberation_id", id).order("created_at", { ascending: false }),
    secteurs(),
    entreprises(),
  ]);
  const participants = (parts ?? []) as Participant[];
  const liste = (fichiers ?? []) as FichierDossier[];
  const historique = (histo ?? []) as { id: string; statut_avant: string | null; statut_apres: string; auteur_id: string | null; created_at: string }[];

  // Délégués, entreprises, sites et unités des participants (manques et employeurs).
  const delegueIds = participants.map((p) => p.delegue_id).filter((x): x is string => Boolean(x));
  const { data: dels } = delegueIds.length
    ? await db.from("site_delegues").select(`id, entreprise_id, unite_id, ${COLONNES_FICHE_DELEGUE}`).in("id", delegueIds)
    : { data: [] };
  const delegues = new Map(((dels ?? []) as unknown as (FicheDelegue & { id: string; entreprise_id: string; unite_id: string | null })[]).map((x) => [x.id, x]));
  const entIds = [...new Set([...delegues.values()].map((x) => x.entreprise_id))];
  const [{ data: ents }, { data: sites }, { data: unites }, { data: cos }, liens, noms] = await Promise.all([
    entIds.length ? db.from("site_entreprises").select(COLONNES_ENTREPRISE).in("id", entIds) : Promise.resolve({ data: [] }),
    entIds.length ? db.from("site_entreprise_sites").select(COLONNES_SITE).in("entreprise_id", entIds) : Promise.resolve({ data: [] }),
    entIds.length ? db.from("site_entreprise_unites").select(COLONNES_UNITE).in("entreprise_id", entIds) : Promise.resolve({ data: [] }),
    db.from("companies").select("id, name"),
    liste.length ? db.storage.from(BUCKET_LIBERATIONS).createSignedUrls(liste.map((x) => x.chemin), DUREE_LIEN) : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
    nomsPersonnes([d.demandeur_id, d.traite_par, ...historique.map((h) => h.auteur_id)]),
  ]);
  const fichesEnt = new Map(((ents ?? []) as Entreprise[]).map((e) => [e.id, e]));
  const nomsCo = new Map(((cos ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name]));
  const nomEnt = new Map(listeEntreprises.map((e) => [e.id, e.nom]));
  const url = new Map((liens.data ?? []).map((l) => [l.path, l.signedUrl]));

  const manquesDossier: { manque: Manque; cle: string }[] = [];
  const participantsAffiches: ParticipantAffiche[] = participants.map((p) => {
    const del = p.delegue_id ? delegues.get(p.delegue_id) : undefined;
    const entId = del?.entreprise_id ?? p.entreprise_id;
    const e = entId ? fichesEnt.get(entId) : undefined;
    const emp = employeur(e, e?.company_id ? nomsCo.get(e.company_id) ?? null : null, del?.unite_id ?? null,
      (sites ?? []) as Site[], (unites ?? []) as Unite[]);
    const manques: Manque[] = del ? manquesDelegue(del) : ["domicile", "genre", "registre_national"];
    for (const m of manques) manquesDossier.push({ manque: m, cle: p.id });
    if (emp.cle) {
      if (emp.incomplet) { manques.push("adresse_employeur"); manquesDossier.push({ manque: "adresse_employeur", cle: emp.cle }); }
      if (!emp.email) { manques.push("email_employeur"); manquesDossier.push({ manque: "email_employeur", cle: emp.cle }); }
    }
    // Fiche de paiement : le n° de compte manque seulement si la CG fédérale paie la perte de salaire.
    if (del && d.perte_salaire && d.perte_salaire_charge === "cg_federale" && !del.iban) {
      manques.push("iban");
      manquesDossier.push({ manque: "iban", cle: p.id });
    }
    const fiche: FicheDelegue | null = del ? {
      genre: del.genre, registre_national: del.registre_national, adresse_rue: del.adresse_rue, adresse_numero: del.adresse_numero,
      adresse_boite: del.adresse_boite, adresse_code_postal: del.adresse_code_postal, adresse_localite: del.adresse_localite, adresse_pays: del.adresse_pays,
      iban: del.iban, email: del.email,
    } : null;
    return {
      ...p, entreprise: (entId && nomEnt.get(entId)) || "", manques, entrepriseId: entId ?? null, fiche,
      employeurCle: emp.cle, employeurEmail: emp.email, employeurAdresse: emp.adresse,
      employeurNom: emp.nom, employeurAdresseSeule: emp.adresseSeule, employeurNumero: emp.numero,
    };
  });

  return {
    droits: {
      modifiable: peutModifier(d.statut, qui),
      supprimable: peutSupprimer(d.statut, qui),
      actions: actionsPossibles(d.statut, qui),
    },
    dossier: {
      ...d,
      dates: (dates ?? []) as (DateDossier & { id: string })[],
      participants: participantsAffiches,
      fichiers: liste.map((x) => ({ ...x, url: url.get(x.chemin) ?? null })),
      historique: historique.map((h) => ({ ...h, auteur: (h.auteur_id && noms.get(h.auteur_id)) || "" })),
      demandeur: noms.get(d.demandeur_id) ?? "",
      traitePar: d.traite_par ? noms.get(d.traite_par) ?? null : null,
      secteur: (d.secteur_id && listeSecteurs.find((s) => s.id === d.secteur_id)?.nom) || null,
      entreprise: (d.entreprise_id && nomEnt.get(d.entreprise_id)) || null,
      commission: libelleCommission(d.commission_paritaire),
      manques: resumeManques(manquesDossier),
    },
  };
}
