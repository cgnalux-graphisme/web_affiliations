import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Protection contre les requêtes vers le réseau interne (SSRF) : avant de télécharger une adresse
 * fournie par l'utilisateur, on vérifie que son nom résout uniquement vers des adresses IP publiques.
 * SERVEUR UNIQUEMENT.
 */

function ipv4Privee(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // réseau opérateur partagé
    (a === 169 && b === 254) || // lien local, métadonnées cloud
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multidiffusion et réservé
  );
}

/** Vrai si l'adresse IP n'est pas routable publiquement (privée, locale, réservée). */
export function ipPrivee(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ipv4Privee(ip);
  if (version !== 6) return true;
  const v6 = ip.toLowerCase();
  const mappee = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappee) return ipv4Privee(mappee[1]);
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") || // adresses uniques locales
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") || // lien local
    v6.startsWith("ff") // multidiffusion
  );
}

/** Vérifie qu'une URL est http(s) et que son hôte ne mène qu'à des adresses publiques. Lève une erreur sinon. */
export async function verifierAdressePublique(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("adresse non http(s)");
  if (url.username || url.password) throw new Error("adresse avec identifiants refusée");
  const hote = url.hostname.replace(/^\[|\]$/g, "");
  const adresses = isIP(hote) ? [{ address: hote }] : await lookup(hote, { all: true, verbatim: true });
  if (!adresses.length || adresses.some((a) => ipPrivee(a.address))) throw new Error("adresse interne refusée");
}
