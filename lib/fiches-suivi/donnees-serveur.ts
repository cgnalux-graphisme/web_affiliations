import { cache } from "react";
import { getSupabaseService } from "../supabase-service";
import { estSuperAdmin, utilisateurConnecte } from "../espace/acces";
import { nomAffiche } from "../entreprises/regles";
import { filtrerFiches, peutModifier, type FiltresFiches } from "./regles";
import { COLONNES_FICHE, COLONNES_FICHIER, type FicheAffichee, type FicheSuivi, type FichierFiche, type LigneFiche } from "./types";

/**
 * Lectures des fiches de suivi. SERVEUR UNIQUEMENT (service_role), après vérification de l'app « permanents »
 * (ou « actions » pour le rapport de congrès). Les fichiers du bucket privé sont servis par liens signés courts.
 */

export const BUCKET_FICHES = "fiches-suivi";
/** Durée de validité d'un lien de lecture (s). */
const DUREE_LIEN = 60 * 60;

export const secteursListe = cache(async (): Promise<{ id: string; nom: string }[]> => {
  const db = getSupabaseService();
  if (!db) return [];
  const { data } = await db.from("site_secteurs").select("id, nom").order("nom");
  return (data ?? []) as { id: string; nom: string }[];
});

export type EntrepriseChoix = { id: string; nom: string; secteurId: string | null; companyId: string | null; sites: { id: string; nom: string; principal: boolean }[] };

/** Fiches entreprises (noms résolus avec CG Link) et leurs sites, triées par nom. */
export const entreprisesChoix = cache(async (): Promise<EntrepriseChoix[]> => {
  const db = getSupabaseService();
  if (!db) return [];
  const [{ data: fiches }, { data: companies }, { data: sites }] = await Promise.all([
    db.from("site_entreprises").select("id, nom, company_id, secteur_id"),
    db.from("companies").select("id, name"),
    db.from("site_entreprise_sites").select("id, entreprise_id, nom, principal").order("principal", { ascending: false }).order("nom"),
  ]);
  const cos = new Map(((companies ?? []) as { id: string; name: string }[]).map((c) => [c.id, c]));
  const parFiche = new Map<string, { id: string; nom: string; principal: boolean }[]>();
  for (const s of (sites ?? []) as { id: string; entreprise_id: string; nom: string; principal: boolean }[]) {
    parFiche.set(s.entreprise_id, [...(parFiche.get(s.entreprise_id) ?? []), { id: s.id, nom: s.nom, principal: s.principal }]);
  }
  return ((fiches ?? []) as { id: string; nom: string | null; company_id: string | null; secteur_id: string | null }[])
    .map((f) => ({
      id: f.id,
      nom: nomAffiche(f, f.company_id ? cos.get(f.company_id) ?? null : null),
      secteurId: f.secteur_id,
      companyId: f.company_id,
      sites: parFiche.get(f.id) ?? [],
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
});

async function nomsAuteurs(ids: string[]): Promise<Map<string, string>> {
  const db = getSupabaseService();
  if (!db || ids.length === 0) return new Map();
  const { data } = await db.from("profiles").select("id, name, email").in("id", [...new Set(ids)]);
  return new Map(
    ((data ?? []) as { id: string; name: string | null; email: string | null }[]).map((p) => [
      p.id,
      (p.name ?? p.email ?? "").replace(/\s*\((Permanent|OP)\)\s*$/i, ""),
    ])
  );
}

export type FiltreLignes = { entrepriseId?: string; secteurId?: string; type?: "usine" | "sectoriel"; auteurId?: string };

/** Lignes de fiches (les plus récentes d'abord), noms résolus, droit de modification calculé. */
export async function lignesFiches(filtre: FiltreLignes = {}, limite?: number): Promise<{ ok: true; lignes: LigneFiche[] } | { ok: false; tablesAbsentes: boolean }> {
  const db = getSupabaseService();
  const user = await utilisateurConnecte();
  if (!db || !user) return { ok: false, tablesAbsentes: false };
  let q = db.from("site_fiches_suivi").select(COLONNES_FICHE).order("date_debut", { ascending: false, nullsFirst: true }).order("updated_at", { ascending: false });
  if (filtre.entrepriseId) q = q.eq("entreprise_id", filtre.entrepriseId);
  if (filtre.secteurId) q = q.eq("secteur_id", filtre.secteurId);
  if (filtre.type) q = q.eq("type", filtre.type);
  if (filtre.auteurId) q = q.eq("auteur_id", filtre.auteurId);
  if (limite) q = q.limit(limite);
  const { data, error } = await q;
  if (error) {
    console.error("[fiches-suivi] liste :", error.code);
    return { ok: false, tablesAbsentes: error.code === "42P01" || error.code === "PGRST205" };
  }
  const fiches = (data ?? []) as FicheSuivi[];
  const [entreprises, secteurs, auteurs, superAdmin] = await Promise.all([
    entreprisesChoix(), secteursListe(), nomsAuteurs(fiches.map((f) => f.auteur_id)), estSuperAdmin(),
  ]);
  const nomEntreprise = new Map(entreprises.map((e) => [e.id, e.nom]));
  const nomSecteur = new Map(secteurs.map((s) => [s.id, s.nom]));
  return {
    ok: true,
    lignes: fiches.map((f) => ({
      id: f.id, type: f.type, titre: f.titre, date_debut: f.date_debut, date_fin: f.date_fin, statut: f.statut,
      entreprise: f.entreprise_id ? nomEntreprise.get(f.entreprise_id) ?? null : null, entrepriseId: f.entreprise_id,
      secteur: f.secteur_id ? nomSecteur.get(f.secteur_id) ?? null : null, secteurId: f.secteur_id,
      auteur: auteurs.get(f.auteur_id) ?? null, auteurId: f.auteur_id,
      modifiable: peutModifier(f.auteur_id, user.id, superAdmin), updated_at: f.updated_at,
    })),
  };
}

/** Une fiche complète : noms résolus, fichiers avec liens de lecture signés (1 h). null = introuvable. */
export async function chargerFicheSuivi(id: string): Promise<{ fiche: FicheAffichee; modifiable: boolean } | null> {
  const db = getSupabaseService();
  const user = await utilisateurConnecte();
  if (!db || !user || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [{ data }, { data: fichiers }] = await Promise.all([
    db.from("site_fiches_suivi").select(COLONNES_FICHE).eq("id", id).maybeSingle(),
    db.from("site_fiches_suivi_fichiers").select(COLONNES_FICHIER).eq("fiche_id", id).order("ordre").order("created_at"),
  ]);
  if (!data) return null;
  const f = data as FicheSuivi;
  const liste = (fichiers ?? []) as FichierFiche[];
  const [entreprises, secteurs, auteurs, superAdmin, liens] = await Promise.all([
    entreprisesChoix(),
    secteursListe(),
    nomsAuteurs([f.auteur_id]),
    estSuperAdmin(),
    liste.length
      ? db.storage.from(BUCKET_FICHES).createSignedUrls(liste.map((x) => x.chemin), DUREE_LIEN)
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
  ]);
  const url = new Map((liens.data ?? []).map((l) => [l.path, l.signedUrl]));
  const e = f.entreprise_id ? entreprises.find((x) => x.id === f.entreprise_id) : undefined;
  const avecUrl = (x: FichierFiche) => ({ ...x, url: url.get(x.chemin) ?? null });
  return {
    modifiable: peutModifier(f.auteur_id, user.id, superAdmin),
    fiche: {
      ...f,
      entreprise: e?.nom ?? null,
      entrepriseCle: e?.id ?? null,
      site: (f.site_id && e?.sites.find((s) => s.id === f.site_id)?.nom) || null,
      secteur: (f.secteur_id && secteurs.find((s) => s.id === f.secteur_id)?.nom) || null,
      auteur: auteurs.get(f.auteur_id) ?? null,
      documents: liste.filter((x) => x.genre === "document").map(avecUrl),
      photos: liste.filter((x) => x.genre === "photo").map(avecUrl),
    },
  };
}

/**
 * Fiches retenues pour le rapport de congrès (filtres de lib/fiches-suivi/regles.ts), complètes, avec un lien signé
 * pour chaque photo. Appelé après vérification de l'app « actions ».
 */
export async function fichesPourRapport(filtres: FiltresFiches): Promise<FicheAffichee[] | null> {
  const db = getSupabaseService();
  if (!db) return null;
  const { data, error } = await db.from("site_fiches_suivi").select(COLONNES_FICHE)
    .not("date_debut", "is", null).lte("date_debut", filtres.fin).order("date_debut");
  if (error) {
    console.error("[fiches-suivi] rapport :", error.code);
    return null;
  }
  const toutes = (data ?? []) as FicheSuivi[];
  const retenues = filtrerFiches(
    toutes.map((f) => ({ ...f, entrepriseId: f.entreprise_id, secteurId: f.secteur_id, auteurId: f.auteur_id })),
    filtres
  );
  if (!retenues.length) return [];
  const ids = retenues.map((f) => f.id);
  const [{ data: fichiers }, entreprises, secteurs, auteurs] = await Promise.all([
    db.from("site_fiches_suivi_fichiers").select(COLONNES_FICHIER).in("fiche_id", ids).order("ordre").order("created_at"),
    entreprisesChoix(),
    secteursListe(),
    nomsAuteurs(retenues.map((f) => f.auteur_id)),
  ]);
  const liste = (fichiers ?? []) as FichierFiche[];
  const photos = liste.filter((x) => x.genre === "photo");
  const liens = photos.length ? await db.storage.from(BUCKET_FICHES).createSignedUrls(photos.map((p) => p.chemin), DUREE_LIEN) : { data: [] };
  const url = new Map((liens.data ?? []).map((l) => [l.path, l.signedUrl]));
  return retenues.map((f) => {
    const e = f.entreprise_id ? entreprises.find((x) => x.id === f.entreprise_id) : undefined;
    const avecUrl = (x: FichierFiche) => ({ ...x, url: url.get(x.chemin) ?? null });
    const { entrepriseId: _e, secteurId: _s, auteurId: _a, ...fiche } = f;
    return {
      ...fiche,
      entreprise: e?.nom ?? null,
      entrepriseCle: e?.id ?? null,
      site: (f.site_id && e?.sites.find((s) => s.id === f.site_id)?.nom) || null,
      secteur: (f.secteur_id && secteurs.find((s) => s.id === f.secteur_id)?.nom) || null,
      auteur: auteurs.get(f.auteur_id) ?? null,
      documents: liste.filter((x) => x.fiche_id === f.id && x.genre === "document").map((x) => ({ ...x, url: null })),
      photos: photos.filter((x) => x.fiche_id === f.id).map(avecUrl),
    };
  });
}
