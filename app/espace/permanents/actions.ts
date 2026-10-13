"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aApp, estSuperAdmin, utilisateurConnecte } from "../../../lib/espace/acces";
import { getSupabaseServer } from "../../../lib/supabase-server";
import { getSupabaseService } from "../../../lib/supabase-service";
import { BUCKET_FICHES } from "../../../lib/fiches-suivi/donnees-serveur";
import { cheminFichier, documentAccepte, manquantsPourTerminer, peutModifier, validerChamps } from "../../../lib/fiches-suivi/regles";
import { imageAcceptee } from "../../../lib/image-deposee";
import {
  COLONNES_FICHE, DOCUMENTS_MAX, NATURES, PHOTOS_MAX, type FicheSuivi, type TypeFiche,
} from "../../../lib/fiches-suivi/types";

/**
 * Écritures des fiches de suivi. Chaque action revérifie l'app « permanents » et le droit sur la fiche (auteur ou
 * SUPER_ADMIN), puis écrit avec la SESSION de la personne : la RLS (site_fiche_modifiable) s'applique aussi.
 * Fichiers : bucket privé, envoi direct du navigateur par lien signé créé ici (service_role), jamais de lecture publique.
 */

export type Resultat<T = undefined> = { ok: true; donnees?: T; message?: string } | { ok: false; erreur: string };

const REFUS = "Accès refusé. Reconnectez-vous.";
const ECHEC = "Enregistrement impossible. Votre session a peut-être expiré : reconnectez-vous puis réessayez.";
const INTROUVABLE = "Fiche introuvable, ou vous n'êtes pas son auteur.";
const UUID = /^[0-9a-f-]{36}$/i;

type Ctx = { db: SupabaseClient; userId: string };

async function ctx(): Promise<Ctx | null> {
  const user = await utilisateurConnecte();
  if (!user || !(await aApp("permanents"))) return null;
  return { db: await getSupabaseServer(), userId: user.id };
}

/** La fiche, seulement si la personne peut la modifier. */
async function ficheModifiable(c: Ctx, id: string): Promise<FicheSuivi | null> {
  if (!UUID.test(id)) return null;
  const { data } = await c.db.from("site_fiches_suivi").select(COLONNES_FICHE).eq("id", id).maybeSingle();
  const f = (data as FicheSuivi | null) ?? null;
  return f && peutModifier(f.auteur_id, c.userId, await estSuperAdmin()) ? f : null;
}

function rafraichir(id?: string, entrepriseId?: string | null) {
  revalidatePath("/espace/permanents/accueil");
  revalidatePath("/espace/permanents/fiches");
  if (id) revalidatePath(`/espace/permanents/fiches/${id}`);
  if (entrepriseId) revalidatePath(`/espace/entreprises/${entrepriseId}`);
}

function messageErreur(code: string | undefined): string {
  if (code === "23514") return "Une donnée ne respecte pas le format attendu (la fin de la période précède-t-elle le début ?).";
  if (code === "23503") return "L'entreprise, le site ou le secteur choisi n'existe plus. Rechargez la page.";
  if (code === "42P01" || code === "PGRST205") return "Les tables des fiches de suivi ne sont pas encore créées (migration 20261013120000).";
  return ECHEC;
}

export async function creerFiche(type: TypeFiche, entrepriseId?: string): Promise<Resultat<{ id: string }>> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  if (type !== "usine" && type !== "sectoriel") return { ok: false, erreur: "Type de fiche inconnu." };
  const ligne: Record<string, string | null> = { type, auteur_id: c.userId };
  if (entrepriseId && UUID.test(entrepriseId)) {
    // Fiche ouverte depuis une entreprise : son secteur est repris (modifiable ensuite).
    const { data: e } = await c.db.from("site_entreprises").select("id, secteur_id").eq("id", entrepriseId).maybeSingle();
    if (e) {
      if (type === "usine") ligne.entreprise_id = e.id as string;
      ligne.secteur_id = (e.secteur_id as string | null) ?? null;
    }
  }
  const { data, error } = await c.db.from("site_fiches_suivi").insert(ligne).select("id").single();
  if (error || !data) return { ok: false, erreur: messageErreur(error?.code) };
  rafraichir();
  return { ok: true, donnees: { id: data.id as string } };
}

export async function enregistrerFiche(id: string, champs: Record<string, string>): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const f = await ficheModifiable(c, id);
  if (!f) return { ok: false, erreur: INTROUVABLE };
  const v = validerChamps(champs);
  if (!v.ok) return v;
  const valeurs = { ...v.valeurs };
  // Événement en usine : le secteur suit l'entreprise s'il n'a pas été choisi ; le site doit être de l'entreprise.
  const entrepriseId = "entreprise_id" in valeurs ? valeurs.entreprise_id : f.entreprise_id;
  if (f.type === "usine" && entrepriseId && entrepriseId !== f.entreprise_id && !valeurs.secteur_id) {
    const { data: e } = await c.db.from("site_entreprises").select("secteur_id").eq("id", entrepriseId).maybeSingle();
    if (e?.secteur_id) valeurs.secteur_id = e.secteur_id as string;
  }
  const siteId = "site_id" in valeurs ? valeurs.site_id : f.site_id;
  if (siteId) {
    const { data: s } = await c.db.from("site_entreprise_sites").select("entreprise_id").eq("id", siteId).maybeSingle();
    if (!s || s.entreprise_id !== entrepriseId) valeurs.site_id = null;
  }
  if ("texte" in valeurs && "texte_genere" in champs && champs.texte_genere === "1") {
    (valeurs as Record<string, string | null>).texte_genere_le = new Date().toISOString();
  }
  const { error } = await c.db.from("site_fiches_suivi").update(valeurs).eq("id", id);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichir(id, entrepriseId ?? f.entreprise_id);
  return { ok: true, message: "Fiche enregistrée." };
}

export async function changerStatut(id: string, terminee: boolean): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const f = await ficheModifiable(c, id);
  if (!f) return { ok: false, erreur: INTROUVABLE };
  if (terminee) {
    const manque = manquantsPourTerminer(f);
    if (manque.length) return { ok: false, erreur: `Pour terminer la fiche, complétez ${manque.join(", ")}.` };
  }
  const { error } = await c.db.from("site_fiches_suivi").update({ statut: terminee ? "terminee" : "brouillon" }).eq("id", id);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichir(id, f.entreprise_id);
  return { ok: true, message: terminee ? "Fiche terminée." : "La fiche repasse en brouillon." };
}

export async function supprimerFiche(id: string): Promise<Resultat> {
  const c = await ctx();
  const service = getSupabaseService();
  if (!c || !service) return { ok: false, erreur: REFUS };
  const f = await ficheModifiable(c, id);
  if (!f) return { ok: false, erreur: INTROUVABLE };
  const { data: fichiers } = await c.db.from("site_fiches_suivi_fichiers").select("chemin").eq("fiche_id", id);
  const { error } = await c.db.from("site_fiches_suivi").delete().eq("id", id);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  const chemins = ((fichiers ?? []) as { chemin: string }[]).map((x) => x.chemin);
  if (chemins.length) {
    const { error: e } = await service.storage.from(BUCKET_FICHES).remove(chemins);
    if (e) console.error("[fiches-suivi] fichiers non supprimés :", e.message);
  }
  rafraichir(undefined, f.entreprise_id);
  return { ok: true, message: "Fiche supprimée." };
}

// ── Fichiers (documents et photos) ──────────────────────────────────────────

export type DemandeEnvoi = { genre: "document" | "photo"; nom: string; type: string; taille: number };

/** Lien d'envoi signé (valable 2 h) pour un fichier, après vérification du droit, du type et du nombre. */
export async function preparerEnvoi(ficheId: string, d: DemandeEnvoi): Promise<Resultat<{ chemin: string; jeton: string }>> {
  const c = await ctx();
  const service = getSupabaseService();
  if (!c || !service) return { ok: false, erreur: REFUS };
  const f = await ficheModifiable(c, ficheId);
  if (!f) return { ok: false, erreur: INTROUVABLE };
  const fichier = { type: d.type, size: d.taille };
  if (d.genre === "photo" ? !imageAcceptee(fichier) : !documentAccepte(fichier)) return { ok: false, erreur: `Fichier refusé : ${d.nom}.` };
  const { count } = await c.db.from("site_fiches_suivi_fichiers").select("id", { count: "exact", head: true }).eq("fiche_id", ficheId).eq("genre", d.genre);
  const max = d.genre === "photo" ? PHOTOS_MAX : DOCUMENTS_MAX;
  if ((count ?? 0) >= max) return { ok: false, erreur: `${max} ${d.genre === "photo" ? "photos" : "documents"} maximum par fiche.` };
  // Photo : réduite en JPEG dans le navigateur avant l'envoi.
  const nom = d.genre === "photo" ? d.nom.replace(/\.[^.]+$/, "") + ".jpg" : d.nom;
  const chemin = cheminFichier(ficheId, randomUUID(), nom);
  const { data, error } = await service.storage.from(BUCKET_FICHES).createSignedUploadUrl(chemin);
  if (error || !data) {
    console.error("[fiches-suivi] lien d'envoi :", error?.message);
    return { ok: false, erreur: "L'envoi n'a pas pu être préparé. Le stockage des fiches est-il créé (migration 20261013120000) ?" };
  }
  return { ok: true, donnees: { chemin, jeton: data.token } };
}

/** Enregistre un fichier envoyé (le chemin doit appartenir à la fiche et exister dans le bucket). */
export async function enregistrerFichier(
  ficheId: string,
  f: { chemin: string; genre: "document" | "photo"; nom: string; type: string; taille: number; nature?: string }
): Promise<Resultat> {
  const c = await ctx();
  const service = getSupabaseService();
  if (!c || !service) return { ok: false, erreur: REFUS };
  const fiche = await ficheModifiable(c, ficheId);
  if (!fiche) return { ok: false, erreur: INTROUVABLE };
  if (!f.chemin.startsWith(`${ficheId}/`) || f.chemin.includes("..")) return { ok: false, erreur: ECHEC };
  const dossier = f.chemin.slice(0, f.chemin.lastIndexOf("/"));
  const { data: present } = await service.storage.from(BUCKET_FICHES).list(dossier, { search: f.chemin.slice(dossier.length + 1) });
  if (!present?.length) return { ok: false, erreur: "Le fichier n'est pas arrivé. Réessayez l'envoi." };
  const { count } = await c.db.from("site_fiches_suivi_fichiers").select("id", { count: "exact", head: true }).eq("fiche_id", ficheId).eq("genre", f.genre);
  const nature = f.genre === "document" && NATURES.some((n) => n.code === f.nature) ? f.nature : f.genre === "document" ? "autre" : null;
  const { error } = await c.db.from("site_fiches_suivi_fichiers").insert({
    fiche_id: ficheId, genre: f.genre, chemin: f.chemin, nom_origine: f.nom.slice(0, 200), taille: f.taille, type_mime: f.type,
    nature, ordre: count ?? 0,
  });
  if (error) {
    await service.storage.from(BUCKET_FICHES).remove([f.chemin]);
    return { ok: false, erreur: messageErreur(error.code) };
  }
  rafraichir(ficheId);
  return { ok: true };
}

async function fichierModifiable(c: Ctx, fichierId: string) {
  if (!UUID.test(fichierId)) return null;
  const { data } = await c.db.from("site_fiches_suivi_fichiers").select("id, fiche_id, chemin, genre").eq("id", fichierId).maybeSingle();
  if (!data) return null;
  const fiche = await ficheModifiable(c, data.fiche_id as string);
  return fiche ? (data as { id: string; fiche_id: string; chemin: string; genre: string }) : null;
}

export async function modifierFichier(fichierId: string, champs: { nature?: string; nature_autre?: string; legende?: string }): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const x = await fichierModifiable(c, fichierId);
  if (!x) return { ok: false, erreur: INTROUVABLE };
  const maj: Record<string, string | null> = {};
  if (champs.nature !== undefined) {
    if (!NATURES.some((n) => n.code === champs.nature)) return { ok: false, erreur: "Nature de document inconnue." };
    maj.nature = champs.nature;
  }
  if (champs.nature_autre !== undefined) maj.nature_autre = champs.nature_autre.trim().slice(0, 120) || null;
  if (champs.legende !== undefined) maj.legende = champs.legende.trim().slice(0, 300) || null;
  const { error } = await c.db.from("site_fiches_suivi_fichiers").update(maj).eq("id", fichierId);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichir(x.fiche_id);
  return { ok: true };
}

/** Nouvel ordre des photos (la première = photo principale). */
export async function ordonnerPhotos(ficheId: string, ids: string[]): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  if (!(await ficheModifiable(c, ficheId))) return { ok: false, erreur: INTROUVABLE };
  for (const [ordre, id] of ids.entries()) {
    if (!UUID.test(id)) return { ok: false, erreur: ECHEC };
    const { error } = await c.db.from("site_fiches_suivi_fichiers").update({ ordre }).eq("id", id).eq("fiche_id", ficheId);
    if (error) return { ok: false, erreur: messageErreur(error.code) };
  }
  rafraichir(ficheId);
  return { ok: true };
}

export async function supprimerFichier(fichierId: string): Promise<Resultat> {
  const c = await ctx();
  const service = getSupabaseService();
  if (!c || !service) return { ok: false, erreur: REFUS };
  const x = await fichierModifiable(c, fichierId);
  if (!x) return { ok: false, erreur: INTROUVABLE };
  const { error } = await c.db.from("site_fiches_suivi_fichiers").delete().eq("id", fichierId);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  const { error: e } = await service.storage.from(BUCKET_FICHES).remove([x.chemin]);
  if (e) console.error("[fiches-suivi] fichier non supprimé :", e.message);
  rafraichir(x.fiche_id);
  return { ok: true };
}
