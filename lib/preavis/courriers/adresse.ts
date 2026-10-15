/** Adresse structurée (module Bpost), partagée entre le formulaire et le rendu PDF. */
export interface Adresse {
  rue: string;
  numero: string;
  codePostal: string;
  ville: string;
  pays: string;
}

export const ADRESSE_VIDE: Adresse = { rue: "", numero: "", codePostal: "", ville: "", pays: "Belgique" };

export function adresseVide(a: Adresse): boolean {
  return !a.rue && !a.codePostal && !a.ville;
}

export function adresseComplete(a: Adresse): string {
  const ligne1 = [a.rue, a.numero].filter(Boolean).join(" ");
  const ligne2 = [a.codePostal, a.ville].filter(Boolean).join(" ");
  return [ligne1, ligne2, a.pays && a.pays !== "Belgique" ? a.pays : ""].filter(Boolean).join(", ");
}
