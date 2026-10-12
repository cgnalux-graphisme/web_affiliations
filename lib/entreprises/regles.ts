import { chiffres } from "../bce/numero";
import type { CompanyCgLink, Entreprise, Onss, Site, Unite } from "./types";

/** Règles pures de l'app Entreprises (aucune dépendance serveur : importables côté navigateur). */

export const REF_DEFAUT = "Service Ressources Humaines";
export type BlocAdresse = { lignes: string[]; incomplet: boolean };

export function nomAffiche(e: Pick<Entreprise, "nom"> | null, company: Pick<CompanyCgLink, "name"> | null): string {
  return e?.nom?.trim() || company?.name?.trim() || "Sans nom";
}

type AdresseLignes = { rue: string | null; numero: string | null; boite: string | null; code_postal: string | null; localite: string | null };

function lignesAdresse(a: AdresseLignes): { lignes: string[]; incomplet: boolean } {
  // Sans rue, pas de ligne de rue (jamais un numéro ou une boîte isolés).
  const rue = a.rue ? `${[a.rue, a.numero].filter(Boolean).join(" ")}${a.boite ? ` bte ${a.boite}` : ""}` : "";
  const ville = [a.code_postal, a.localite].filter(Boolean).join(" ");
  return {
    lignes: [rue, ville].filter(Boolean),
    incomplet: !a.rue || !a.code_postal || !a.localite,
  };
}

export function blocAdresse(e: Entreprise, nomCgLink: string | null, site?: Site | null, unites: Unite[] = []): BlocAdresse {
  const ref = site?.ref_nom?.trim() ? site : e;
  const nomRef = ref.ref_nom?.trim();
  const tete = [`À l'attention de ${nomRef || REF_DEFAUT}`];
  if (nomRef && ref.ref_fonction?.trim()) tete.push(ref.ref_fonction.trim());
  const nom = e.denomination_bce?.trim() || e.nom?.trim() || nomCgLink?.trim();
  if (nom) tete.push(nom);

  const postale = site?.unite_postale_id ? unites.find((u) => u.id === site.unite_postale_id) : undefined;
  const adr = postale
    ? lignesAdresse(postale)
    : lignesAdresse({ rue: e.siege_rue, numero: e.siege_numero, boite: e.siege_boite, code_postal: e.siege_code_postal, localite: e.siege_localite });
  return { lignes: [...tete, ...adr.lignes], incomplet: adr.incomplet || !nom };
}

export function onssDeCompany(c: CompanyCgLink): { numero: string; libelle: string | null }[] {
  const brut: [string | null, string | null][] = [
    [c.onss, null], [c.onss2, c.onss2_label], [c.onss3, c.onss3_label], [c.onss4, c.onss4_label],
  ];
  const vus = new Set<string>();
  return brut.flatMap(([n, l]) => {
    const numero = chiffres(n);
    if (!numero || vus.has(numero)) return [];
    vus.add(numero);
    return [{ numero, libelle: l?.trim() || null }];
  });
}

export function onssACreer(cglink: { numero: string; libelle: string | null }[], existants: Pick<Onss, "numero">[]) {
  const deja = new Set(existants.map((o) => o.numero));
  return cglink.filter((o) => !deja.has(o.numero));
}

export type EcartsOnss = { manquantsIci: { numero: string; libelle: string | null }[]; absentsCgLink: Onss[] };

export function ecartsOnss(cglink: { numero: string; libelle: string | null }[], ici: Onss[], ignores: string[]): EcartsOnss {
  const ign = new Set(ignores);
  const numerosCg = new Set(cglink.map((o) => o.numero));
  return {
    manquantsIci: onssACreer(cglink, ici).filter((o) => !ign.has(o.numero)),
    absentsCgLink: cglink.length ? ici.filter((o) => !numerosCg.has(o.numero) && !ign.has(o.numero)) : [],
  };
}

export type Cle = { type: "fiche"; id: string } | { type: "company"; id: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lireCle(cle: string): Cle | null {
  if (cle.startsWith("c-") && UUID.test(cle.slice(2))) return { type: "company", id: cle.slice(2) };
  return UUID.test(cle) ? { type: "fiche", id: cle } : null;
}

export function cleDe(ficheId: string | null, companyId: string | null): string {
  return ficheId ?? `c-${companyId}`;
}

export function planSuppressionSite(site: Site, principal: Site | undefined) {
  if (site.principal) return { ok: false as const, erreur: "Le site principal ne peut pas être supprimé." };
  if (!principal) return { ok: false as const, erreur: "Aucun site principal : rechargez la page." };
  return { ok: true as const, versSite: principal.id };
}

export type LigneListe = {
  cle: string; nom: string; denomination: string | null; secteur: string | null; numeroBce: string | null;
  localites: string[]; onss: string[]; affilies: number; sites: number; delegues: number;
  horsCgLink: boolean; bceManquant: boolean; ecartsOnss: boolean;
};

export function construireListe(entrees: {
  companies: CompanyCgLink[];
  fiches: Entreprise[];
  sites: Pick<Site, "entreprise_id">[];
  unites: Pick<Unite, "entreprise_id" | "localite" | "statut">[];
  onss: Onss[];
  ignores: { cible_id: string; valeur: string }[];
  affilies: Map<string, number>;
  delegues: Map<string, number>;
}): LigneListe[] {
  const ficheDeCompany = new Map(entrees.fiches.filter((f) => f.company_id).map((f) => [f.company_id as string, f]));
  const compte = <T,>(l: T[], cle: (x: T) => string) => l.reduce((m, x) => m.set(cle(x), (m.get(cle(x)) ?? 0) + 1), new Map<string, number>());
  const nbSites = compte(entrees.sites, (s) => s.entreprise_id);

  function ligne(f: Entreprise | undefined, c: CompanyCgLink | undefined): LigneListe {
    const onssIci = f ? entrees.onss.filter((o) => o.entreprise_id === f.id) : [];
    const ign = f ? entrees.ignores.filter((i) => i.cible_id === f.id).map((i) => i.valeur) : [];
    const onssCg = c ? onssDeCompany(c) : [];
    const e = f && c ? ecartsOnss(onssCg, onssIci, ign) : null;
    const localites = f
      ? [...new Set(entrees.unites.filter((u) => u.entreprise_id === f.id && u.statut === "actif" && u.localite).map((u) => u.localite as string))]
      : [];
    return {
      cle: cleDe(f?.id ?? null, c?.id ?? null),
      nom: nomAffiche(f ?? null, c ?? null),
      denomination: f?.denomination_bce ?? null,
      secteur: c?.sector ?? null,
      numeroBce: f?.numero_bce ?? null,
      localites,
      onss: f ? onssIci.map((o) => o.numero) : onssCg.map((o) => o.numero),
      affilies: c ? entrees.affilies.get(c.id) ?? 0 : 0,
      sites: f ? nbSites.get(f.id) ?? 0 : 0,
      delegues: f ? entrees.delegues.get(f.id) ?? 0 : 0,
      horsCgLink: !c,
      bceManquant: !f?.numero_bce,
      ecartsOnss: Boolean(e && (e.manquantsIci.length || e.absentsCgLink.length)),
    };
  }

  const lignes = [
    ...entrees.companies.map((c) => ligne(ficheDeCompany.get(c.id), c)),
    ...entrees.fiches.filter((f) => !f.company_id).map((f) => ligne(f, undefined)),
  ];
  return lignes.sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
}

function sansAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function correspond(l: LigneListe, recherche: string): boolean {
  const q = sansAccents(recherche.trim());
  if (!q) return true;
  const qChiffres = chiffres(q);
  const textes = [l.nom, l.denomination ?? "", l.secteur ?? "", ...l.localites].map(sansAccents);
  if (textes.some((t) => t.includes(q))) return true;
  return qChiffres.length >= 3 && [l.numeroBce ?? "", ...l.onss].some((n) => n.includes(qChiffres));
}
