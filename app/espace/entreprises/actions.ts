"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aApp } from "../../../lib/espace/acces";
import { getSupabaseServer } from "../../../lib/supabase-server";
import { getSupabaseService } from "../../../lib/supabase-service";
import { dateFrToIso } from "../../../lib/dates";
import { chiffres, normaliserNumeroBce } from "../../../lib/bce/numero";
import { lireBce } from "../../../lib/bce/lecture-serveur";
import {
  comparerBce, majEntrepriseDepuisBce, majUnitesDepuisBce, type ChoixBce, type ComparaisonBce,
} from "../../../lib/bce/comparaison";
import { dansNosProvinces, lireCle, nomManquant, onssACreer, onssDeCompany, planSuppressionSite } from "../../../lib/entreprises/regles";
import { COLONNES_COMPANY } from "../../../lib/entreprises/donnees-serveur";
import { secteurDepuisCgLink } from "../../../lib/permanents/perimetre";
import { COLONNES_ENTREPRISE, COLONNES_SITE, COLONNES_UNITE, type CompanyCgLink, type Entreprise, type Site, type Unite } from "../../../lib/entreprises/types";

/**
 * Écritures de l'app Entreprises. Chaque action revérifie le droit (aApp), puis écrit avec la SESSION de la
 * personne (getSupabaseServer) : la RLS site_a_app('entreprises') s'applique. Seules exceptions, en
 * service_role : lecture de companies (CG Link) et écriture de site_ecarts_ignores (aucune politique d'écriture).
 */

export type Resultat<T = undefined> = { ok: true; donnees?: T; message?: string } | { ok: false; erreur: string };
export type Champs = Record<string, string>;

const REFUS = "Accès refusé. Reconnectez-vous.";
const ECHEC = "Enregistrement impossible. Votre session a peut-être expiré : reconnectez-vous puis réessayez.";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHAMPS_ENTREPRISE = ["nom", "numero_bce", "notes", "secteur_id", "siege_rue", "siege_numero", "siege_boite", "siege_code_postal",
  "siege_localite", "ref_nom", "ref_fonction", "ref_email", "ref_telephone"] as const;
const CHAMPS_SITE = ["nom", "unite_postale_id", "ref_nom", "ref_fonction", "ref_email", "ref_telephone"] as const;
const CHAMPS_UNITE = ["denomination", "rue", "numero", "boite", "code_postal", "localite", "date_debut", "site_id", "statut", "suivie"] as const;

async function session(): Promise<SupabaseClient | null> {
  return (await aApp("entreprises")) ? await getSupabaseServer() : null;
}

function rafraichir(cle?: string) {
  revalidatePath("/espace/entreprises/liste");
  if (cle) revalidatePath(`/espace/entreprises/${cle}`);
}

const texte = (v: string | undefined) => {
  const t = (v ?? "").trim();
  return t ? t : null;
};

/** Ne garde que les champs permis, convertis et validés. */
function nettoyer(champs: Champs, permis: readonly string[]): { ok: true; valeurs: Record<string, string | boolean | null> } | { ok: false; erreur: string } {
  const valeurs: Record<string, string | boolean | null> = {};
  for (const k of permis) {
    if (!(k in champs)) continue;
    let v = texte(champs[k]);
    if (k === "numero_bce" && v) {
      const n = normaliserNumeroBce(v);
      if (!n) return { ok: false, erreur: "Numéro d'entreprise invalide. Exemple : 0850.076.920" };
      v = n;
    }
    if (k === "ref_email" && v && !EMAIL.test(v)) return { ok: false, erreur: "Adresse e-mail invalide. Exemple : prenom.nom@entreprise.be" };
    if (k === "date_debut" && v) {
      const iso = dateFrToIso(v);
      if (!iso) return { ok: false, erreur: "Date invalide. Format attendu : jj/mm/aaaa" };
      v = iso;
    }
    if (k === "statut" && v && v !== "actif" && v !== "arrete") return { ok: false, erreur: "Statut inconnu." };
    if (k === "secteur_id" && v && !/^[0-9a-f-]{36}$/i.test(v)) return { ok: false, erreur: "Secteur inconnu. Rechargez la page." };
    if (k === "suivie") {
      valeurs[k] = v === "true";
      continue;
    }
    valeurs[k] = v;
  }
  return { ok: true, valeurs };
}

function messageErreur(code: string | undefined): string {
  if (code === "23505") return "Ce numéro figure déjà sur la fiche.";
  if (code === "23514") return "Une donnée ne respecte pas le format attendu. Vérifiez les champs.";
  if (code === "P0001") return "Le site principal ne peut pas être supprimé.";
  return ECHEC;
}

/**
 * Fiche d'une entreprise CG Link créée à la première modification (idempotent) : fiche, site principal,
 * ONSS repris de CG Link. Deux ouvertures simultanées ne créent ni doublon de fiche ni doublon d'ONSS.
 */
async function ficheDeCle(db: SupabaseClient, cle: string): Promise<{ id: string; cle: string } | null> {
  const c = lireCle(cle);
  if (!c) return null;
  if (c.type === "fiche") return { id: c.id, cle };

  const service = getSupabaseService();
  if (!service) return null;
  const { data: company } = await service.from("companies").select(COLONNES_COMPANY).eq("id", c.id).maybeSingle();
  if (!company) return null;

  // Secteur repris du libellé CG Link (liste site_secteurs), modifiable ensuite dans « Identité ».
  const { data: secteurs } = await service.from("site_secteurs").select("id, nom");
  const secteurId = secteurDepuisCgLink((company as CompanyCgLink).sector, (secteurs ?? []) as { id: string; nom: string }[]);
  // ignoreDuplicates + select : une ligne seulement si CETTE requête a créé la fiche.
  const { data: creee } = await db
    .from("site_entreprises")
    .upsert({ company_id: c.id, secteur_id: secteurId }, { onConflict: "company_id", ignoreDuplicates: true })
    .select("id");
  const { data: fiche } = await db.from("site_entreprises").select("id").eq("company_id", c.id).maybeSingle();
  if (!fiche) return null;
  const id = fiche.id as string;

  const { data: principal } = await db.from("site_entreprise_sites").select("id").eq("entreprise_id", id).eq("principal", true).maybeSingle();
  if (!principal) {
    const { error } = await db.from("site_entreprise_sites").insert({ entreprise_id: id, nom: "Site principal", principal: true });
    if (error && error.code !== "23505") console.error("[entreprises] site principal :", error.code);
  }
  // ONSS repris de CG Link à la création seulement : un ONSS supprimé ensuite ne doit pas revenir.
  const { data: existants } = await db.from("site_entreprise_onss").select("numero").eq("entreprise_id", id);
  const aCreer = creee?.length ? onssACreer(onssDeCompany(company as CompanyCgLink), (existants ?? []) as { numero: string }[]) : [];
  if (aCreer.length) {
    await db.from("site_entreprise_onss").upsert(
      aCreer.map((o) => ({ entreprise_id: id, numero: o.numero, libelle: o.libelle })),
      { onConflict: "entreprise_id,numero", ignoreDuplicates: true }
    );
  }
  return { id, cle: id };
}

export async function assurerFiche(cle: string): Promise<Resultat<{ id: string; cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const f = await ficheDeCle(db, cle);
  if (!f) return { ok: false, erreur: ECHEC };
  rafraichir(cle);
  return { ok: true, donnees: f };
}

export async function enregistrerEntreprise(cle: string, champs: Champs): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const n = nettoyer(champs, CHAMPS_ENTREPRISE);
  if (!n.ok) return n;
  const f = await ficheDeCle(db, cle);
  if (!f) return { ok: false, erreur: ECHEC };
  if ("nom" in n.valeurs) {
    const { data: actuelle } = await db.from("site_entreprises").select("company_id").eq("id", f.id).maybeSingle();
    if (nomManquant((actuelle?.company_id as string | null) ?? null, n.valeurs.nom as string | null)) {
      return { ok: false, erreur: "Indiquez le nom de l'entreprise." };
    }
  }
  const { data, error } = await db.from("site_entreprises").update(n.valeurs).eq("id", f.id).select("id");
  if (error || !data?.length) return { ok: false, erreur: messageErreur(error?.code) };
  rafraichir(f.cle);
  return { ok: true, donnees: { cle: f.cle }, message: "Modifications enregistrées." };
}

export async function creerEntreprise(champs: Champs): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const n = nettoyer(champs, ["nom", "numero_bce"]);
  if (!n.ok) return n;
  if (!n.valeurs.nom) return { ok: false, erreur: "Indiquez le nom de l'entreprise." };
  const { data, error } = await db.from("site_entreprises").insert(n.valeurs).select("id").single();
  if (error || !data) return { ok: false, erreur: messageErreur(error?.code) };
  const id = data.id as string;
  await db.from("site_entreprise_sites").insert({ entreprise_id: id, nom: "Site principal", principal: true });
  rafraichir();
  return { ok: true, donnees: { cle: id } };
}

export async function relierCgLink(ficheId: string, companyId: string): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const { data, error } = await db.from("site_entreprises").update({ company_id: companyId }).eq("id", ficheId).is("company_id", null).select("id");
  if (error || !data?.length) {
    return { ok: false, erreur: error?.code === "23505" ? "Cette entreprise CG Link est déjà reliée à une autre fiche." : ECHEC };
  }
  rafraichir(ficheId);
  return { ok: true, message: "Fiche reliée à CG Link." };
}

export async function ajouterSite(cle: string, nom: string): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  if (!nom.trim()) return { ok: false, erreur: "Indiquez le nom du site." };
  const f = await ficheDeCle(db, cle);
  if (!f) return { ok: false, erreur: ECHEC };
  const { error } = await db.from("site_entreprise_sites").insert({ entreprise_id: f.id, nom: nom.trim(), ordre: 1 });
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichir(f.cle);
  return { ok: true, donnees: { cle: f.cle } };
}

export async function enregistrerSite(siteId: string, champs: Champs): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const n = nettoyer(champs, CHAMPS_SITE);
  if (!n.ok) return n;
  if ("nom" in n.valeurs && !n.valeurs.nom) return { ok: false, erreur: "Indiquez le nom du site." };
  const { data, error } = await db.from("site_entreprise_sites").update(n.valeurs).eq("id", siteId).select("entreprise_id");
  if (error || !data?.length) return { ok: false, erreur: messageErreur(error?.code) };
  rafraichir(data[0].entreprise_id as string);
  return { ok: true, message: "Site enregistré." };
}

export async function supprimerSite(siteId: string): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const { data: site } = await db.from("site_entreprise_sites").select(COLONNES_SITE).eq("id", siteId).maybeSingle();
  if (!site) return { ok: false, erreur: ECHEC };
  const { data: principal } = await db.from("site_entreprise_sites").select(COLONNES_SITE)
    .eq("entreprise_id", (site as Site).entreprise_id).eq("principal", true).maybeSingle();
  const plan = planSuppressionSite(site as Site, (principal ?? undefined) as Site | undefined);
  if (!plan.ok) return plan;
  // Le déplacement des unités, ONSS et mandats vers le site principal est fait par la base, dans la même
  // transaction que la suppression (trigger site_entreprise_sites_avant_suppression).
  const { data: supprime, error } = await db.from("site_entreprise_sites").delete().eq("id", siteId).select("id");
  if (error || !supprime?.length) return { ok: false, erreur: messageErreur(error?.code) };
  rafraichir((site as Site).entreprise_id);
  return { ok: true, message: "Site supprimé : ses unités et ONSS sont revenus au site principal." };
}

export async function ajouterUnite(cle: string, champs: Champs): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const n = nettoyer(champs, CHAMPS_UNITE);
  if (!n.ok) return n;
  if (!n.valeurs.rue || !n.valeurs.localite) return { ok: false, erreur: "Indiquez au moins la rue et la localité." };
  // Une unité encodée à la main est suivie, sauf si on la décoche.
  if (!("suivie" in n.valeurs)) n.valeurs.suivie = true;
  const f = await ficheDeCle(db, cle);
  if (!f) return { ok: false, erreur: ECHEC };
  let siteId = (n.valeurs.site_id as string | null) ?? null;
  if (!siteId) {
    const { data: p } = await db.from("site_entreprise_sites").select("id").eq("entreprise_id", f.id).eq("principal", true).maybeSingle();
    siteId = (p?.id as string | undefined) ?? null;
  }
  const { error } = await db.from("site_entreprise_unites").insert({ ...n.valeurs, site_id: siteId, entreprise_id: f.id, origine: "manuel" });
  if (error) return { ok: false, erreur: messageErreur(error.code) };
  rafraichir(f.cle);
  return { ok: true, donnees: { cle: f.cle } };
}

export async function enregistrerUnite(uniteId: string, champs: Champs): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const n = nettoyer(champs, CHAMPS_UNITE);
  if (!n.ok) return n;
  const { data, error } = await db.from("site_entreprise_unites").update(n.valeurs).eq("id", uniteId).select("entreprise_id");
  if (error || !data?.length) return { ok: false, erreur: messageErreur(error?.code) };
  rafraichir(data[0].entreprise_id as string);
  return { ok: true, message: "Unité enregistrée." };
}

export async function supprimerUnite(uniteId: string): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const { data, error } = await db.from("site_entreprise_unites").delete().eq("id", uniteId).eq("origine", "manuel").select("entreprise_id");
  if (error) return { ok: false, erreur: ECHEC };
  if (!data?.length) return { ok: false, erreur: "Une unité reprise de la BCE ne se supprime pas : marquez-la « arrêtée »." };
  rafraichir(data[0].entreprise_id as string);
  return { ok: true, message: "Unité supprimée." };
}

export async function ajouterOnss(cle: string, champs: Champs): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const numero = chiffres(champs.numero);
  if (!numero) return { ok: false, erreur: "Indiquez le numéro ONSS (chiffres)." };
  const f = await ficheDeCle(db, cle);
  if (!f) return { ok: false, erreur: ECHEC };
  const { error } = await db.from("site_entreprise_onss").insert({
    entreprise_id: f.id, numero, libelle: texte(champs.libelle), site_id: texte(champs.site_id),
  });
  if (error) return { ok: false, erreur: error.code === "23505" ? "Ce numéro ONSS figure déjà sur la fiche." : ECHEC };
  rafraichir(f.cle);
  return { ok: true, donnees: { cle: f.cle } };
}

export async function enregistrerOnss(onssId: string, champs: Champs): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const maj: Record<string, string | null> = {};
  if ("numero" in champs) {
    const numero = chiffres(champs.numero);
    if (!numero) return { ok: false, erreur: "Indiquez le numéro ONSS (chiffres)." };
    maj.numero = numero;
  }
  if ("libelle" in champs) maj.libelle = texte(champs.libelle);
  if ("site_id" in champs) maj.site_id = texte(champs.site_id);
  const { data, error } = await db.from("site_entreprise_onss").update(maj).eq("id", onssId).select("entreprise_id");
  if (error || !data?.length) return { ok: false, erreur: error?.code === "23505" ? "Ce numéro ONSS figure déjà sur la fiche." : ECHEC };
  rafraichir(data[0].entreprise_id as string);
  return { ok: true, message: "ONSS enregistré." };
}

export async function supprimerOnss(onssId: string): Promise<Resultat> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const { data, error } = await db.from("site_entreprise_onss").delete().eq("id", onssId).select("entreprise_id");
  if (error || !data?.length) return { ok: false, erreur: ECHEC };
  rafraichir(data[0].entreprise_id as string);
  return { ok: true, message: "ONSS supprimé." };
}

export async function ignorerOnss(ficheId: string, numero: string): Promise<Resultat> {
  const user = await aApp("entreprises");
  const service = getSupabaseService();
  if (!user || !service) return { ok: false, erreur: REFUS };
  const { error } = await service.from("site_ecarts_ignores").upsert(
    { cible: "entreprise", cible_id: ficheId, champ: "onss", valeur: chiffres(numero), ignore_par: user.id },
    { onConflict: "cible,cible_id,champ,valeur", ignoreDuplicates: true }
  );
  if (error) return { ok: false, erreur: ECHEC };
  rafraichir(ficheId);
  return { ok: true, message: "Écart ignoré." };
}

/** Données actuelles de la fiche pour la comparaison BCE. */
async function etatFiche(db: SupabaseClient, cle: string) {
  const f = await ficheDeCle(db, cle);
  if (!f) return null;
  const [{ data: e }, { data: u }] = await Promise.all([
    db.from("site_entreprises").select(COLONNES_ENTREPRISE).eq("id", f.id).single(),
    db.from("site_entreprise_unites").select(COLONNES_UNITE).eq("entreprise_id", f.id),
  ]);
  return e ? { f, entreprise: e as Entreprise, unites: (u ?? []) as Unite[] } : null;
}

export async function comparerAvecBce(cle: string): Promise<Resultat<{ comparaison: ComparaisonBce; denomination: string | null }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const etat = await etatFiche(db, cle);
  if (!etat) return { ok: false, erreur: ECHEC };
  if (!etat.entreprise.numero_bce) return { ok: false, erreur: "Indiquez d'abord le numéro d'entreprise BCE de la fiche." };
  const bce = await lireBce(etat.entreprise.numero_bce);
  if (!bce.ok) return bce;
  return { ok: true, donnees: { comparaison: comparerBce(etat.entreprise, etat.unites, bce), denomination: bce.entite.denomination } };
}

/** Relit la BCE (on ne fait pas confiance aux données renvoyées par le navigateur), puis applique les cases cochées. */
export async function appliquerBce(cle: string, choix: ChoixBce): Promise<Resultat<{ cle: string }>> {
  const db = await session();
  if (!db) return { ok: false, erreur: REFUS };
  const etat = await etatFiche(db, cle);
  if (!etat?.entreprise.numero_bce) return { ok: false, erreur: ECHEC };
  const bce = await lireBce(etat.entreprise.numero_bce);
  if (!bce.ok) return bce;
  const comparaison = comparerBce(etat.entreprise, etat.unites, bce);
  const majE = majEntrepriseDepuisBce(comparaison, choix);
  const majU = majUnitesDepuisBce(comparaison, choix, bce.unites);

  // Tout ou rien : une seule fonction SQL (transaction, RLS de la session).
  const { error } = await db.rpc("site_appliquer_bce", {
    p_entreprise: etat.f.id,
    p_maj: majE,
    // Nouvelle unité : suivie si elle est dans nos provinces (Namur, Luxembourg), sinon gardée pour info.
    p_inserer: majU.inserer.map((u) => ({ ...u, suivie: dansNosProvinces(u.code_postal) })),
    p_modifier: majU.modifier,
  });
  if (error) {
    console.error("[entreprises] import BCE :", error.code);
    return {
      ok: false,
      erreur: error.code === "23505"
        ? "Une unité de la BCE figure déjà sur la fiche. Rechargez la page et réessayez. Rien n'a été enregistré."
        : `${ECHEC} Rien n'a été enregistré.`,
    };
  }
  rafraichir(etat.f.cle);
  return { ok: true, donnees: { cle: etat.f.cle }, message: "Données de la BCE enregistrées." };
}
