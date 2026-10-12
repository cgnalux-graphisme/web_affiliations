import { getSupabaseServer } from "../supabase-server";
import { getSupabaseService } from "../supabase-service";
import { construireListe, lireCle, type LigneListe } from "./regles";
import {
  COLONNES_ENTREPRISE, COLONNES_ONSS, COLONNES_SITE, COLONNES_UNITE,
  type CompanyCgLink, type DelegueAffiche, type Entreprise, type Onss, type Site, type Unite,
} from "./types";

/**
 * Lectures de l'app Entreprises. SERVEUR UNIQUEMENT, après exigerApp("entreprises").
 * companies et les tables site_ sont lues en service_role (on ne dépend pas des règles RLS de CG Link) ;
 * les affiliés passent par la fonction site_compter_affilies() avec la session (elle vérifie l'app).
 */

export const COLONNES_COMPANY = "id, name, sector, onss, onss2, onss2_label, onss3, onss3_label, onss4, onss4_label";
export type Affilies = { total: number; parContrat: { type: string; nombre: number }[] };

export function estTableAbsente(code: string | undefined): boolean {
  return code === "42P01" || code === "PGRST205";
}

export async function affiliesParCompany(): Promise<Map<string, Affilies>> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("site_compter_affilies");
  const m = new Map<string, Affilies>();
  if (error) {
    console.error("[entreprises] affiliés :", error.code);
    return m;
  }
  for (const r of (data ?? []) as { company_id: string; contract_type: string | null; nombre: number }[]) {
    const a = m.get(r.company_id) ?? { total: 0, parContrat: [] };
    a.total += Number(r.nombre);
    a.parContrat.push({ type: r.contract_type ?? "Non précisé", nombre: Number(r.nombre) });
    m.set(r.company_id, a);
  }
  for (const a of m.values()) a.parContrat.sort((x, y) => y.nombre - x.nombre);
  return m;
}

export async function chargerListe() {
  const db = getSupabaseService();
  if (!db) return { ok: false as const, tablesAbsentes: false };
  const [companies, fiches, sites, unites, onss, ignores, delegues, affilies] = await Promise.all([
    db.from("companies").select(COLONNES_COMPANY),
    db.from("site_entreprises").select(COLONNES_ENTREPRISE),
    db.from("site_entreprise_sites").select("entreprise_id"),
    db.from("site_entreprise_unites").select("entreprise_id, localite, statut"),
    db.from("site_entreprise_onss").select(COLONNES_ONSS),
    db.from("site_ecarts_ignores").select("cible_id, valeur").eq("cible", "entreprise").eq("champ", "onss"),
    db.from("site_delegues").select("entreprise_id"),
    affiliesParCompany(),
  ]);
  const erreur = [companies, fiches, sites, unites, onss, ignores, delegues].find((r) => r.error)?.error;
  if (erreur) {
    console.error("[entreprises] liste :", erreur.code);
    return { ok: false as const, tablesAbsentes: estTableAbsente(erreur.code) };
  }
  const nbDelegues = new Map<string, number>();
  for (const d of (delegues.data ?? []) as { entreprise_id: string }[]) nbDelegues.set(d.entreprise_id, (nbDelegues.get(d.entreprise_id) ?? 0) + 1);
  const lignes: LigneListe[] = construireListe({
    companies: (companies.data ?? []) as CompanyCgLink[],
    fiches: (fiches.data ?? []) as Entreprise[],
    sites: (sites.data ?? []) as { entreprise_id: string }[],
    unites: (unites.data ?? []) as Pick<Unite, "entreprise_id" | "localite" | "statut">[],
    onss: (onss.data ?? []) as Onss[],
    ignores: (ignores.data ?? []) as { cible_id: string; valeur: string }[],
    affilies: new Map([...affilies].map(([k, v]) => [k, v.total])),
    delegues: nbDelegues,
  });
  const secteurs = [...new Set(lignes.map((l) => l.secteur).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b, "fr"));
  return { ok: true as const, lignes, secteurs };
}

export type Fiche = {
  cle: string;
  fiche: Entreprise | null;
  company: CompanyCgLink | null;
  sites: Site[];
  unites: Unite[];
  onss: Onss[];
  onssIgnores: string[];
  delegues: DelegueAffiche[];
  affilies: Affilies | null;
  companiesLibres: { id: string; name: string }[];
};

export async function chargerFiche(cle: string) {
  const c = lireCle(cle);
  const db = getSupabaseService();
  if (!c || !db) return { ok: false as const, raison: "introuvable" as const };

  const ficheQ = c.type === "fiche"
    ? await db.from("site_entreprises").select(COLONNES_ENTREPRISE).eq("id", c.id).maybeSingle()
    : await db.from("site_entreprises").select(COLONNES_ENTREPRISE).eq("company_id", c.id).maybeSingle();
  if (ficheQ.error) return { ok: false as const, raison: estTableAbsente(ficheQ.error.code) ? ("tables" as const) : ("erreur" as const) };
  const fiche = (ficheQ.data ?? null) as Entreprise | null;
  if (c.type === "fiche" && !fiche) return { ok: false as const, raison: "introuvable" as const };

  const companyId = fiche?.company_id ?? (c.type === "company" ? c.id : null);
  const companyQ = companyId ? await db.from("companies").select(COLONNES_COMPANY).eq("id", companyId).maybeSingle() : null;
  const company = (companyQ?.data ?? null) as CompanyCgLink | null;
  if (c.type === "company" && !company) return { ok: false as const, raison: "introuvable" as const };

  const id = fiche?.id ?? "00000000-0000-0000-0000-000000000000";
  const [sites, unites, onss, ignores, delegues, mandats, libres, affilies] = await Promise.all([
    db.from("site_entreprise_sites").select(COLONNES_SITE).eq("entreprise_id", id).order("principal", { ascending: false }).order("ordre").order("nom"),
    db.from("site_entreprise_unites").select(COLONNES_UNITE).eq("entreprise_id", id).order("statut").order("localite"),
    db.from("site_entreprise_onss").select(COLONNES_ONSS).eq("entreprise_id", id).order("numero"),
    db.from("site_ecarts_ignores").select("valeur").eq("cible", "entreprise").eq("cible_id", id).eq("champ", "onss"),
    db.from("site_delegues").select("id, prenom, nom, email, telephone").eq("entreprise_id", id).order("nom"),
    db.from("site_delegue_mandats").select("delegue_id, organe, qualite, libelle, fonction, site_id, fin"),
    fiche && !fiche.company_id ? db.from("companies").select("id, name").order("name") : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    company ? affiliesParCompany() : Promise.resolve(new Map<string, Affilies>()),
  ]);

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const mandatsEnCours = ((mandats.data ?? []) as (DelegueAffiche["mandats"][number] & { delegue_id: string; fin: string | null })[])
    .filter((m) => !m.fin || m.fin >= aujourdhui);
  const listeDelegues: DelegueAffiche[] = ((delegues.data ?? []) as Omit<DelegueAffiche, "mandats">[]).map((d) => ({
    ...d,
    mandats: mandatsEnCours.filter((m) => m.delegue_id === d.id).map(({ organe, qualite, libelle, fonction, site_id }) => ({ organe, qualite, libelle, fonction, site_id })),
  }));

  // Entreprises CG Link déjà reliées à une fiche : exclues du choix « Relier à CG Link ».
  let companiesLibres: { id: string; name: string }[] = [];
  if (fiche && !fiche.company_id) {
    const { data: reliees } = await db.from("site_entreprises").select("company_id").not("company_id", "is", null);
    const prises = new Set(((reliees ?? []) as { company_id: string }[]).map((r) => r.company_id));
    companiesLibres = ((libres.data ?? []) as { id: string; name: string }[]).filter((x) => !prises.has(x.id));
  }

  return {
    ok: true as const,
    fiche: {
      cle, fiche, company,
      sites: (sites.data ?? []) as Site[],
      unites: (unites.data ?? []) as Unite[],
      onss: (onss.data ?? []) as Onss[],
      onssIgnores: ((ignores.data ?? []) as { valeur: string }[]).map((i) => i.valeur),
      delegues: listeDelegues,
      affilies: company ? affilies.get(company.id) ?? { total: 0, parContrat: [] } : null,
      companiesLibres,
    } satisfies Fiche,
  };
}
