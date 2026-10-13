import { formaterTelephone } from "../telephone";
import { decouperNom } from "./noms";
import { importerMandats, type MandatImport } from "./mandats";
import type { DelegueCgLink } from "./types";

/** Plan d'import des délégués de CG Link (pur) : qui créer, dans quelle fiche, avec quels mandats. */

export const DEBUT_MANDATS_IMPORTES = "2024-05-13"; // premier jour des élections sociales 2024

export type CompanyImport = { id: string; name: string; delegates: DelegueCgLink[] };
export type FicheImport = { id: string; company_id: string | null; autres_company_ids: string[]; site_principal_id: string | null };
export type DelegueACreer = {
  entreprise_id: string; cglink_user_id: string; prenom: string | null; nom: string; email: string | null;
  telephone: string | null; a_verifier: string | null; mandats: (MandatImport & { site_id: string | null; debut: string })[];
};
export type PlanImport = { delegues: DelegueACreer[]; dejaPresents: number; rejetes: { entreprise: string; texte: string }[]; sansFiche: string[] };

export function planImport(e: {
  companies: CompanyImport[];
  fiches: FicheImport[];
  dejaImportes: Set<string>;
  companyDuProfil: Map<string, string>;
}): PlanImport {
  const ficheDe = (companyId: string) =>
    e.fiches.find((f) => f.company_id === companyId) ?? e.fiches.find((f) => f.autres_company_ids.includes(companyId));

  // Un délégué (même identifiant de compte) peut figurer dans plusieurs entreprises.
  const occurrences = new Map<string, { company: CompanyImport; d: DelegueCgLink }[]>();
  for (const c of e.companies) for (const d of c.delegates ?? []) {
    if (!d?.id) continue;
    occurrences.set(d.id, [...(occurrences.get(d.id) ?? []), { company: c, d }]);
  }

  const plan: PlanImport = { delegues: [], dejaPresents: 0, rejetes: [], sansFiche: [] };
  const sansFiche = new Set<string>();
  for (const [id, occ] of occurrences) {
    if (e.dejaImportes.has(id)) {
      plan.dejaPresents++;
      continue;
    }
    const choisie = occ.find((o) => o.company.id === e.companyDuProfil.get(id)) ?? occ[0];
    const fiche = ficheDe(choisie.company.id);
    if (!fiche) {
      sansFiche.add(choisie.company.name);
      continue;
    }
    const nom = decouperNom(choisie.d.name);
    const { mandats, rejetes } = importerMandats(choisie.d);
    for (const texte of rejetes) plan.rejetes.push({ entreprise: choisie.company.name, texte });
    const autres = occ.filter((o) => o !== choisie).map((o) => o.company.name);
    const notes = [nom.aVerifier, autres.length ? `Aussi listé chez ${autres.join(", ")} dans CG Link` : null].filter(Boolean);
    plan.delegues.push({
      entreprise_id: fiche.id,
      cglink_user_id: id,
      prenom: nom.prenom,
      nom: nom.nom,
      email: choisie.d.email?.trim().toLowerCase() || null,
      telephone: formaterTelephone(choisie.d.phone) || null,
      a_verifier: notes.length ? notes.join(" ; ") : null,
      mandats: mandats.map((m) => ({ ...m, site_id: fiche.site_principal_id, debut: DEBUT_MANDATS_IMPORTES })),
    });
  }
  plan.sansFiche = [...sansFiche];
  return plan;
}

/**
 * Import d'un délégué et de ses mandats, tout ou rien : si les mandats ne passent pas, le délégué créé est
 * supprimé, pour qu'un nouvel import le reprenne entièrement (sinon il serait vu « déjà importé », sans mandats).
 */
export async function importerUnDelegue(
  d: DelegueACreer,
  ops: {
    insererDelegue: (delegue: Omit<DelegueACreer, "mandats">) => Promise<{ id: string | null } | "erreur">;
    insererMandats: (delegueId: string, mandats: DelegueACreer["mandats"]) => Promise<boolean>;
    supprimerDelegue: (delegueId: string) => Promise<void>;
  }
): Promise<"cree" | "deja" | "erreur"> {
  const { mandats, ...delegue } = d;
  const r = await ops.insererDelegue(delegue);
  if (r === "erreur") return "erreur";
  if (!r.id) return "deja";
  if (mandats.length && !(await ops.insererMandats(r.id, mandats))) {
    await ops.supprimerDelegue(r.id);
    return "erreur";
  }
  return "cree";
}
