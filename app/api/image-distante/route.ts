import { NextResponse, type NextRequest } from "next/server";
import { verifierAdressePublique } from "../../../lib/adresse-publique";
import { getSuperAdmin } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

const TAILLE_MAX = 20 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const REDIRECTIONS_MAX = 3;

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status });
}

/**
 * Télécharge une image glissée depuis une autre page web (le navigateur ne peut pas la lire lui-même :
 * les sites l'en empêchent). Réservé aux super admins. Garde-fous : http(s) uniquement, adresses publiques
 * seulement (chaque redirection est revérifiée), images de 20 Mo maximum.
 * Entrée : { url }. Sortie : l'image brute (le navigateur la réduit ensuite comme une photo locale).
 */
export async function POST(request: NextRequest) {
  if (!(await getSuperAdmin())) return erreur("Accès refusé. Reconnectez-vous.", 401);
  const { url } = (await request.json().catch(() => ({}))) as { url?: unknown };
  if (typeof url !== "string" || url.length > 4000) return erreur("Adresse d'image manquante.", 400);

  let adresse: URL;
  try {
    adresse = new URL(url);
  } catch {
    return erreur("Cette adresse d'image n'est pas valide.", 400);
  }

  try {
    let reponse: Response | null = null;
    for (let i = 0; i <= REDIRECTIONS_MAX; i++) {
      await verifierAdressePublique(adresse);
      reponse = await fetch(adresse, {
        redirect: "manual",
        signal: AbortSignal.timeout(12_000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ACCGNalux/1.0)", Accept: "image/*" },
        cache: "no-store",
      });
      const suite = reponse.status >= 300 && reponse.status < 400 ? reponse.headers.get("location") : null;
      if (!suite) break;
      adresse = new URL(suite, adresse);
      reponse = null;
    }
    if (!reponse) return erreur("Trop de redirections vers l'image.", 502);
    if (!reponse.ok) return erreur(`Le site de l'image répond ${reponse.status} : téléchargez-la puis déposez le fichier.`, 502);

    const type = (reponse.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!TYPES.includes(type)) {
      return erreur("Ce lien ne mène pas à une image (JPEG, PNG, WebP). Glissez l'image elle-même, pas la page.", 415);
    }
    const annoncee = Number(reponse.headers.get("content-length") ?? 0);
    if (annoncee > TAILLE_MAX) return erreur("Image trop lourde (20 Mo maximum).", 413);

    // Lecture limitée à 20 Mo, même si la taille n'est pas annoncée.
    const lecteur = reponse.body?.getReader();
    if (!lecteur) return erreur("Image vide.", 502);
    const morceaux: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      total += value.byteLength;
      if (total > TAILLE_MAX) {
        await lecteur.cancel();
        return erreur("Image trop lourde (20 Mo maximum).", 413);
      }
      morceaux.push(value);
    }
    return new NextResponse(Buffer.concat(morceaux), {
      headers: { "Content-Type": type, "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/interne|http|identifiants/.test(message)) return erreur("Cette adresse d'image est refusée.", 400);
    return erreur("L'image n'a pas pu être récupérée (site lent ou injoignable). Téléchargez-la puis déposez le fichier.", 502);
  }
}
