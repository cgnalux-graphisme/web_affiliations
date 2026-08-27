import type { DateISO } from "./types";

function parseISO(date: DateISO): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

/**
 * Nombre de mois entiers écoulés entre deux dates ISO (AAAA-MM-JJ).
 *
 * Convention jour-du-mois : un mois n'est décompté que si le jour de `finISO`
 * a atteint ou dépassé le jour de `debutISO` (comparaison numérique brute des
 * jours, sans tenir compte de la longueur réelle des mois traversés). En
 * particulier :
 * - Si `fin.d < debut.d`, le mois en cours ne compte pas encore, même quand
 *   `debut.d` (29, 30 ou 31) n'existe pas dans le mois de `finISO` (ex. départ
 *   embauché le 31 janvier : le mois se termine le 29 février dans une année
 *   bissextile, ce qui compte comme "jour non atteint" puisque 29 < 31).
 * - Une date anniversaire tombant un 29 février qui retombe l'année suivante
 *   un 28 février (année non bissextile) est traitée de la même façon : le
 *   mois n'est pas encore décompté (28 < 29).
 * Cette convention est délibérée et non vérifiée indépendamment sur des cas
 * 29/30/31 du classeur ACCG source ; elle reste cohérente et documentée ici
 * pour que tout changement futur soit une décision consciente.
 *
 * Comportement si `finISO < debutISO` (arguments inversés) : la fonction
 * retourne `0` par conception (résultat négatif écrêté), et non une erreur.
 * Un appelant qui inverse les arguments par erreur obtiendra donc une
 * ancienneté de 0 mois plutôt qu'une exception — à garder en tête côté
 * appelant.
 */
export function moisEntre(debutISO: DateISO, finISO: DateISO): number {
  const debut = parseISO(debutISO);
  const fin = parseISO(finISO);

  let mois = (fin.y - debut.y) * 12 + (fin.m - debut.m);
  if (fin.d < debut.d) {
    mois -= 1;
  }
  return Math.max(0, mois);
}
