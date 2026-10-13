/** Découpage du nom unique de CG Link (« Prénom Nom ») en prénom et nom. Pur. */

export type NomDecoupe = { prenom: string | null; nom: string; aVerifier: string | null };
export const A_VERIFIER_NOM = "Découpage prénom / nom à confirmer";

const MAJUSCULES = /^[A-ZÀ-ÖØ-Ý'’-]{2,}$/;

export function decouperNom(brut: string | null | undefined): NomDecoupe {
  const mots = (brut ?? "").trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return { prenom: null, nom: "Sans nom", aVerifier: "Nom absent dans CG Link" };
  if (mots.length === 1) return { prenom: null, nom: mots[0], aVerifier: A_VERIFIER_NOM };
  const aVerifier = mots.length === 2 ? null : A_VERIFIER_NOM;
  const enMajuscules = mots.filter((m) => MAJUSCULES.test(m));
  if (enMajuscules.length > 0 && enMajuscules.length < mots.length) {
    return { prenom: mots.filter((m) => !MAJUSCULES.test(m)).join(" "), nom: enMajuscules.join(" "), aVerifier };
  }
  return { prenom: mots[0], nom: mots.slice(1).join(" "), aVerifier };
}
