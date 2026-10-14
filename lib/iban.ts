/** IBAN : nettoyage, contrôle (clé modulo 97) et affichage par groupes de 4. Pur, importable côté navigateur. */

/** « be68 5390-0754 7034 » → « BE68539007547034 ». */
export function nettoyerIban(v: string): string {
  return v.replace(/[\s.-]/g, "").toUpperCase();
}

/** Longueur par pays pour les pays voisins (les autres : 15 à 34 caractères). */
const LONGUEURS: Record<string, number> = { BE: 16, LU: 20, FR: 27, NL: 18, DE: 22 };

export function ibanValide(v: string): boolean {
  const iban = nettoyerIban(v);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const attendue = LONGUEURS[iban.slice(0, 2)];
  if (attendue && iban.length !== attendue) return false;
  // Les 4 premiers caractères vont à la fin, les lettres deviennent des nombres (A = 10 … Z = 35).
  const chiffres = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (l) => String(l.charCodeAt(0) - 55));
  let reste = 0;
  for (const c of chiffres) reste = (reste * 10 + Number(c)) % 97;
  return reste === 1;
}

/** « BE68539007547034 » → « BE68 5390 0754 7034 ». */
export function formaterIban(v: string): string {
  return nettoyerIban(v).replace(/(.{4})(?=.)/g, "$1 ");
}
