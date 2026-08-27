/**
 * Conversion d'un nombre entier (0-999) en toutes lettres, orthographe
 * belge (septante/nonante, comme utilisé en Belgique francophone — et donc
 * dans les courriers de la Centrale Générale FGTB), avec accord au féminin
 * optionnel (ex. "une semaine" plutôt que "un").
 */

const UNITES = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];

const DIZAINES: Record<number, string> = {
  2: "vingt",
  3: "trente",
  4: "quarante",
  5: "cinquante",
  6: "soixante",
  7: "septante",
  8: "quatre-vingt",
  9: "nonante",
};

function unSiFeminin(feminin: boolean): string {
  return feminin ? "une" : "un";
}

export function nombreEnLettresFr(n: number, options: { feminin?: boolean } = {}): string {
  const feminin = options.feminin ?? false;
  if (!Number.isInteger(n) || n < 0 || n > 999) {
    throw new Error(`nombreEnLettresFr ne prend en charge que les entiers de 0 à 999 (reçu : ${n})`);
  }

  if (n < 20) {
    return n === 1 ? unSiFeminin(feminin) : UNITES[n];
  }

  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    const base = DIZAINES[d];
    if (u === 0) {
      return d === 8 ? `${base}s` : base; // quatre-vingts
    }
    if (u === 1) {
      return d === 8 ? `${base}-${unSiFeminin(feminin)}` : `${base} et ${unSiFeminin(feminin)}`;
    }
    return `${base}-${UNITES[u]}`;
  }

  const c = Math.floor(n / 100);
  const reste = n % 100;
  const centaine = c === 1 ? "cent" : `${UNITES[c]} cent${reste === 0 ? "s" : ""}`;
  if (reste === 0) return centaine;
  return `${centaine} ${nombreEnLettresFr(reste, { feminin })}`;
}
