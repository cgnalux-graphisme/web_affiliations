"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estSuperAdmin, utilisateurConnecte } from "../../../lib/espace/acces";
import { getSupabaseService } from "../../../lib/supabase-service";
import { dateFrToIso } from "../../../lib/dates";
import { uniteAutorisee, uniteModifiable, validerDelegue } from "../../../lib/delegues/delegue";
import { libelleMandat, siteDuMandat, validerMandat } from "../../../lib/delegues/mandats";
import { executerImport, type RapportImport } from "../../../lib/delegues/import-serveur";
import { COLONNES_DELEGUE, COLONNES_MANDAT, type Delegue, type Mandat } from "../../../lib/delegues/types";

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
  // L'unité actuelle reste acceptée même si elle n'est plus suivie (sinon la carte ne s'enregistre plus).
  if ("unite_id" in v.valeurs && !uniteModifiable(v.valeurs.unite_id ?? null, d.unite_id, d.entreprise_id, await unitesDe(c, d.entreprise_id))) {
    return { ok: false, erreur: "Cette unité n'est pas une unité suivie de l'entreprise." };
  }
  const { error } = await c.db.from("site_delegues").update(v.valeurs).eq("id", id);
  if (error) return { ok: false, erreur: ECHEC };
  await journal(c, "modification", d, { champs: Object.keys(v.valeurs) });
  rafraichir(id);
  return { ok: true, message: "Modifications enregistrées." };
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
  return { ok: true, message: "Mandat ajouté." };
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
  return { ok: true, message: "Mandat enregistré." };
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
  return { ok: true, message: "Mandat terminé." };
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
  return { ok: true, message: "Mandat supprimé." };
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
