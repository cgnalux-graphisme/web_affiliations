import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { messageErreurApi } from "../../../../lib/anthropic-erreurs";
import { appelCron } from "../../../../lib/cron";
import { getSuperAdmin } from "../../../../lib/supabase-server";
import { getSupabaseService } from "../../../../lib/supabase-service";
import { ErreurAnalyse, analyserFil } from "../../../../lib/veille-analyse";
import { CLE_DERNIER_RAMASSAGE, ramasserFlux } from "../../../../lib/veille-ramassage";
import { HEURE_ANALYSE_AUTO, heureBruxelles, ramassageRecent } from "../../../../lib/veille-tri";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status });
}

function service() {
  const supabase = getSupabaseService();
  if (!supabase) console.error("check IA : SUPABASE_SERVICE_ROLE_KEY manquante");
  return supabase;
}

async function lancer(supabase: NonNullable<ReturnType<typeof getSupabaseService>>, origine: "manuel" | "auto") {
  try {
    const analyse = await analyserFil(supabase, origine);
    revalidatePath("/suivi-actions/veille");
    return NextResponse.json(analyse);
  } catch (err) {
    if (err instanceof ErreurAnalyse) return erreur(err.message, err.status);
    console.error("check IA :", err);
    const { message, status } = messageErreurApi(err, "L'analyse du fil a échoué. Réessayez.");
    return erreur(message, status);
  }
}

/**
 * Vercel Cron, deux passages (6 h et 7 h UTC, voir vercel.json) : ramassage + purge à chaque passage,
 * puis analyse automatique seulement s'il est 8 h à Bruxelles (6 h UTC en été, 7 h UTC en hiver)
 * et qu'aucune analyse automatique n'a été faite dans les 20 dernières heures.
 */
export async function GET(request: NextRequest) {
  if (!appelCron(request)) return erreur("Accès refusé.", 401);
  const supabase = service();
  if (!supabase) return erreur("SUPABASE_SERVICE_ROLE_KEY manque sur le serveur.", 503);

  let bilan;
  try {
    bilan = await ramasserFlux(supabase);
    revalidatePath("/suivi-actions/veille");
  } catch (err) {
    console.error("check IA (cron) : ramassage", err);
    return erreur(err instanceof Error ? err.message : "Le ramassage a échoué.", 500);
  }

  if (heureBruxelles() !== HEURE_ANALYSE_AUTO) {
    return NextResponse.json({ ramassage: bilan, analyse: "pas maintenant (ce n'est pas 8 h à Bruxelles)" });
  }
  if (!process.env.ANTHROPIC_API_KEY) return erreur("ANTHROPIC_API_KEY manque sur le serveur.", 503);
  const depuis = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("site_veille_analyses")
    .select("id", { count: "exact", head: true })
    .eq("origine", "auto")
    .gte("created_at", depuis);
  if (count) return NextResponse.json({ ramassage: bilan, analyse: "déjà faite aujourd'hui" });
  return lancer(supabase, "auto");
}

/** Bouton « Check IA » (super admin) : seulement sur un fil rafraîchi depuis moins de 2 h. */
export async function POST() {
  if (!(await getSuperAdmin())) return erreur("Accès refusé. Reconnectez-vous.", 401);
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("Le Check IA n'est pas configuré : la variable ANTHROPIC_API_KEY manque sur le serveur.", 503);
  }
  const supabase = service();
  if (!supabase) {
    return erreur("Le Check IA n'est pas configuré : la variable SUPABASE_SERVICE_ROLE_KEY manque sur le serveur.", 503);
  }

  const { data } = await supabase.from("site_parametres").select("valeur").eq("cle", CLE_DERNIER_RAMASSAGE).maybeSingle();
  if (!ramassageRecent(data?.valeur as string | undefined)) {
    return erreur("Le fil n'est pas à jour : cliquez d'abord sur « Rafraîchir maintenant ».", 409);
  }
  return lancer(supabase, "manuel");
}
