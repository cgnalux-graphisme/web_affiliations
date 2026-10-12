import type { Entreprise, Unite } from "../entreprises/types";
import type { EntiteBce, UniteBce } from "./analyse";

/** Différences entre la BCE et une fiche, et application des cases cochées. Pur, sans dépendance. */

export type Changement = { champ: string; libelle: string; avant: string | null; apres: string | null };
export type ComparaisonBce = {
  identite: Changement[];
  nouvelles: UniteBce[];
  modifiees: { id: string; numero_ue: string; changements: Changement[] }[];
  absentes: { id: string; numero_ue: string; adresse: string }[];
  inchangees: number;
};
export type ChoixBce = { identite: string[]; nouvelles: string[]; modifiees: string[] };

const CHAMPS_SIEGE: [keyof Entreprise, string, (b: EntiteBce) => string | null][] = [
  ["siege_rue", "Siège : rue", (b) => b.siege.rue],
  ["siege_numero", "Siège : numéro", (b) => b.siege.numero],
  ["siege_boite", "Siège : boîte", (b) => b.siege.boite],
  ["siege_code_postal", "Siège : code postal", (b) => b.siege.code_postal],
  ["siege_localite", "Siège : localité", (b) => b.siege.localite],
];

const CHAMPS_UNITE: [keyof UniteBce & keyof Unite, string][] = [
  ["denomination", "Dénomination"],
  ["rue", "Rue"],
  ["numero", "Numéro"],
  ["boite", "Boîte"],
  ["code_postal", "Code postal"],
  ["localite", "Localité"],
  ["statut", "Statut"],
  ["date_debut", "Date de début"],
];

const norm = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v).trim());

function adresseCourte(u: Unite): string {
  return [u.rue, u.numero, u.code_postal, u.localite].filter(Boolean).join(" ");
}

export function comparerBce(e: Entreprise, unites: Unite[], bce: { entite: EntiteBce; unites: UniteBce[] }): ComparaisonBce {
  const identite: Changement[] = [];
  const denomination = norm(bce.entite.denomination);
  if (denomination !== null && norm(e.denomination_bce) !== denomination) {
    identite.push({ champ: "denomination_bce", libelle: "Dénomination", avant: norm(e.denomination_bce), apres: denomination });
  }
  // Le siège se compare en bloc : si la BCE en donne un, tous ses champs le remplacent (une boîte ou un
  // numéro disparus sont effacés, jamais mélangés à la nouvelle adresse).
  const siegeBce = CHAMPS_SIEGE.map(([champ, libelle, lire]) => ({ champ, libelle, avant: norm(e[champ]), apres: norm(lire(bce.entite)) }));
  if (siegeBce.some((x) => x.apres !== null)) {
    identite.push(...siegeBce.filter((x) => x.avant !== x.apres).map(({ champ, libelle, avant, apres }) => ({ champ, libelle, avant, apres })));
  }

  const parNumero = new Map(unites.filter((u) => u.numero_ue).map((u) => [u.numero_ue as string, u]));
  const vusBce = new Set(bce.unites.map((b) => b.numero_ue));
  const nouvelles: UniteBce[] = [];
  const modifiees: ComparaisonBce["modifiees"] = [];
  let inchangees = 0;

  for (const b of bce.unites) {
    const ici = parNumero.get(b.numero_ue);
    if (!ici) {
      nouvelles.push(b);
      continue;
    }
    const changements = CHAMPS_UNITE.flatMap(([champ, libelle]) => {
      const avant = norm(ici[champ]);
      const apres = norm(b[champ]);
      return avant !== apres ? [{ champ, libelle, avant, apres }] : [];
    });
    if (changements.length) modifiees.push({ id: ici.id, numero_ue: b.numero_ue, changements });
    else inchangees++;
  }

  const absentes = unites
    .filter((u) => u.origine === "bce" && u.statut === "actif" && u.numero_ue && !vusBce.has(u.numero_ue))
    .map((u) => ({ id: u.id, numero_ue: u.numero_ue as string, adresse: adresseCourte(u) }));

  return { identite, nouvelles, modifiees, absentes, inchangees };
}

export function aucunChangement(c: ComparaisonBce): boolean {
  return !c.identite.length && !c.nouvelles.length && !c.modifiees.length && !c.absentes.length;
}

export function choixParDefaut(c: ComparaisonBce): ChoixBce {
  return {
    identite: c.identite.map((x) => x.champ),
    nouvelles: c.nouvelles.map((x) => x.numero_ue),
    modifiees: c.modifiees.map((x) => x.numero_ue),
  };
}

export function majEntrepriseDepuisBce(c: ComparaisonBce, choix: ChoixBce): Partial<Entreprise> {
  const garder = new Set(choix.identite);
  return Object.fromEntries(c.identite.filter((x) => garder.has(x.champ)).map((x) => [x.champ, x.apres]));
}

export function majUnitesDepuisBce(
  c: ComparaisonBce,
  choix: ChoixBce,
  bce: UniteBce[]
): { inserer: UniteBce[]; modifier: { id: string; maj: Partial<Unite> }[] } {
  const nouvelles = new Set(choix.nouvelles);
  const modifiees = new Set(choix.modifiees);
  return {
    inserer: bce.filter((b) => nouvelles.has(b.numero_ue) && c.nouvelles.some((n) => n.numero_ue === b.numero_ue)),
    modifier: c.modifiees
      .filter((m) => modifiees.has(m.numero_ue))
      .map((m) => ({ id: m.id, maj: Object.fromEntries(m.changements.map((x) => [x.champ, x.apres])) as Partial<Unite> })),
  };
}
