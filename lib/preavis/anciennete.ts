import type { DateISO } from "./types";

function parseISO(date: DateISO): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

/** Nombre de mois entiers écoulés entre deux dates ISO (AAAA-MM-JJ). */
export function moisEntre(debutISO: DateISO, finISO: DateISO): number {
  const debut = parseISO(debutISO);
  const fin = parseISO(finISO);

  let mois = (fin.y - debut.y) * 12 + (fin.m - debut.m);
  if (fin.d < debut.d) {
    mois -= 1;
  }
  return Math.max(0, mois);
}
