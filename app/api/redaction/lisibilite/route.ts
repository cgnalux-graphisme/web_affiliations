import { NextResponse, type NextRequest } from "next/server";
import { ROBOT_LECTURE_IA, robotAutorise } from "../../../../lib/robots";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Lisibilite = { lisible: "oui" | "non" | "inconnu"; explication: string };

/**
 * L'IA pourra-t-elle lire l'article d'un item de veille ? Vérification gratuite (aucun appel à l'IA) :
 * règles du robots.txt du média pour le robot de lecture d'Anthropic (« Claude-User »).
 * « oui » ne garantit pas la lecture (article payant, page protégée) ; « non » est fiable.
 */
export async function GET(request: NextRequest) {
  if (!(await getSuperAdmin())) return NextResponse.json({ erreur: "Accès refusé." }, { status: 401 });
  const veilleId = request.nextUrl.searchParams.get("veilleId") ?? "";
  if (!UUID.test(veilleId)) return NextResponse.json({ erreur: "Article de veille manquant." }, { status: 400 });

  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("site_veille").select("lien").eq("id", veilleId).maybeSingle();
  if (!data) return NextResponse.json({ erreur: "Cet article de veille n'existe plus." }, { status: 404 });

  let url: URL;
  try {
    url = new URL(data.lien);
  } catch {
    return NextResponse.json<Lisibilite>({ lisible: "non", explication: "Le lien de l'article n'est pas valide." });
  }

  try {
    const reponse = await fetch(`${url.origin}/robots.txt`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VeilleACCGNalux/1.0)" },
      cache: "no-store",
    });
    // Pas de robots.txt : aucune interdiction déclarée.
    if (reponse.status === 404 || reponse.status === 410) {
      return NextResponse.json<Lisibilite>({
        lisible: "oui",
        explication: `${url.hostname} n'interdit pas la lecture par l'IA. Un article payant ou protégé peut quand même rester illisible.`,
      });
    }
    if (!reponse.ok) {
      return NextResponse.json<Lisibilite>({
        lisible: "inconnu",
        explication: `${url.hostname} ne laisse pas vérifier ses règles (réponse ${reponse.status}). La lecture peut échouer : dans ce cas, l'IA rédigera avec votre texte et le résumé du flux.`,
      });
    }
    const autorise = robotAutorise(await reponse.text(), ROBOT_LECTURE_IA, `${url.pathname}${url.search}`);
    return NextResponse.json<Lisibilite>(
      autorise
        ? {
            lisible: "oui",
            explication: `${url.hostname} autorise la lecture par l'IA. Un article payant ou protégé peut quand même rester illisible.`,
          }
        : {
            lisible: "non",
            explication: `${url.hostname} interdit la lecture par les robots d'IA. Collez un extrait ou vos notes à l'étape 3.`,
          }
    );
  } catch {
    return NextResponse.json<Lisibilite>({
      lisible: "inconnu",
      explication: `Les règles de ${url.hostname} n'ont pas pu être vérifiées (site lent ou injoignable).`,
    });
  }
}
