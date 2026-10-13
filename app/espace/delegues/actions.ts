"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estSuperAdmin, utilisateurConnecte } from "../../../lib/espace/acces";
import { getSupabaseService } from "../../../lib/supabase-service";
import { dateFrToIso } from "../../../lib/dates";
import { uniteAutorisee, uniteModifiable, validerDelegue } from "../../../lib/delegues/delegue";
import { libelleMandat, siteDuMandat, siteParDefaut, validerMandat } from "../../../lib/delegues/mandats";
import { planReprise, type ChampEcart } from "../../../lib/delegues/ecarts";
import { fusionnerEntree } from "../../../lib/delegues/cglink";
import { appelerFonctionCgLink, companyDuDelegue, modifierDelegues, synchroniser } from "../../../lib/delegues/cglink-serveur";
import { executerImport, type RapportImport } from "../../../lib/delegues/import-serveur";
import { COLONNES_DELEGUE, COLONNES_MANDAT, type Delegue, type DelegueCgLink, type Mandat } from "../../../lib/delegues/types";

/**
 * Écritures de l'app Gestion délégués CG Link : rôle SUPER_ADMIN revérifié à chaque action, puis service_role
 * (les tables délégués n'ont aucune politique d'écriture). Chaque modification écrit une ligne de journal.
 * Rien n'est écrit dans CG Link (plan 2b).
 */

export type Resultat<T = undefined> = { ok: true; donnees?: T; message?: string } | { ok: false; erreur: string };
type Ctx = { db: SupabaseClient; auteur: string };

const REFUS = "Accès refusé. Reconnectez-vous.";
const ECHEC = "Enregistrement impossible. Rechargez la page puis réessayez.";

async function ctx(): Promise<Ctx | null> {
  const user = await utilisateurConnecte();
  const db = getSupabaseService();
  return user && db && (await estSuperAdmin()) ? { db, auteur: user.id } : null;
}

function rafraichir(delegueId?: string) {
  revalidatePath("/espace/delegues/liste");
  revalidatePath("/espace/delegues/a-verifier");
  revalidatePath("/espace/delegues/journal");
  if (delegueId) revalidatePath(`/espace/delegues/${delegueId}`);
}

async function journal(c: Ctx, action: string, delegue: Pick<Delegue, "id" | "entreprise_id"> | null, details: Record<string, unknown> = {}) {
  const { error } = await c.db.from("site_journal_delegues").insert({
    auteur_id: c.auteur, delegue_id: delegue?.id ?? null, entreprise_id: delegue?.entreprise_id ?? null, action, details,
  });
  if (error) console.error("[delegues] journal :", error.code);
}

async function lireDelegue(c: Ctx, id: string): Promise<Delegue | null> {
  const { data } = await c.db.from("site_delegues").select(COLONNES_DELEGUE).eq("id", id).maybeSingle();
  return (data as Delegue | null) ?? null;
}

async function unitesDe(c: Ctx, entrepriseId: string) {
  const { data } = await c.db.from("site_entreprise_unites").select("id, entreprise_id, statut, suivie, site_id").eq("entreprise_id", entrepriseId);
  return (data ?? []) as { id: string; entreprise_id: string; statut: string; suivie: boolean; site_id: string | null }[];
}

const ERREUR_LECTURE_CGLINK = "CG Link n'a pas répondu. Réessayez dans un instant.";

/** Entrée CG Link d'un délégué qui a un compte : « introuvable » et « erreur de lecture » sont distingués. */
async function lieuCgLink(
  c: Ctx,
  cglinkId: string
): Promise<{ ok: true; id: string; entree: DelegueCgLink } | { ok: false; erreur: string; introuvable?: true }> {
  const lieu = await companyDuDelegue(c.db, cglinkId);
  if (lieu === "erreur") return { ok: false, erreur: ERREUR_LECTURE_CGLINK };
  if (!lieu) return { ok: false, erreur: "Compte CG Link introuvable.", introuvable: true };
  return { ok: true, ...lieu };
}

/** Après une modification : si le délégué a un compte, sa carte est envoyée à CG Link (jamais l'e-mail). */
async function apresModification(c: Ctx, delegueId: string, message: string): Promise<Resultat> {
  const d = await lireDelegue(c, delegueId);
  if (!d?.cglink_user_id) return { ok: true, message };
  const { data: ms } = await c.db.from("site_delegue_mandats").select(COLONNES_MANDAT).eq("delegue_id", delegueId);
  const s = await synchroniser(c.db, d, (ms ?? []) as Mandat[]);
  return s.ok ? { ok: true, message: `${message} CG Link mis à jour.` } : { ok: true, message: s.erreur };
}

export async function lancerImport(): Promise<Resultat<RapportImport>> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const r = await executerImport(c.auteur);
  if (!r) return { ok: false, erreur: "L'import n'a pas pu lire CG Link. Réessayez dans un instant." };
  rafraichir();
  return { ok: true, donnees: r };
}

export async function creerDelegue(champs: Record<string, string>): Promise<Resultat<{ id: string }>> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const v = validerDelegue({ nom: "", ...champs });
  if (!v.ok) return v;
  const entrepriseId = (champs.entreprise_id ?? "").trim();
  const { data: fiche } = await c.db.from("site_entreprises").select("id").eq("id", entrepriseId).maybeSingle();
  if (!fiche) return { ok: false, erreur: "Choisissez l'entreprise du délégué." };
  if (!uniteAutorisee(v.valeurs.unite_id ?? null, entrepriseId, await unitesDe(c, entrepriseId))) {
    return { ok: false, erreur: "Cette unité n'est pas une unité suivie de l'entreprise." };
  }
  const { data, error } = await c.db.from("site_delegues").insert({ ...v.valeurs, entreprise_id: entrepriseId }).select("id").single();
  if (error || !data) return { ok: false, erreur: ECHEC };
  await journal(c, "creation", { id: data.id as string, entreprise_id: entrepriseId });
  rafraichir();
  return { ok: true, donnees: { id: data.id as string } };
}

export async function enregistrerDelegue(id: string, champs: Record<string, string>): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d) return { ok: false, erreur: ECHEC };
  const v = validerDelegue(champs);
  if (!v.ok) return v;
  // CG Link retrouve le délégué par cet e-mail à la connexion : il ne se change pas ici.
  if (d.cglink_user_id && "email" in v.valeurs && (v.valeurs.email ?? null) !== (d.email ?? null)) {
    return { ok: false, erreur: "L'e-mail est l'adresse de connexion CG Link : il ne se change pas ici." };
  }
  // L'unité actuelle reste acceptée même si elle n'est plus suivie (sinon la carte ne s'enregistre plus).
  if ("unite_id" in v.valeurs && !uniteModifiable(v.valeurs.unite_id ?? null, d.unite_id, d.entreprise_id, await unitesDe(c, d.entreprise_id))) {
    return { ok: false, erreur: "Cette unité n'est pas une unité suivie de l'entreprise." };
  }
  const { error } = await c.db.from("site_delegues").update(v.valeurs).eq("id", id);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "modification", d, { champs: Object.keys(v.valeurs) });
  rafraichir(id);
  return apresModification(c, id, "Modifications enregistrées.");
}

export async function supprimerDelegue(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d) return { ok: false, erreur: ECHEC };
  if (d.cglink_user_id) return { ok: false, erreur: "Ce délégué a un compte CG Link : il ne se supprime pas ici." };
  const { error } = await c.db.from("site_delegues").delete().eq("id", id);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "suppression", { id: d.id, entreprise_id: d.entreprise_id }, { nom: [d.prenom, d.nom].filter(Boolean).join(" ") });
  rafraichir();
  return { ok: true, message: "Délégué supprimé." };
}

export async function ajouterMandat(delegueId: string, champs: Record<string, string>): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, delegueId);
  if (!d) return { ok: false, erreur: ECHEC };
  const v = validerMandat(champs);
  if (!v.ok) return v;
  const [unites, { data: sites }] = await Promise.all([
    unitesDe(c, d.entreprise_id),
    c.db.from("site_entreprise_sites").select("id, principal").eq("entreprise_id", d.entreprise_id),
  ]);
  const site = siteDuMandat(v.valeurs.site_id, d.unite_id, unites, (sites ?? []) as { id: string; principal: boolean }[]);
  if (!site.ok) return site;
  const { error } = await c.db.from("site_delegue_mandats").insert({ ...v.valeurs, site_id: site.site_id, delegue_id: delegueId });
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "mandat_ajout", d, { mandat: libelleMandat(v.valeurs) });
  rafraichir(delegueId);
  return apresModification(c, delegueId, "Mandat ajouté.");
}

async function lireMandat(c: Ctx, id: string) {
  const { data } = await c.db.from("site_delegue_mandats").select(COLONNES_MANDAT).eq("id", id).maybeSingle();
  if (!data) return null;
  const m = data as Mandat;
  const d = await lireDelegue(c, m.delegue_id);
  return d ? { m, d } : null;
}

export async function enregistrerMandat(mandatId: string, champs: Record<string, string>): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const lu = await lireMandat(c, mandatId);
  if (!lu) return { ok: false, erreur: ECHEC };
  const v = validerMandat(champs);
  if (!v.ok) return v;
  // Site vide : site de l'unité de rattachement, sinon principal (comme à l'ajout ; jamais aucun site).
  const [unites, { data: sites }] = await Promise.all([
    unitesDe(c, lu.d.entreprise_id),
    c.db.from("site_entreprise_sites").select("id, principal").eq("entreprise_id", lu.d.entreprise_id),
  ]);
  const site = siteDuMandat(v.valeurs.site_id, lu.d.unite_id, unites, (sites ?? []) as { id: string; principal: boolean }[]);
  if (!site.ok) return site;
  const { error } = await c.db.from("site_delegue_mandats").update({ ...v.valeurs, site_id: site.site_id }).eq("id", mandatId);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "mandat_modification", lu.d, { mandat: libelleMandat(v.valeurs) });
  rafraichir(lu.d.id);
  return apresModification(c, lu.d.id, "Mandat enregistré.");
}

export async function terminerMandat(mandatId: string, finFr: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const lu = await lireMandat(c, mandatId);
  if (!lu) return { ok: false, erreur: ECHEC };
  const fin = dateFrToIso(finFr.trim());
  if (!fin) return { ok: false, erreur: "Date invalide. Format attendu : jj/mm/aaaa" };
  if (lu.m.debut && fin < lu.m.debut) return { ok: false, erreur: "La fin du mandat ne peut pas précéder son début." };
  const { error } = await c.db.from("site_delegue_mandats").update({ fin }).eq("id", mandatId);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "mandat_fin", lu.d, { mandat: libelleMandat(lu.m), fin });
  rafraichir(lu.d.id);
  return apresModification(c, lu.d.id, "Mandat terminé.");
}

export async function supprimerMandat(mandatId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const lu = await lireMandat(c, mandatId);
  if (!lu) return { ok: false, erreur: ECHEC };
  const { error } = await c.db.from("site_delegue_mandats").delete().eq("id", mandatId);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "mandat_suppression", lu.d, { mandat: libelleMandat(lu.m) });
  rafraichir(lu.d.id);
  return apresModification(c, lu.d.id, "Mandat supprimé.");
}

export async function confirmerDelegue(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d) return { ok: false, erreur: ECHEC };
  const { error } = await c.db.from("site_delegues").update({ a_verifier: null }).eq("id", id);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "verification", d, { raison: d.a_verifier });
  rafraichir(id);
  return { ok: true };
}

export async function confirmerMandat(mandatId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const lu = await lireMandat(c, mandatId);
  if (!lu) return { ok: false, erreur: ECHEC };
  const { error } = await c.db.from("site_delegue_mandats").update({ a_verifier: null }).eq("id", mandatId);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "verification", lu.d, { mandat: libelleMandat(lu.m), raison: lu.m.a_verifier });
  rafraichir(lu.d.id);
  return { ok: true };
}

// ── Comptes CG Link (plan 2b) ───────────────────────────────────────────────

const REDIRECTION_CGLINK = "https://cglink-app.vercel.app/";

export async function inviterDelegue(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d) return { ok: false, erreur: ECHEC };
  if (d.cglink_user_id) return { ok: false, erreur: "Ce délégué a déjà un compte CG Link." };
  if (!d.email) return { ok: false, erreur: "Indiquez d'abord l'e-mail du délégué." };
  const { data: fiche } = await c.db.from("site_entreprises").select("company_id").eq("id", d.entreprise_id).maybeSingle();
  if (!fiche?.company_id) return { ok: false, erreur: "Reliez d'abord l'entreprise à CG Link (app Entreprises)." };
  const r = await appelerFonctionCgLink("invite-user", {
    email: d.email, name: [d.prenom, d.nom].filter(Boolean).join(" "), role: "DELEGATE", companyId: fiche.company_id, redirectTo: REDIRECTION_CGLINK,
  });
  if (!r.ok) return r;
  if (!r.userId) return { ok: false, erreur: "CG Link n'a pas renvoyé l'identifiant du compte. Vérifiez dans CG Link avant de réessayer." };
  const { error } = await c.db.from("site_delegues").update({ cglink_user_id: r.userId }).eq("id", id);
  if (error) return { ok: false, erreur: "Invitation envoyée, mais le lien n'a pas pu être enregistré ici. Relancez l'import CG Link." };
  await journal(c, "invitation", d);
  return apresModification(c, id, "Invitation envoyée.");
}

export async function renvoyerInvitation(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id || !d.email) return { ok: false, erreur: ECHEC };
  const lieu = await lieuCgLink(c, d.cglink_user_id);
  if (!lieu.ok) return lieu;
  const r = await appelerFonctionCgLink("invite-user", {
    email: lieu.entree.email ?? d.email, name: [d.prenom, d.nom].filter(Boolean).join(" "), role: "DELEGATE", companyId: lieu.id, redirectTo: REDIRECTION_CGLINK,
  });
  if (!r.ok) return r;
  await journal(c, "invitation_renvoyee", d);
  return apresModification(c, id, "Invitation renvoyée.");
}

export async function annulerInvitation(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id) return { ok: false, erreur: ECHEC };
  const lieu = await lieuCgLink(c, d.cglink_user_id);
  if (!lieu.ok) return lieu;
  const r = await appelerFonctionCgLink("cancel-invite", { companyId: lieu.id, delegateId: d.cglink_user_id });
  if (!r.ok) return r;
  await c.db.from("site_delegues").update({ cglink_user_id: null }).eq("id", id);
  await journal(c, "invitation_annulee", d);
  rafraichir(id);
  return { ok: true, message: "Invitation annulée : le compte CG Link est supprimé, le délégué reste dans l'Espace." };
}

export async function changerAcces(id: string, actif: boolean): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id) return { ok: false, erreur: ECHEC };
  const lieu = await lieuCgLink(c, d.cglink_user_id);
  if (!lieu.ok) return lieu;
  const r = await modifierDelegues(c.db, lieu.id, (ds) => fusionnerEntree(ds, d.cglink_user_id!, { isActive: actif }));
  if (r !== "ok") return { ok: false, erreur: r === "conflit" ? "CG Link a été modifié en même temps. Réessayez." : ECHEC };
  await journal(c, actif ? "deblocage" : "blocage", d);
  rafraichir(id);
  return { ok: true, message: actif ? "Accès à CG Link rétabli." : "Accès à CG Link bloqué (une session ouverte expire dans l'heure)." };
}

export async function retirerLienCgLink(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id) return { ok: false, erreur: ECHEC };
  const lieu = await lieuCgLink(c, d.cglink_user_id);
  if (lieu.ok) return { ok: false, erreur: "Le compte existe encore dans CG Link : utilisez « Bloquer »." };
  if (!lieu.introuvable) return lieu;
  await c.db.from("site_delegues").update({ cglink_user_id: null }).eq("id", id);
  await journal(c, "lien_retire", d);
  rafraichir(id);
  return { ok: true, message: "Lien retiré." };
}

export async function envoyerVersCgLink(id: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id) return { ok: false, erreur: ECHEC };
  await journal(c, "envoi_cglink", d);
  rafraichir(id);
  return apresModification(c, id, "Carte envoyée.");
}

export async function changerEntreprise(id: string, entrepriseId: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d || d.entreprise_id === entrepriseId) return { ok: false, erreur: ECHEC };
  const { data: fiche } = await c.db.from("site_entreprises").select("id, company_id").eq("id", entrepriseId).maybeSingle();
  if (!fiche) return { ok: false, erreur: "Choisissez une entreprise." };
  if (d.cglink_user_id) {
    if (!fiche.company_id) return { ok: false, erreur: "Cette entreprise n'est pas reliée à CG Link : le compte du délégué ne peut pas y être déplacé." };
    const lieu = await lieuCgLink(c, d.cglink_user_id);
    if (!lieu.ok) return lieu;
    if (lieu.id !== fiche.company_id) {
      // Ajout dans la nouvelle entreprise d'abord, retrait ensuite : en cas d'échec, jamais de compte sans entreprise.
      const ajout = await modifierDelegues(c.db, fiche.company_id, (ds) => [...ds.filter((x) => x.id !== d.cglink_user_id), lieu.entree]);
      if (ajout !== "ok") return { ok: false, erreur: "CG Link n'a pas pu être mis à jour. Rien n'a changé." };
      const retrait = await modifierDelegues(c.db, lieu.id, (ds) => ds.filter((x) => x.id !== d.cglink_user_id));
      const profil = await c.db.from("profiles").update({ company_id: fiche.company_id }).eq("id", d.cglink_user_id);
      if (retrait !== "ok" || profil.error) {
        console.error("[delegues] déplacement CG Link :", retrait, profil.error?.code);
        await journal(c, "changement_entreprise", d, { echec: "cglink", retrait, profil: profil.error?.code ?? null });
        return {
          ok: false,
          erreur:
            "Déplacement CG Link incomplet : le compte figure peut-être dans les deux entreprises CG Link. Rien n'a changé dans l'Espace ; vérifiez dans CG Link puis réessayez.",
        };
      }
    }
  }
  const { error } = await c.db.from("site_delegues").update({ entreprise_id: entrepriseId, unite_id: null }).eq("id", id);
  if (error) {
    return { ok: false, erreur: d.cglink_user_id ? "Le compte a été déplacé dans CG Link, mais pas la carte ici. Réessayez le changement." : ECHEC };
  }
  const { data: principal } = await c.db.from("site_entreprise_sites").select("id").eq("entreprise_id", entrepriseId).eq("principal", true).maybeSingle();
  const jour = new Date().toISOString().slice(0, 10);
  const mandats = await c.db
    .from("site_delegue_mandats")
    .update({ site_id: principal?.id ?? null, a_verifier: "Entreprise changée : vérifiez le site du mandat" })
    .eq("delegue_id", id)
    .or("fin.is.null,fin.gt." + jour);
  await journal(c, "changement_entreprise", { id, entreprise_id: entrepriseId }, { avant: d.entreprise_id });
  rafraichir(id);
  if (mandats.error) return { ok: true, message: "Entreprise changée, mais les mandats en cours n'ont pas pu être déplacés : corrigez leur site." };
  return { ok: true, message: "Entreprise changée. Vérifiez le site des mandats en cours." };
}

export async function reprendreEcart(id: string, champ: ChampEcart): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d?.cglink_user_id) return { ok: false, erreur: ECHEC };
  const lieu = await lieuCgLink(c, d.cglink_user_id);
  if (!lieu.ok) return lieu;
  const [{ data: ms }, unites, { data: sites }] = await Promise.all([
    c.db.from("site_delegue_mandats").select(COLONNES_MANDAT).eq("delegue_id", id),
    unitesDe(c, d.entreprise_id),
    c.db.from("site_entreprise_sites").select("id, principal").eq("entreprise_id", d.entreprise_id),
  ]);
  const jour = new Date().toISOString().slice(0, 10);
  const ops = planReprise(champ, d, (ms ?? []) as Mandat[], lieu.entree, jour);
  for (const op of ops) {
    if (op.type === "erreur") return { ok: false, erreur: op.erreur };
    const r =
      op.type === "maj_delegue" ? await c.db.from("site_delegues").update(op.valeurs).eq("id", id)
      : op.type === "terminer" ? await c.db.from("site_delegue_mandats").update({ fin: op.fin }).in("id", op.ids)
      : op.type === "qualite" ? await c.db.from("site_delegue_mandats").update({ qualite: op.qualite }).eq("id", op.id)
      : op.type === "fonction" ? await c.db.from("site_delegue_mandats").update({ fonction: op.fonction }).eq("id", op.id)
      : await c.db.from("site_delegue_mandats").insert({ ...op.mandat, delegue_id: id,
          site_id: siteParDefaut(d.unite_id, unites, (sites ?? []) as { id: string; principal: boolean }[]) });
    if (r.error) return { ok: false, erreur: ECHEC };
  }
  await journal(c, "ecart_repris", d, { champ });
  rafraichir(id);
  return { ok: true, message: "Valeur de CG Link reprise." };
}

export async function ignorerEcart(id: string, champ: string, valeur: string): Promise<Resultat> {
  const c = await ctx();
  if (!c) return { ok: false, erreur: REFUS };
  const d = await lireDelegue(c, id);
  if (!d) return { ok: false, erreur: ECHEC };
  const { error } = await c.db.from("site_ecarts_ignores").upsert(
    { cible: "delegue", cible_id: id, champ, valeur, ignore_par: c.auteur },
    { onConflict: "cible,cible_id,champ,valeur", ignoreDuplicates: true });
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "ecart_ignore", d, { champ });
  rafraichir(id);
  return { ok: true };
}
