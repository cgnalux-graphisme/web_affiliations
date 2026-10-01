/**
 * Liens des alertes Google Actualités (source « Google FGTB ») : adresse réelle de l'article et repérage
 * des doublons avec l'article du média d'origine. Côté serveur (résolution réseau) ; fonctions pures testées.
 *
 * Les liens news.google.com/rss/articles/<id> sont chiffrés : une redirection simple ne donne pas
 * l'adresse. On lit la signature de la page Google, puis on interroge le point d'accès « batchexecute »
 * de Google Actualités (méthode non officielle, vérifiée le 01/10/2026). En cas d'échec : null, et le lien
 * Google reste utilisé tel quel (l'IA ne pourra pas le lire, l'éditeur peut l'ouvrir).
 */

const DELAI_MS = 7000;
const ENTETES = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36",
  // Consentement aux cookies Google déjà donné : sinon redirection vers consent.google.com (Europe).
  Cookie: "CONSENT=YES+cb; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg",
};

/** Lien d'alerte Google Actualités ? */
export function estLienGoogle(lien: string): boolean {
  try {
    const u = new URL(lien);
    return u.hostname === "news.google.com" && /^\/(rss\/)?articles\//.test(u.pathname);
  } catch {
    return false;
  }
}

/** Identifiant chiffré d'un lien Google Actualités. */
export function idGoogle(lien: string): string | null {
  try {
    return new URL(lien).pathname.match(/\/articles\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Adresse lue dans la réponse « batchexecute » (préfixe )]}' puis JSON imbriqué). */
export function lireReponseGoogle(texte: string): string | null {
  try {
    const bloc = texte.slice(texte.indexOf("[["));
    const externe = JSON.parse(bloc.slice(0, bloc.lastIndexOf("]") + 1)) as unknown[][];
    const ligne = externe.find((l) => Array.isArray(l) && l[0] === "wrb.fr" && typeof l[2] === "string");
    if (!ligne) return null;
    const interne = JSON.parse(ligne[2] as string) as unknown[];
    const url = interne[0] === "garturlres" ? interne[1] : null;
    return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
  } catch {
    return null;
  }
}

const cache = new Map<string, string | null>();

/** Adresse réelle d'un lien Google Actualités (null si elle ne peut pas être retrouvée). Mise en cache. */
export async function resoudreLienGoogle(lien: string): Promise<string | null> {
  const id = idGoogle(lien);
  if (!id) return null;
  if (cache.has(id)) return cache.get(id)!;
  let resultat: string | null = null;
  try {
    const page = await fetch(`https://news.google.com/rss/articles/${id}?hl=fr&gl=BE&ceid=BE:fr`, {
      headers: ENTETES,
      signal: AbortSignal.timeout(DELAI_MS),
      cache: "no-store",
    });
    const html = await page.text();
    const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const horodatage = html.match(/data-n-a-ts="(\d+)"/)?.[1];
    if (signature && horodatage) {
      const requete = [
        [
          "Fbv4je",
          `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${horodatage},"${signature}"]`,
          null,
          "generic",
        ],
      ];
      const reponse = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
        method: "POST",
        headers: { ...ENTETES, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: `f.req=${encodeURIComponent(JSON.stringify([requete]))}`,
        signal: AbortSignal.timeout(DELAI_MS),
        cache: "no-store",
      });
      if (reponse.ok) resultat = lireReponseGoogle(await reponse.text());
    }
  } catch (err) {
    console.error("lien Google non résolu :", err instanceof Error ? err.message : err);
  }
  cache.set(id, resultat);
  return resultat;
}

/** Adresse utilisable d'un article : l'adresse réelle pour une alerte Google (si retrouvée), sinon le lien tel quel. */
export async function lienReel(lien: string): Promise<{ lien: string; alerte: boolean; resolu: boolean }> {
  if (!estLienGoogle(lien)) return { lien, alerte: false, resolu: true };
  const reel = await resoudreLienGoogle(lien);
  return reel ? { lien: reel, alerte: true, resolu: true } : { lien, alerte: true, resolu: false };
}

// ── Doublons ────────────────────────────────────────────────────────────────

/** Adresse comparable : sans protocole, « www. », paramètres, ancre ni barre finale. */
export function cleUrl(lien: string): string {
  try {
    const u = new URL(lien);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return lien.trim().toLowerCase();
  }
}

/** Titre comparable : sans le « - Média » final des alertes Google, minuscules, sans accents ni ponctuation. */
export function cleTitre(titre: string, alerte = false): string {
  let t = titre;
  if (alerte) {
    const i = t.lastIndexOf(" - ");
    if (i > 0 && t.length - i <= 45) t = t.slice(0, i);
  }
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Deux articles sont-ils le même (même adresse, ou même titre une fois le nom du média retiré) ? */
export function memeArticle(
  a: { lien: string; titre: string; alerte?: boolean },
  b: { lien: string; titre: string; alerte?: boolean }
): boolean {
  if (cleUrl(a.lien) === cleUrl(b.lien)) return true;
  const ta = cleTitre(a.titre, a.alerte);
  const tb = cleTitre(b.titre, b.alerte);
  return ta.split(" ").length >= 5 && ta === tb;
}
