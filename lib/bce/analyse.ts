/**
 * Lecture des pages publiques de la BCE (kbopub), en français. Fichier pur, sans dépendance :
 * expressions régulières sur le HTML (la structure est stable : tableaux à classes QL / RL, displaytag).
 * Si la BCE change sa page, les fonctions renvoient null et l'écran propose la saisie manuelle.
 */

export type Adresse = {
  rue: string | null;
  numero: string | null;
  boite: string | null;
  code_postal: string | null;
  localite: string | null;
};
export type EntiteBce = { denomination: string | null; siege: Adresse };
export type UniteBce = Adresse & {
  numero_ue: string;
  statut: "actif" | "arrete";
  date_debut: string | null;
  denomination: string | null;
};

const MOIS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

const SEP = "\u0001"; // séparateur interne : remplace &nbsp; pour garder la frontière rue / numéro / boîte

function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function decoder(s: string): string {
  return s
    .replace(/&nbsp;| /g, SEP)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** Texte lisible : balises retirées, séparateurs et blancs ramenés à un espace. */
function texte(html: string): string {
  return decoder(html.replace(/<[^>]*>/g, " ")).replace(new RegExp(SEP, "g"), " ").replace(/\s+/g, " ").trim();
}

export function dateTexteVersIso(t: string): string | null {
  const m = sansAccents(t.toLowerCase()).match(/(\d{1,2})(?:er)?\s+([a-z]+)\s+(\d{4})/);
  if (!m) return null;
  const j = Number(m[1]);
  const mo = MOIS[m[2]];
  const a = Number(m[3]);
  if (!mo) return null;
  const d = new Date(Date.UTC(a, mo - 1, j));
  if (d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) return null;
  return `${a}-${String(mo).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

function vide(s: string | undefined | null): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t && t !== "." ? t : null;
}

/**
 * Cellule d'adresse : « <rue>&nbsp;<n°>[&nbsp;Boîte&nbsp;<b>]<br/><CP>&nbsp;<localité>[<br/>Depuis le …] ».
 * La localité est parfois collée devant la rue (« Libramont,Rue … ») : retirée si la localité de l'adresse
 * commence par ce mot.
 */
export function analyserAdresse(celluleHtml: string): Adresse {
  const lignes = decoder(celluleHtml.replace(/<span[^>]*class="upd"[^>]*>[\s\S]*?<\/span>/g, ""))
    .split(/<br\s*\/?>/i)
    .map((l) => l.replace(/<[^>]*>/g, "").trim())
    .filter((l) => l && !/^depuis le/i.test(l.replace(new RegExp(SEP, "g"), " ").trim()));

  const morceaux = (lignes[0] ?? "").split(SEP).map((m) => m.replace(/\s+/g, " ").trim()).filter(Boolean);
  const iBoite = morceaux.findIndex((m) => /^bo[iî]te$/i.test(m));
  const boite = iBoite >= 0 ? vide(morceaux[iBoite + 1]) : null;
  const avantBoite = iBoite >= 0 ? morceaux.slice(0, iBoite) : morceaux;
  let rue = vide(avantBoite[0]);
  const numero = vide(avantBoite.slice(1).join(" "));

  const ville = (lignes[1] ?? "").split(SEP).map((m) => m.replace(/\s+/g, " ").trim()).filter(Boolean);
  const code_postal = vide(ville[0]);
  const localite = vide(ville.slice(1).join(" "));

  const collee = rue?.match(/^([^,]+),\s*(.+)$/);
  if (collee && localite && sansAccents(localite.toLowerCase()).startsWith(sansAccents(collee[1].trim().toLowerCase()))) {
    rue = collee[2].trim();
  }
  return { rue, numero, boite, code_postal, localite };
}

function cellule(html: string, libelle: string): string | null {
  const re = new RegExp(`${libelle}\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>`, "i");
  return html.match(re)?.[1] ?? null;
}

export function analyserEntite(html: string): EntiteBce | "inconnu" | null {
  // L'apostrophe peut être brute, typographique ou encodée (&#39;).
  if (/n(?:'|’|&#39;)existe pas dans la BCE|Pas de données d(?:'|’|&#39;)entité trouvées/i.test(html)) return "inconnu";
  const denom = cellule(html, "Dénomination:");
  const siege = cellule(html, "Adresse du siège:");
  if (denom === null && siege === null) return null;
  return {
    denomination: denom ? vide(texte(denom.split(/<br\s*\/?>/i)[0])) : null,
    siege: siege ? analyserAdresse(siege) : { rue: null, numero: null, boite: null, code_postal: null, localite: null },
  };
}

export function analyserUnites(html: string): { unites: UniteBce[]; total: number; parPage: number } | null {
  const banniere = html.match(/(\d+)\s+unités? d(?:'|’|&#39;)établissement trouvées?(?:,\s*affichage de\s*(\d+)\s*à\s*(\d+))?/i);
  const corps = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!banniere || !corps) return null;
  const total = Number(banniere[1]);
  const parPage = banniere[2] ? Number(banniere[3]) - Number(banniere[2]) + 1 : total;

  const unites: UniteBce[] = [];
  for (const ligne of corps[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cases = [...ligne[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (cases.length < 6) continue;
    const numero_ue = texte(cases[2]).replace(/\D/g, "");
    if (!/^\d{10}$/.test(numero_ue)) continue;
    unites.push({
      numero_ue,
      statut: /^actif/i.test(texte(cases[1])) ? "actif" : "arrete",
      date_debut: dateTexteVersIso(texte(cases[3])),
      denomination: vide(texte(cases[4])),
      ...analyserAdresse(cases[5]),
    });
  }
  return { unites, total, parPage: parPage > 0 ? parPage : 20 };
}
