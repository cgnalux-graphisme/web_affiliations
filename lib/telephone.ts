/**
 * Numéro de téléphone au format affiché dans l'Espace CG : +32 (0) 470 12 34 56 (GSM), +32 (0) 81 64 99 63
 * (fixe, zone de 2 chiffres), +32 (0) 2 511 11 11 (zones 2, 3, 4, 9), +352 621 123 456, +33 (0) 6 12 34 56 78.
 * Accepte toutes les saisies courantes (0470/12.34.56, 0032…, numéros bruts de CG Link « 32470… »).
 * Ce qui n'est pas reconnu est laissé tel quel. Pur : utilisable partout.
 */

function paquets(s: string, n: number): string {
  return s.match(new RegExp(`.{1,${n}}`, "g"))?.join(" ") ?? s;
}

export function formaterTelephone(saisie: string | null | undefined): string {
  const brut = (saisie ?? "").trim();
  if (!brut) return "";
  let d = brut.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (!brut.startsWith("+")) {
    if (/^0\d{8,9}$/.test(d)) d = `32${d.slice(1)}`; // numéro belge national
    else if (!/^32\d{8,9}$/.test(d)) return brut; // ni national, ni indicatif belge sans « + »
  }

  if (d.startsWith("32")) {
    let n = d.slice(2);
    if (n.startsWith("0")) n = n.slice(1); // le « (0) » éventuellement saisi
    if (/^4\d{8}$/.test(n)) return `+32 (0) ${n.slice(0, 3)} ${paquets(n.slice(3), 2)}`;
    if (/^[2349]\d{7}$/.test(n)) return `+32 (0) ${n[0]} ${n.slice(1, 4)} ${paquets(n.slice(4), 2)}`;
    if (/^\d{8}$/.test(n)) return `+32 (0) ${n.slice(0, 2)} ${paquets(n.slice(2), 2)}`;
    return brut;
  }
  if (d.startsWith("352")) return `+352 ${paquets(d.slice(3), 3)}`;
  if (d.startsWith("33")) {
    let n = d.slice(2);
    if (n.startsWith("0")) n = n.slice(1);
    return /^\d{9}$/.test(n) ? `+33 (0) ${n[0]} ${paquets(n.slice(1), 2)}` : brut;
  }
  return d.length >= 8 ? `+${d.slice(0, 2)} ${paquets(d.slice(2), 2)}` : brut;
}
