/**
 * Périmètre d'un permanent : règles pures (aucune dépendance, importables partout).
 * Source : CG Link, companies.permanent_email = adresse de connexion du permanent (décision de Fred, 13/10/2026).
 */

const normaliser = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();

export function emailsEgaux(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normaliser(a);
  return x.length > 0 && x === normaliser(b);
}

/** Entreprises CG Link dont la personne est le permanent. */
export function companiesDuPermanent(companies: { id: string; permanent_email: string | null }[], email: string | null | undefined): Set<string> {
  return new Set(companies.filter((c) => emailsEgaux(c.permanent_email, email)).map((c) => c.id));
}

/** Fiches de l'Espace reliées à une de ces entreprises, ou qui en regroupent une (XLG HOME dans TRIXXO). */
export function fichesDuPerimetre(
  fiches: { id: string; company_id: string | null; autres_company_ids: string[] | null }[],
  companyIds: Set<string>
): Set<string> {
  return new Set(
    fiches
      .filter((f) => (f.company_id && companyIds.has(f.company_id)) || (f.autres_company_ids ?? []).some((id) => companyIds.has(id)))
      .map((f) => f.id)
  );
}

/**
 * Libellés de companies.sector (CG Link) → nom dans site_secteurs. Même table que la migration 20261013120000,
 * plus les secteurs créés le 13/10/2026 à la demande de Fred (Verre, papier, ALE, CP 100).
 */
const CORRESPONDANCE: Record<string, string> = {
  construction: "Construction",
  bois: "Bois / ameublement",
  chimie: "Chimie",
  eta: "Entreprises de travail adapté (ETA)",
  nettoyage: "Nettoyage",
  gardiennage: "Gardiennage / sécurité",
  "titres-services": "Titres-services",
  carrière: "Carrières & matériaux",
  carrières: "Carrières & matériaux",
  verre: "Verre",
  "production du papier": "Production du papier",
  "transformation papier": "Transformation du papier",
  "transformation du papier": "Transformation du papier",
  ale: "Agences locales pour l'emploi (ALE)",
  cp100: "CP 100 (auxiliaire ouvriers)",
  "cp 100": "CP 100 (auxiliaire ouvriers)",
};

export function secteurDepuisCgLink(libelle: string | null | undefined, secteurs: { id: string; nom: string }[]): string | null {
  const nom = CORRESPONDANCE[normaliser(libelle)];
  return (nom && secteurs.find((s) => s.nom === nom)?.id) || null;
}
