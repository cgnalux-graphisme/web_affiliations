import { analyserEntite, analyserUnites, type EntiteBce, type UniteBce } from "./analyse";
import { ERREUR_BCE_INCOMPLET, ERREUR_BCE_INCONNU, ERREUR_BCE_INJOIGNABLE, ERREUR_BCE_PAGE } from "./messages";

export { ERREUR_BCE_INCOMPLET, ERREUR_BCE_INCONNU, ERREUR_BCE_INJOIGNABLE, ERREUR_BCE_PAGE };

/**
 * Lecture de la BCE publique (kbopub). SERVEUR UNIQUEMENT (appelé par les actions serveur de l'app
 * Entreprises, après vérification du droit). Une page à la fois, 15 s maximum par page, 45 s au total,
 * 20 pages au plus. Une liste d'unités incomplète est refusée (sinon des unités seraient vues « absentes »).
 */

const BASE = "https://kbopub.economie.fgov.be/kbopub";
const DELAI_MS = 15_000;
const PAGES_MAX = 20;
const BUDGET_MS = 45_000;

export type ResultatBce = { ok: true; entite: EntiteBce; unites: UniteBce[] } | { ok: false; erreur: string };

async function page(url: string, f: typeof fetch, finAu: number): Promise<string | null> {
  const reste = Math.min(DELAI_MS, finAu - Date.now());
  if (reste <= 0) return null;
  try {
    const r = await f(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Espace CG ACCG Nalux)", "Accept-Language": "fr" },
      signal: AbortSignal.timeout(reste),
      cache: "no-store",
    });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

export async function lireBce(numero: string, f: typeof fetch = fetch, budgetMs = BUDGET_MS): Promise<ResultatBce> {
  const finAu = Date.now() + budgetMs;
  const html = await page(`${BASE}/zoeknummerform.html?nummer=${numero}&actionLu=Zoek&lang=fr`, f, finAu);
  if (html === null) return { ok: false, erreur: ERREUR_BCE_INJOIGNABLE };
  const entite = analyserEntite(html);
  if (entite === "inconnu") return { ok: false, erreur: ERREUR_BCE_INCONNU };
  if (entite === null) return { ok: false, erreur: ERREUR_BCE_PAGE };

  const sansZero = numero.replace(/^0/, "");
  const parNumero = new Map<string, UniteBce>();
  let total = 0;
  for (let p = 1; p <= PAGES_MAX; p++) {
    const suffixe = p > 1 ? `&page=${p}` : "";
    const liste = await page(`${BASE}/vestiginglijst.html?ondernemingsnummer=${sansZero}&lang=fr${suffixe}`, f, finAu);
    if (liste === null) return { ok: false, erreur: ERREUR_BCE_INJOIGNABLE };
    const r = analyserUnites(liste);
    if (r === null) {
      // Une entreprise sans unité n'a pas de tableau : page 1 sans bannière = 0 unité.
      if (p === 1 && /0 unité|Aucune unité/i.test(liste)) break;
      return { ok: false, erreur: ERREUR_BCE_PAGE };
    }
    total = r.total;
    const avant = parNumero.size;
    for (const u of r.unites) parNumero.set(u.numero_ue, u);
    // Page vide ou déjà vue (paramètre de page ignoré) : on s'arrête.
    if (parNumero.size >= total || parNumero.size === avant) break;
  }
  if (parNumero.size < total) return { ok: false, erreur: ERREUR_BCE_INCOMPLET };
  return { ok: true, entite, unites: [...parNumero.values()] };
}
