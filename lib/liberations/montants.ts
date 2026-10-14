/** Fiche de paiement des libérations : montants par date, totaux, affichage en euros. Pur (testé). */

export const COLONNES_MONTANT = [
  { cle: "salaire_brut", libelle: "Salaire brut et primes" },
  { cle: "deplacements", libelle: "Déplacements" },
  { cle: "indemnites", libelle: "Indemnités" },
  { cle: "petits_frais", libelle: "Petits frais" },
  { cle: "cheques_repas", libelle: "Chèques-repas (part patronale)" },
] as const;
export type CleMontant = (typeof COLONNES_MONTANT)[number]["cle"];
export type Montants = Record<CleMontant, number | null>;

/** « 125,50 » ou « 125.5 » → 125.5 ; vide → null ; invalide → undefined. Jusqu'à 99 999 999,99 €. */
export function lireMontant(v: string | null | undefined): number | null | undefined {
  const t = (v ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(t)) return undefined;
  return Number(t);
}

/** Montants saisis pour une date. Erreur : le nom de la colonne fautive. */
export function validerMontants(champs: Record<string, string>): { ok: true; valeurs: Montants } | { ok: false; erreur: string } {
  const valeurs = {} as Montants;
  for (const c of COLONNES_MONTANT) {
    const v = lireMontant(champs[c.cle]);
    if (v === undefined) return { ok: false, erreur: `${c.libelle} : montant invalide. Exemple : 125,50` };
    valeurs[c.cle] = v;
  }
  return { ok: true, valeurs };
}

/** Total d'une ligne, en centimes pour éviter les erreurs d'arrondi. */
export function totalLigne(m: Partial<Montants>): number {
  return COLONNES_MONTANT.reduce((s, c) => s + Math.round((m[c.cle] ?? 0) * 100), 0) / 100;
}

export function totalGeneral(lignes: Partial<Montants>[]): number {
  return lignes.reduce((s, l) => s + Math.round(totalLigne(l) * 100), 0) / 100;
}

/** 1234.5 → « 1 234,50 € » (espace insécable fine absente des polices PDF : espace simple). */
export function euros(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  const [entier, dec] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}${entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${dec} €`;
}

/** Montant affiché dans un champ de saisie : 125.5 → « 125,50 ». */
export function montantSaisie(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "";
  return Number(n).toFixed(2).replace(".", ",");
}
