import { NextResponse, type NextRequest } from "next/server";
import { lienReel } from "../../../../lib/lien-reel";
import { verifierLisibilite, type Lisibilite as LisibiliteBase } from "../../../../lib/lisibilite";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Réponse : lisibilité + adresse réelle de l'article (une alerte Google est résolue vers le média d'origine). */
export type Lisibilite = LisibiliteBase & { lien: string; alerte: boolean };

/**
 * L'IA pourra-t-elle lire l'article d'un item de veille ? Vérification gratuite (aucun appel à l'IA) :
 * règles du robots.txt du média pour le robot de lecture d'Anthropic (« Claude-User »), voir lib/lisibilite.ts.
 */
export async function GET(request: NextRequest) {
  if (!(await getSuperAdmin())) return NextResponse.json({ erreur: "Accès refusé." }, { status: 401 });
  const veilleId = request.nextUrl.searchParams.get("veilleId") ?? "";
  if (!UUID.test(veilleId)) return NextResponse.json({ erreur: "Article de Scan News manquant." }, { status: 400 });

  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("site_veille").select("lien").eq("id", veilleId).maybeSingle();
  if (!data) return NextResponse.json({ erreur: "Cet article de Scan News n'existe plus." }, { status: 404 });

  const reel = await lienReel(data.lien);
  return NextResponse.json<Lisibilite>({ ...(await verifierLisibilite(reel.lien)), lien: reel.lien, alerte: reel.alerte });
}
