import { ROBOT_LECTURE_IA, robotAutorise } from "./robots";

/**
 * L'IA pourra-t-elle lire une page ? Vérification gratuite (aucun appel à l'IA) : règles du robots.txt
 * du média pour le robot de lecture d'Anthropic (« Claude-User »). « oui » ne garantit pas la lecture
 * (article payant, page protégée) ; « non » est fiable. Côté serveur. Le robots.txt de chaque site est
 * gardé en mémoire 1 h (plusieurs articles d'un même média = une seule requête).
 */

export type EtatLisibilite = "oui" | "non" | "inconnu";
export type Lisibilite = { lisible: EtatLisibilite; explication: string };

const DUREE_CACHE_MS = 60 * 60 * 1000;
type Robots = { statut: "absent" | "lu" | "illisible"; texte: string; code?: number; expire: number };
const cache = new Map<string, Robots>();

async function lireRobots(origine: string): Promise<Robots> {
  const enCache = cache.get(origine);
  if (enCache && enCache.expire > Date.now()) return enCache;
  let robots: Robots;
  try {
    const reponse = await fetch(`${origine}/robots.txt`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VeilleACCGNalux/1.0)" },
      cache: "no-store",
    });
    robots =
      reponse.status === 404 || reponse.status === 410
        ? { statut: "absent", texte: "", expire: 0 }
        : reponse.ok
          ? { statut: "lu", texte: await reponse.text(), expire: 0 }
          : { statut: "illisible", texte: "", code: reponse.status, expire: 0 };
  } catch {
    // Site lent ou injoignable : pas de mise en cache durable.
    return { statut: "illisible", texte: "", expire: 0 };
  }
  robots.expire = Date.now() + DUREE_CACHE_MS;
  cache.set(origine, robots);
  return robots;
}

export async function verifierLisibilite(lien: string): Promise<Lisibilite> {
  let url: URL;
  try {
    url = new URL(lien);
  } catch {
    return { lisible: "non", explication: "Le lien de l'article n'est pas valide." };
  }
  if (url.hostname === "news.google.com") {
    return {
      lisible: "non",
      explication: "Lien d'alerte Google dont l'adresse réelle n'a pas pu être retrouvée : ouvrez l'article pour le lire vous-même.",
    };
  }
  const robots = await lireRobots(url.origin);
  if (robots.statut === "absent") {
    return {
      lisible: "oui",
      explication: `${url.hostname} n'interdit pas la lecture par l'IA. Un article payant ou protégé peut quand même rester illisible.`,
    };
  }
  if (robots.statut === "illisible") {
    return {
      lisible: "inconnu",
      explication: robots.code
        ? `${url.hostname} ne laisse pas vérifier ses règles (réponse ${robots.code}). La lecture peut échouer.`
        : `Les règles de ${url.hostname} n'ont pas pu être vérifiées (site lent ou injoignable).`,
    };
  }
  return robotAutorise(robots.texte, ROBOT_LECTURE_IA, `${url.pathname}${url.search}`)
    ? {
        lisible: "oui",
        explication: `${url.hostname} autorise la lecture par l'IA. Un article payant ou protégé peut quand même rester illisible.`,
      }
    : {
        lisible: "non",
        explication: `${url.hostname} interdit la lecture par les robots d'IA : ouvrez l'article et collez son texte.`,
      };
}
