import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { appelCron } from "../../../../lib/cron";
import { getSuperAdmin } from "../../../../lib/supabase-server";
import { getSupabaseService } from "../../../../lib/supabase-service";
import { ramasserFlux } from "../../../../lib/veille-ramassage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ramassage des flux RSS de la veille.
 * POST = bouton « Rafraîchir maintenant ». GET = appel manuel avec CRON_SECRET (le cron quotidien passe par
 * /api/veille/analyse, qui ramasse puis analyse). Ramasse, puis purge les articles de plus de 3 jours.
 * Accès : le cron (CRON_SECRET) ou un super admin connecté.
 */
async function ramasser(request: NextRequest) {
  if (!appelCron(request) && !(await getSuperAdmin())) {
    return NextResponse.json({ erreur: "Accès refusé." }, { status: 401 });
  }

  const supabase = getSupabaseService();
  if (!supabase) {
    console.error("veille : SUPABASE_SERVICE_ROLE_KEY manquante");
    return NextResponse.json(
      {
        erreur:
          "Le ramassage n'est pas configuré : la variable SUPABASE_SERVICE_ROLE_KEY manque sur le serveur. Ajoutez-la puis redémarrez.",
      },
      { status: 503 }
    );
  }

  try {
    const bilan = await ramasserFlux(supabase);
    if (bilan.ajoutes || bilan.purges) revalidatePath("/suivi-actions/veille");
    return NextResponse.json(bilan);
  } catch (err) {
    console.error("veille :", err);
    return NextResponse.json(
      { erreur: err instanceof Error ? err.message : "Le ramassage a échoué." },
      { status: 500 }
    );
  }
}

export const GET = ramasser;
export const POST = ramasser;
