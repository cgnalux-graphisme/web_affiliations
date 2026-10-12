import { analyserEntite, analyserUnites, type EntiteBce, type UniteBce } from "./analyse";

/**
 * Lecture de la BCE publique (kbopub). SERVEUR UNIQUEMENT (appelé par les actions serveur de l'app
 * Entreprises, après vérification du droit). Une page à la fois, 15 s maximum par page, 20 pages au plus.
 */

const BASE = "https://kbopub.economie.fgov.be/kbopub";
const DELAI_MS = 15_000;
const PAGES_MAX = 20;

export const ERREUR_BCE_INJOIGNABLE =
  "La BCE n'a pas répondu. Réessayez plus tard ou encodez les données à la main.";
export const ERREUR_BCE_INCONNU = "Ce numéro n'existe pas à la BCE. Vérifiez le numéro d'entreprise.";
export const ERREUR_BCE_PAGE =
  "La page de la BCE a changé et n'a pas pu être lue. Encodez les données à la main.";

export type ResultatBce = { ok: true; entite: EntiteBce; unites: UniteBce[] } | { ok: false; erreur: string };

async function page(url: string, f: typeof fetch): Promise<string | null> {
  try {
    const r = await f(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Espace CG ACCG Nalux)", "Accept-Language": "fr" },
      signal: AbortSignal.timeout(DELAI_MS),
      cache: "no-store",
    });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

export async function lireBce(numero: string, f: typeof fetch = fetch): Promise<ResultatBce> {
  const html = await page(`${BASE}/zoeknummerform.html?nummer=${numero}&actionLu=Zoek&lang=fr`, f);
  if (html === null) return { ok: false, erreur: ERREUR_BCE_INJOIGNABLE };
  const entite = analyserEntite(html);
  if (entite === "inconnu") return { ok: false, erreur: ERREUR_BCE_INCONNU };
  if (entite === null) return { ok: false, erreur: ERREUR_BCE_PAGE };

  const sansZero = numero.replace(/^0/, "");
  const unites: UniteBce[] = [];
  for (let p = 1; p <= PAGES_MAX; p++) {
    const suffixe = p > 1 ? `&page=${p}` : "";
    const liste = await page(`${BASE}/vestiginglijst.html?ondernemingsnummer=${sansZero}&lang=fr${suffixe}`, f);
    if (liste === null) return { ok: false, erreur: ERREUR_BCE_INJOIGNABLE };
    const r = analyserUnites(liste);
    if (r === null) {
      // Une entreprise sans unité n'a pas de tableau : page 1 sans bannière = 0 unité.
      if (p === 1 && /0 unité|Aucune unité/i.test(liste)) break;
      return { ok: false, erreur: ERREUR_BCE_PAGE };
    }
    unites.push(...r.unites);
    if (unites.length >= r.total || r.unites.length === 0) break;
  }
  return { ok: true, entite, unites };
}
