/**
 * Numéro d'entreprise BCE : 10 chiffres, commence par 0 ou 1, les 2 derniers = 97 - (8 premiers mod 97).
 * Le numéro d'une unité d'établissement : 10 chiffres commençant par 2 à 8.
 * Fichier pur (aucune dépendance) : utilisable côté navigateur.
 */

export function chiffres(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

export function normaliserNumeroBce(saisie: string): string | null {
  let n = chiffres(saisie);
  if (n.length === 9) n = `0${n}`;
  if (!/^[01]\d{9}$/.test(n)) return null;
  const cle = 97 - (Number(n.slice(0, 8)) % 97);
  return cle === Number(n.slice(8)) ? n : null;
}

export function formaterNumeroBce(n: string): string {
  return /^\d{10}$/.test(n) ? `${n.slice(0, 4)}.${n.slice(4, 7)}.${n.slice(7)}` : n;
}

export function formaterNumeroUe(n: string): string {
  return /^\d{10}$/.test(n) ? `${n.slice(0, 1)}.${n.slice(1, 4)}.${n.slice(4, 7)}.${n.slice(7)}` : n;
}
