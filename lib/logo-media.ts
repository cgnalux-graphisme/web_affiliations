/**
 * Logos des médias (icône du site) pour Scan News : le serveur les va chercher sur le site lui-même,
 * jamais chez un service tiers. Fonctions pures testées + récupération côté serveur
 * (adresses publiques uniquement, chaque redirection revérifiée).
 */
import { verifierAdressePublique } from "./adresse-publique";

export { domaineDe, domaineValide } from "./logo-media-domaine";

type Icone = { href: string; score: number };

/**
 * Icônes déclarées dans la page d'accueil, de la meilleure à la moins bonne :
 * apple-touch-icon (nette, carrée), puis les icônes d'au moins 32 px, puis les autres. Les SVG sont écartés
 * (un SVG servi depuis notre domaine pourrait contenir du script).
 */
export function iconesDeclarees(html: string, base: string): string[] {
  const icones: Icone[] = [];
  for (const balise of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attr = (nom: string) => balise.match(new RegExp(`${nom}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? "";
    const rel = attr("rel").toLowerCase();
    if (!/\bicon\b|apple-touch-icon/.test(rel)) continue;
    const href = attr("href").trim();
    if (!href || /\.svg(\?|$)/i.test(href) || /svg/i.test(attr("type")) || /^data:/i.test(href)) continue;
    const taille = Math.max(0, ...(attr("sizes").match(/\d+/g) ?? []).map(Number));
    const score = rel.includes("apple-touch-icon") ? 300 : taille >= 32 ? 200 + Math.min(taille, 99) : 100;
    try {
      icones.push({ href: new URL(href, base).toString(), score });
    } catch {}
  }
  return icones.sort((a, b) => b.score - a.score).map((i) => i.href);
}

const TYPES = ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/jpeg", "image/webp", "image/gif"];
const TAILLE_MAX = 300 * 1024;
const PAGE_MAX = 600 * 1024;
const ENTETES = { "User-Agent": "Mozilla/5.0 (compatible; ACCGNalux/1.0)" };

/** fetch d'une adresse publique, redirections suivies à la main (chacune revérifiée), corps limité. */
async function lire(url: URL, max: number, accept: string): Promise<{ type: string; corps: Buffer; url: URL } | null> {
  let adresse = url;
  for (let i = 0; i <= 3; i++) {
    await verifierAdressePublique(adresse);
    const reponse = await fetch(adresse, {
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
      headers: { ...ENTETES, Accept: accept },
      cache: "no-store",
    });
    const suite = reponse.status >= 300 && reponse.status < 400 ? reponse.headers.get("location") : null;
    if (suite) {
      adresse = new URL(suite, adresse);
      continue;
    }
    if (!reponse.ok || !reponse.body) return null;
    const lecteur = reponse.body.getReader();
    const morceaux: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await lecteur.cancel();
        // Page d'accueil trop longue : les <link> sont dans le <head>, le début suffit.
        if (accept.startsWith("text/html")) break;
        return null;
      }
      morceaux.push(value);
    }
    return { type: (reponse.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase(), corps: Buffer.concat(morceaux), url: adresse };
  }
  return null;
}

export type Logo = { type: string; corps: Buffer };
const cache = new Map<string, { logo: Logo | null; expire: number }>();
const DUREE_CACHE_MS = 24 * 60 * 60 * 1000;

/** Logo d'un média (icône déclarée par le site, sinon /favicon.ico). null s'il n'y en a pas. Mis en cache 24 h. */
export async function logoMedia(domaine: string): Promise<Logo | null> {
  const enCache = cache.get(domaine);
  if (enCache && enCache.expire > Date.now()) return enCache.logo;

  let logo: Logo | null = null;
  try {
    const accueil = await lire(new URL(`https://${domaine}/`), PAGE_MAX, "text/html,application/xhtml+xml").catch(() => null);
    const base = accueil?.url.toString() ?? `https://${domaine}/`;
    const candidates = [...(accueil ? iconesDeclarees(accueil.corps.toString("utf8"), base) : []), new URL("/favicon.ico", base).toString()];
    for (const c of candidates.slice(0, 4)) {
      const image = await lire(new URL(c), TAILLE_MAX, "image/*").catch(() => null);
      if (image && TYPES.includes(image.type) && image.corps.byteLength > 0) {
        logo = { type: image.type, corps: image.corps };
        break;
      }
    }
  } catch (err) {
    console.error("logo média :", domaine, err instanceof Error ? err.message : err);
  }
  cache.set(domaine, { logo, expire: Date.now() + DUREE_CACHE_MS });
  return logo;
}
