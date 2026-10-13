import { dateFrToIso } from "../dates";
import { ORGANES, type DelegueCgLink, type Mandat, type Organe, type Qualite } from "./types";

/** Règles des mandats (pures). */

export const LIBELLES_ORGANES: Record<Organe, string> = {
  ds: "DS", ce: "CE", cppt: "CPPT", cee: "CEE", instances_cg: "Instances CG", autre: "Autre",
};

export type MandatImport = { organe: Organe; qualite: Qualite | null; libelle: string | null; fonction: string | null; a_verifier: string | null };

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const FONCTIONS: [RegExp, string][] = [
  [/tresorier/, "Trésorier"], [/vice[- ]secretaire/, "Vice-secrétaire"], [/secretaire/, "Secrétaire"],
  [/vice[- ]president/, "Vice-président"], [/president/, "Président"],
];
const MOTS_SYNDICAUX = /delegu|mandat|sipp|conseill|cppt|\bds\b|\bce\b|europ|cee|comit|executif|verificat|bureau|regional|permanent|secretaire|tresorier|president/;

function fonctionDe(t: string): string | null {
  return FONCTIONS.find(([re]) => re.test(t))?.[1] ?? null;
}
function qualiteDe(t: string): Qualite | null {
  if (/suppl/.test(t)) return "suppleant";
  if (/effectif/.test(t)) return "effectif";
  return null;
}

/** Texte libre « Autre » de CG Link → mandat structuré, ou rejeté (numéro, prénom, lettre isolée). */
export function classerAutre(texte: string): { rejete: true } | { rejete: false; mandat: MandatImport } {
  const brut = texte.replace(/\s+/g, " ").trim();
  const t = sansAccents(brut.toLowerCase());
  const note = `Repris de « Autre » dans CG Link : "${brut}"`;
  if ((t.match(/[a-z]/g) ?? []).length < 3) return { rejete: true };
  if (/europ|\bcee\b/.test(t)) {
    return { rejete: false, mandat: { organe: "cee", qualite: qualiteDe(t), libelle: null, fonction: fonctionDe(t), a_verifier: note } };
  }
  if (/comit|ex[eé]cutif|ececutif|verificat|bureau des femmes|regional/.test(t)) {
    return { rejete: false, mandat: { organe: "instances_cg", qualite: null, libelle: brut, fonction: null, a_verifier: note } };
  }
  if (/\bce\b/.test(t)) {
    return { rejete: false, mandat: { organe: "ce", qualite: qualiteDe(t) ?? "effectif", libelle: null, fonction: fonctionDe(t), a_verifier: note } };
  }
  if (!MOTS_SYNDICAUX.test(t) && brut === brut.toLowerCase()) return { rejete: true };
  return { rejete: false, mandat: { organe: "autre", qualite: null, libelle: brut, fonction: null, a_verifier: note } };
}

function qualiteCgLink(v: string | null | undefined): Qualite | null {
  const t = sansAccents((v ?? "").trim().toLowerCase());
  if (t === "effectif") return "effectif";
  if (t.startsWith("suppl")) return "suppleant";
  return null;
}

export function importerMandats(d: DelegueCgLink): { mandats: MandatImport[]; rejetes: string[] } {
  const mandats: MandatImport[] = [];
  for (const [organe, valeur] of [["ds", d.mandateDs], ["ce", d.mandateCe], ["cppt", d.mandateCppt]] as const) {
    const qualite = qualiteCgLink(valeur);
    if (qualite) mandats.push({ organe, qualite, libelle: null, fonction: null, a_verifier: null });
  }
  const rejetes: string[] = [];
  const autre = (d.mandateOther ?? "").trim();
  if (autre) {
    const c = classerAutre(autre);
    if (c.rejete) rejetes.push(autre);
    else {
      const ce = c.mandat.organe === "ce" ? mandats.find((m) => m.organe === "ce") : undefined;
      if (ce) {
        ce.fonction = c.mandat.fonction;
        ce.a_verifier = c.mandat.a_verifier;
      } else mandats.push(c.mandat);
    }
  }
  return { mandats, rejetes };
}

export function libelleMandat(m: Pick<Mandat, "organe" | "qualite" | "libelle" | "fonction">): string {
  const q = m.qualite === "effectif" ? " eff." : m.qualite === "suppleant" ? " supp." : "";
  const base = (m.organe === "autre" || m.organe === "instances_cg") && m.libelle ? m.libelle : `${LIBELLES_ORGANES[m.organe]}${q}`;
  return m.fonction ? `${base} (${m.fonction})` : base;
}

export function mandatEnCours(m: Pick<Mandat, "fin">, aujourdhui: string): boolean {
  return !m.fin || m.fin >= aujourdhui;
}

const texte = (v: string | undefined) => (v ?? "").trim() || null;

export function validerMandat(champs: Record<string, string>):
  | { ok: true; valeurs: Omit<Mandat, "id" | "delegue_id" | "a_verifier"> }
  | { ok: false; erreur: string } {
  const organe = champs.organe as Organe;
  if (!(ORGANES as readonly string[]).includes(organe)) return { ok: false, erreur: "Choisissez un organe." };
  const qualite = texte(champs.qualite);
  if (qualite !== null && qualite !== "effectif" && qualite !== "suppleant") return { ok: false, erreur: "Qualité inconnue." };
  if (["ds", "ce", "cppt"].includes(organe) && !qualite) return { ok: false, erreur: "Choisissez effectif ou suppléant." };
  const libelle = texte(champs.libelle);
  if ((organe === "autre" || organe === "instances_cg") && !libelle) return { ok: false, erreur: "Précisez le mandat (libellé)." };
  const dates: Record<"debut" | "fin", string | null> = { debut: null, fin: null };
  for (const k of ["debut", "fin"] as const) {
    const v = texte(champs[k]);
    if (!v) continue;
    const iso = dateFrToIso(v);
    if (!iso) return { ok: false, erreur: "Date invalide. Format attendu : jj/mm/aaaa" };
    dates[k] = iso;
  }
  if (dates.debut && dates.fin && dates.fin < dates.debut) return { ok: false, erreur: "La fin du mandat ne peut pas précéder son début." };
  return {
    ok: true,
    valeurs: { organe, qualite: qualite as Qualite | null, libelle, fonction: texte(champs.fonction), site_id: texte(champs.site_id), debut: dates.debut, fin: dates.fin },
  };
}

export function siteParDefaut(
  uniteId: string | null,
  unites: { id: string; site_id: string | null }[],
  sites: { id: string; principal: boolean }[]
): string | null {
  const siteUnite = uniteId ? unites.find((u) => u.id === uniteId)?.site_id : null;
  if (siteUnite && sites.some((s) => s.id === siteUnite)) return siteUnite;
  return sites.find((s) => s.principal)?.id ?? null;
}

/** Site d'un mandat (ajout et modification) : le site choisi s'il appartient à l'entreprise, sinon le site par défaut. */
export function siteDuMandat(
  choisi: string | null,
  uniteId: string | null,
  unites: { id: string; site_id: string | null }[],
  sites: { id: string; principal: boolean }[]
): { ok: true; site_id: string | null } | { ok: false; erreur: string } {
  if (!choisi) return { ok: true, site_id: siteParDefaut(uniteId, unites, sites) };
  if (!sites.some((s) => s.id === choisi)) return { ok: false, erreur: "Ce site n'appartient pas à l'entreprise du délégué." };
  return { ok: true, site_id: choisi };
}
