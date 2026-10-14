"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseService } from "../../../lib/supabase-service";
import { validerDelegue } from "../../../lib/delegues/delegue";
import {
  BUCKET_LIBERATIONS, contexteLiberations, dansPerimetre, type ContexteLiberations,
} from "../../../lib/liberations/donnees-serveur";
import {
  cheminFichier, enumeration, fichierAccepte, manquantsPourEnvoyer, validerChamps, validerDates, validerLieu, validerTaux,
  type DateSaisie,
} from "../../../lib/liberations/regles";
import { ACTIONS, actionPermise, peutModifier, peutSupprimer, type CodeAction } from "../../../lib/liberations/statuts";
import { COLONNES_DOSSIER, FICHIERS_MAX, TYPES_LIBERATION, type Dossier, type TypeLiberation } from "../../../lib/liberations/types";
import { courriersEnAttente, preparerCourriers } from "../../../lib/liberations/courriers-serveur";

/**
 * Écritures de l'app Libérations. Chaque action revérifie l'app et le droit sur le dossier (admin, ou demandeur tant
 * que le dossier n'est pas pris en charge), puis écrit avec la clé service_role : les tables n'ont aucune politique
 * d'écriture. Pièces jointes : bucket privé, envoi direct du navigateur par lien signé créé ici.
 */

export type Resultat<T = undefined> = { ok: true; donnees?: T; message?: string } | { ok: false; erreur: string };

const REFUS = "Accès refusé. Reconnectez-vous.";
const ECHEC = "Enregistrement impossible. Rechargez la page puis réessayez.";
const INTROUVABLE = "Dossier introuvable, ou vous ne pouvez plus le modifier.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = ContexteLiberations & { db: SupabaseClient };

async function ctx(): Promise<Ctx | null> {
  const c = await contexteLiberations();
  const db = getSupabaseService();
  return c && db ? { ...c, db } : null;
}

async function ctxAdmin(): Promise<Ctx | null> {
  const c = await ctx();
  return c?.admin ? c : null;
}

function messageErreur(code: string | undefined): string {
  if (code === "42P01" || code === "PGRST205" || code === "42703") return "Les tables des libérations ne sont pas encore créées (migration 20261013130000).";
  if (code === "23503") return "Un élément choisi n'existe plus. Rechargez la page.";
  if (code === "23505") return "Cet élément existe déjà.";
  if (code === "23514") return "Une donnée ne respecte pas le format attendu.";
  return ECHEC;
}

function rafraichir(id?: string) {
  revalidatePath("/espace/liberations/dossiers");
  if (id) {
    revalidatePath(`/espace/liberations/${id}`);
    revalidatePath(`/espace/liberations/${id}/modifier`);
  }
}

async function lireDossier(c: Ctx, id: string): Promise<Dossier | null> {
  if (!UUID.test(id)) return null;
  const { data } = await c.db.from("site_liberations").select(COLONNES_DOSSIER).eq("id", id).maybeSingle();
  const d = (data as Dossier | null) ?? null;
  return d && (c.admin || d.demandeur_id === c.user.id) ? d : null;
}

const qui = (c: Ctx, d: Dossier) => ({ admin: c.admin, demandeur: d.demandeur_id === c.user.id });

/** Le dossier, seulement si la personne peut encore le modifier. */
async function dossierModifiable(c: Ctx, id: string): Promise<Dossier | null> {
  const d = await lireDossier(c, id);
  return d && peutModifier(d.statut, qui(c, d)) ? d : null;
}

async function historiser(c: Ctx, id: string, avant: string | null, apres: string) {
  const { error } = await c.db.from("site_liberation_historique").insert({ liberation_id: id, statut_avant: avant, statut_apres: apres, auteur_id: c.user.id });
  if (error) console.error("[liberations] historique :", error.code);
}

async function compter(c: Ctx, table: string, id: string): Promise<number> {
  const { count } = await c.db.from(table).select("id", { count: "exact", head: true }).eq("liberation_id", id);
  return count ?? 0;
}

// ── Dossier ─────────────────────────────────────────────────────────────────

export async function creerDossier(type: TypeLiberation): Promise<Resultat<{ id: string }>> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  if (!TYPES_LIBERATION.some((t) => t.code === type)) return { ok: false, erreur: "Type de libération inconnu." };
  const { data, error } = await c.db.from("site_liberations").insert({ type, demandeur_id: c.user.id }).select("id").single();
  if (error || !data) return { ok: false, erreur: messageErreur(error?.code) };
  await historiser(c, data.id as string, null, "brouillon");
  rafraichir();
  return { ok: true, donnees: { id: data.id as string } };
}

/**
 * Enregistre les informations et les dates d'un dossier. Le lieu choisi dans la liste est copié dans le dossier
 * (il reste juste si la liste change ensuite). Une demande déjà envoyée doit rester complète.
 */
export async function enregistrerDossier(id: string, champs: Record<string, string>, dates?: DateSaisie[]): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await dossierModifiable(c, id);
  if (!d) return { ok: false, erreur: INTROUVABLE };
  const v = validerChamps(champs);
  if (!v.ok) return v;
  const valeurs = { ...v.valeurs };
  const dv = dates ? validerDates(dates) : null;
  if (dv && !dv.ok) return dv;

  const autre = "lieu_autre" in valeurs ? valeurs.lieu_autre === true : d.lieu_autre;
  const lieuId = "lieu_id" in valeurs ? (valeurs.lieu_id as string | null) : d.lieu_id;
  if (!autre && lieuId) {
    const { data: l } = await c.db.from("site_liberations_lieux").select("id, nom, complement, rue, numero, boite, code_postal, localite").eq("id", lieuId).maybeSingle();
    if (!l) return { ok: false, erreur: "Ce lieu n'existe plus. Rechargez la page." };
    Object.assign(valeurs, {
      lieu_nom: l.nom, lieu_complement: l.complement, lieu_rue: l.rue, lieu_numero: l.numero, lieu_boite: l.boite,
      lieu_code_postal: l.code_postal, lieu_localite: l.localite,
    });
  } else if (!autre && "lieu_id" in valeurs) {
    Object.assign(valeurs, { lieu_nom: null, lieu_complement: null, lieu_rue: null, lieu_numero: null, lieu_boite: null, lieu_code_postal: null, lieu_localite: null });
  }
  const entrepriseId = valeurs.entreprise_id;
  if (typeof entrepriseId === "string") {
    const { data: e } = await c.db.from("site_entreprises").select("id").eq("id", entrepriseId).maybeSingle();
    if (!e) return { ok: false, erreur: "Cette entreprise n'existe plus. Rechargez la page." };
  }

  // Une demande envoyée (ou en traitement) ne peut pas devenir incomplète.
  if (d.statut !== "brouillon") {
    const apres = { ...d, ...valeurs } as Dossier;
    const nbDates = dv ? dv.valeurs.length : await compter(c, "site_liberation_dates", id);
    const manque = manquantsPourEnvoyer(apres, nbDates, await compter(c, "site_liberation_participants", id));
    if (manque.length) return { ok: false, erreur: `La demande est déjà envoyée : elle doit rester complète. Il manque ${enumeration(manque)}.` };
  }

  if (Object.keys(valeurs).length) {
    const { error } = await c.db.from("site_liberations").update(valeurs).eq("id", id);
    if (error) return { ok: false, erreur: messageErreur(error.code) };
  }
  if (dv) {
    const { error: e1 } = await c.db.from("site_liberation_dates").delete().eq("liberation_id", id);
    if (e1) return { ok: false, erreur: messageErreur(e1.code) };
    if (dv.valeurs.length) {
      const { error: e2 } = await c.db.from("site_liberation_dates").insert(dv.valeurs.map((x) => ({ ...x, liberation_id: id })));
      if (e2) return { ok: false, erreur: `Les informations sont enregistrées, mais pas les dates. ${messageErreur(e2.code)}` };
    }
  }
  rafraichir(id);
  return { ok: true, message: "Dossier enregistré." };
}

export async function changerStatut(id: string, action: CodeAction): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDossier(c, id);
  if (!d) return { ok: false, erreur: INTROUVABLE };
  const a = ACTIONS[action];
  if (!a || !actionPermise(action, d.statut, qui(c, d))) return { ok: false, erreur: "Cette action n'est pas possible à ce stade du dossier." };
  if (action === "soumettre") {
    const [nbDates, nbParticipants] = await Promise.all([compter(c, "site_liberation_dates", id), compter(c, "site_liberation_participants", id)]);
    const manque = manquantsPourEnvoyer(d, nbDates, nbParticipants);
    if (manque.length) return { ok: false, erreur: `Pour envoyer la demande, complétez ${enumeration(manque)}.` };
  }
  if (action === "marquer_envoyee") {
    const prep = await preparerCourriers(id, c);
    if (!prep) return { ok: false, erreur: INTROUVABLE };
    const reste = courriersEnAttente(prep);
    if (reste) return { ok: false, erreur: `Il reste ${reste} courrier${reste > 1 ? "s" : ""} (lettres ou convocations) à envoyer ou à imprimer.` };
  }
  let vers: string = a.vers;
  if (action === "desarchiver") {
    // Statut d'avant l'archive (clôturé ou annulé), lu dans l'historique.
    const { data: h } = await c.db.from("site_liberation_historique").select("statut_avant")
      .eq("liberation_id", id).eq("statut_apres", "archive").order("created_at", { ascending: false }).limit(1).maybeSingle();
    vers = h?.statut_avant === "annule" ? "annule" : "cloture";
  }
  const maj: Record<string, string | null> = { statut: vers };
  if (action === "soumettre") maj.soumis_le = new Date().toISOString();
  if (action === "prendre_en_charge") maj.traite_par = c.user.id;
  if (action === "archiver") maj.archive_le = new Date().toISOString();
  if (action === "desarchiver") maj.archive_le = null;
  // Mise à jour conditionnelle : si quelqu'un a changé le statut entre-temps, rien n'est écrit.
  const { data, error } = await c.db.from("site_liberations").update(maj).eq("id", id).eq("statut", d.statut).select("id");
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  if (!data?.length) return { ok: false, erreur: "Le dossier a changé entre-temps. Rechargez la page." };
  await historiser(c, id, d.statut, vers);
  rafraichir(id);
  const messages: Record<CodeAction, string> = {
    soumettre: "Demande envoyée. Un admin va la traiter.",
    remettre_brouillon: "La demande repasse en brouillon.",
    prendre_en_charge: "Vous traitez ce dossier.",
    marquer_envoyee: "Libération envoyée : employeurs et délégués sont prévenus.",
    passer_aux_frais: "Le dossier passe aux frais : vérifiez les trajets et les tickets.",
    cloturer: "Dossier clôturé. Vous pouvez l'archiver.",
    annuler: "Dossier annulé.",
    archiver: "Dossier archivé.",
    desarchiver: "Le dossier revient dans la liste active.",
  };
  return { ok: true, message: messages[action] };
}

export async function supprimerDossier(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDossier(c, id);
  if (!d || !peutSupprimer(d.statut, qui(c, d))) return { ok: false, erreur: "Seul un brouillon peut être supprimé." };
  const { data: fichiers } = await c.db.from("site_liberation_fichiers").select("chemin").eq("liberation_id", id);
  const { error } = await c.db.from("site_liberations").delete().eq("id", id).eq("statut", "brouillon");
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  const chemins = ((fichiers ?? []) as { chemin: string }[]).map((x) => x.chemin);
  if (chemins.length) {
    const { error: e } = await c.db.storage.from(BUCKET_LIBERATIONS).remove(chemins);
    if (e) console.error("[liberations] fichiers non supprimés :", e.message);
  }
  rafraichir();
  return { ok: true, message: "Brouillon supprimé." };
}

// ── Participants (délégués du périmètre ; tous pour un admin) ───────────────

export async function ajouterParticipants(id: string, delegueIds: string[]): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await dossierModifiable(c, id);
  if (!d) return { ok: false, erreur: INTROUVABLE };
  const ids = [...new Set(delegueIds)].filter((x) => UUID.test(x)).slice(0, 200);
  if (!ids.length) return { ok: false, erreur: "Cochez au moins un délégué." };
  const { data } = await c.db.from("site_delegues").select("id, prenom, nom, entreprise_id").in("id", ids);
  const permis = ((data ?? []) as { id: string; prenom: string | null; nom: string; entreprise_id: string }[]).filter((x) => dansPerimetre(c, x.entreprise_id));
  if (permis.length !== ids.length) return { ok: false, erreur: "Un des délégués choisis n'est pas dans vos entreprises. Rechargez la page." };
  const { error } = await c.db.from("site_liberation_participants").upsert(
    permis.map((x) => ({ liberation_id: id, delegue_id: x.id, prenom: x.prenom, nom: x.nom, entreprise_id: x.entreprise_id, ajoute_par: c.user.id })),
    { onConflict: "liberation_id,delegue_id", ignoreDuplicates: true }
  );
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichir(id);
  return { ok: true, message: permis.length > 1 ? `${permis.length} participants ajoutés.` : "Participant ajouté." };
}

export async function retirerParticipant(participantId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c || !UUID.test(participantId)) return { ok: false, erreur: REFUS };
  const { data: p } = await c.db.from("site_liberation_participants").select("id, liberation_id").eq("id", participantId).maybeSingle();
  if (!p) return { ok: false, erreur: ECHEC };
  const d = await dossierModifiable(c, p.liberation_id as string);
  if (!d) return { ok: false, erreur: INTROUVABLE };
  if (d.statut !== "brouillon" && (await compter(c, "site_liberation_participants", d.id)) <= 1) {
    return { ok: false, erreur: "La demande est déjà envoyée : elle doit garder au moins un participant." };
  }
  const { error } = await c.db.from("site_liberation_participants").delete().eq("id", participantId);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichir(d.id);
  return { ok: true };
}

/**
 * Compléter le domicile, le genre ou le registre national d'un participant depuis le dossier. Admin : tout délégué ;
 * permanent : les délégués de ses entreprises. Écrit sur la carte du délégué (app Délégués) et dans son journal.
 */
export async function completerDelegue(participantId: string, champs: Record<string, string>): Promise<Resultat> {
  const c = await ctx();
  if (!c || !UUID.test(participantId)) return { ok: false, erreur: REFUS };
  const { data: p } = await c.db.from("site_liberation_participants").select("liberation_id, delegue_id").eq("id", participantId).maybeSingle();
  if (!p?.delegue_id || !(await lireDossier(c, p.liberation_id as string))) return { ok: false, erreur: ECHEC };
  const { data: del } = await c.db.from("site_delegues").select("id, entreprise_id").eq("id", p.delegue_id).maybeSingle();
  if (!del || !dansPerimetre(c, del.entreprise_id as string)) return { ok: false, erreur: "Ce délégué n'est pas dans vos entreprises." };
  const permis = ["genre", "registre_national", "iban", "adresse_rue", "adresse_numero", "adresse_boite", "adresse_code_postal", "adresse_localite", "adresse_pays"];
  const v = validerDelegue(Object.fromEntries(Object.entries(champs).filter(([k]) => permis.includes(k))));
  if (!v.ok) return v;
  const { error } = await c.db.from("site_delegues").update(v.valeurs).eq("id", del.id);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  const { error: j } = await c.db.from("site_journal_delegues").insert({
    auteur_id: c.user.id, delegue_id: del.id, entreprise_id: del.entreprise_id, action: "modification",
    details: { champs: Object.keys(v.valeurs), source: "liberations" },
  });
  if (j) console.error("[liberations] journal délégué :", j.code);
  rafraichir(p.liberation_id as string);
  revalidatePath(`/espace/delegues/${del.id}`);
  return { ok: true, message: "Carte du délégué mise à jour." };
}

// ── Pièces jointes ──────────────────────────────────────────────────────────

export async function preparerEnvoi(id: string, f: { nom: string; type: string; taille: number }): Promise<Resultat<{ chemin: string; jeton: string }>> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await dossierModifiable(c, id);
  if (!d) return { ok: false, erreur: INTROUVABLE };
  if (!fichierAccepte({ type: f.type, size: f.taille })) return { ok: false, erreur: `Fichier refusé : ${f.nom}.` };
  if ((await compter(c, "site_liberation_fichiers", id)) >= FICHIERS_MAX) return { ok: false, erreur: `${FICHIERS_MAX} pièces jointes maximum par dossier.` };
  const chemin = cheminFichier(id, randomUUID(), f.nom);
  const { data, error } = await c.db.storage.from(BUCKET_LIBERATIONS).createSignedUploadUrl(chemin);
  if (error || !data) {
    console.error("[liberations] lien d'envoi :", error?.message);
    return { ok: false, erreur: "L'envoi n'a pas pu être préparé. Le stockage des libérations est-il créé (migration 20261013130000) ?" };
  }
  return { ok: true, donnees: { chemin, jeton: data.token } };
}

export async function enregistrerFichier(id: string, f: { chemin: string; nom: string; type: string; taille: number }): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await dossierModifiable(c, id);
  if (!d) return { ok: false, erreur: INTROUVABLE };
  if (!f.chemin.startsWith(`${id}/`) || f.chemin.includes("..")) return { ok: false, erreur: ECHEC };
  const dossier = f.chemin.slice(0, f.chemin.lastIndexOf("/"));
  const { data: present } = await c.db.storage.from(BUCKET_LIBERATIONS).list(dossier, { search: f.chemin.slice(dossier.length + 1) });
  if (!present?.length) return { ok: false, erreur: "Le fichier n'est pas arrivé. Réessayez l'envoi." };
  const { error } = await c.db.from("site_liberation_fichiers").insert({
    liberation_id: id, chemin: f.chemin, nom_origine: f.nom.slice(0, 200), taille: f.taille, type_mime: f.type,
  });
  if (error) {
    await c.db.storage.from(BUCKET_LIBERATIONS).remove([f.chemin]);
    return { ok: false, erreur: messageErreur(error.code) };
  }
  rafraichir(id);
  return { ok: true };
}

export async function supprimerFichier(fichierId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c || !UUID.test(fichierId)) return { ok: false, erreur: REFUS };
  const { data: x } = await c.db.from("site_liberation_fichiers").select("id, liberation_id, chemin").eq("id", fichierId).maybeSingle();
  if (!x) return { ok: false, erreur: ECHEC };
  if (!(await dossierModifiable(c, x.liberation_id as string))) return { ok: false, erreur: INTROUVABLE };
  const { error } = await c.db.from("site_liberation_fichiers").delete().eq("id", fichierId);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  const { error: e } = await c.db.storage.from(BUCKET_LIBERATIONS).remove([x.chemin as string]);
  if (e) console.error("[liberations] fichier non supprimé :", e.message);
  rafraichir(x.liberation_id as string);
  return { ok: true };
}

// ── Paramètres (admins) ─────────────────────────────────────────────────────

function rafraichirParametres() {
  revalidatePath("/espace/liberations/parametres");
}

export async function enregistrerLieu(id: string | null, champs: Record<string, string>): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c) return { ok: false, erreur: REFUS };
  const v = validerLieu(champs);
  if (!v.ok) return v;
  if (id) {
    if (!UUID.test(id)) return { ok: false, erreur: ECHEC };
    const { error } = await c.db.from("site_liberations_lieux").update(v.valeurs).eq("id", id);
    if (error) return { ok: false, erreur: messageErreur(error.code) };
  } else {
    const { count } = await c.db.from("site_liberations_lieux").select("id", { count: "exact", head: true });
    const { error } = await c.db.from("site_liberations_lieux").insert({ ...v.valeurs, ordre: (count ?? 0) + 1 });
    if (error) return { ok: false, erreur: messageErreur(error.code) };
  }
  rafraichirParametres();
  return { ok: true, message: id ? "Lieu enregistré." : "Lieu ajouté." };
}

export async function basculerLieu(id: string, actif: boolean): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c || !UUID.test(id)) return { ok: false, erreur: REFUS };
  const { error } = await c.db.from("site_liberations_lieux").update({ actif }).eq("id", id);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichirParametres();
  return { ok: true, message: actif ? "Le lieu est de nouveau proposé." : "Le lieu n'est plus proposé dans les nouvelles demandes." };
}

/** Supprimer un lieu : les dossiers gardent leur copie de l'adresse. */
export async function supprimerLieu(id: string): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c || !UUID.test(id)) return { ok: false, erreur: REFUS };
  const { error } = await c.db.from("site_liberations_lieux").delete().eq("id", id);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichirParametres();
  return { ok: true, message: "Lieu supprimé." };
}

export async function ajouterTaux(champs: Record<string, string>): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c) return { ok: false, erreur: REFUS };
  const v = validerTaux(champs);
  if (!v.ok) return v;
  const { error } = await c.db.from("site_liberations_taux_km").insert({ ...v.valeurs, auteur_id: c.user.id });
  if (error) return { ok: false, erreur: error.code === "23505" ? "Un taux commence déjà à cette date. Supprimez-le d'abord." : messageErreur(error.code) };
  rafraichirParametres();
  return { ok: true, message: "Taux ajouté." };
}

export async function supprimerTaux(id: string): Promise<Resultat> {
  const c = await ctxAdmin();
  if (!c || !UUID.test(id)) return { ok: false, erreur: REFUS };
  const { error } = await c.db.from("site_liberations_taux_km").delete().eq("id", id);
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichirParametres();
  return { ok: true, message: "Taux supprimé." };
}
