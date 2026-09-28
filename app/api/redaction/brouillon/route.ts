import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import {
  CONSIGNE_SYSTEME,
  MODELE_REDACTION,
  SchemaBrouillon,
  construireBrouillon,
  messageSource,
  type ItemSource,
} from "../../../../lib/redaction-ia";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status });
}

/** Traduit une erreur de l'API Anthropic en message clair pour l'écran. */
function messageErreurApi(err: unknown): { message: string; status: number } {
  // APIConnectionError hérite d'APIError dans le SDK TypeScript : on le teste d'abord.
  if (err instanceof Anthropic.APIConnectionError) {
    return { message: "Le service d'IA est injoignable (réseau ou délai dépassé). Réessayez dans un instant.", status: 504 };
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return { message: "La clé ANTHROPIC_API_KEY est refusée (invalide ou révoquée). Vérifiez-la dans les variables d'environnement.", status: 502 };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { message: "Limite d'utilisation de l'IA atteinte. Patientez une minute puis réessayez.", status: 429 };
  }
  if (err instanceof Anthropic.APIError) {
    if (err.status === 402 || err.type === "billing_error") {
      return { message: "Crédit Anthropic épuisé : rechargez le compte sur console.anthropic.com, puis réessayez.", status: 402 };
    }
    if (err.status === 529 || err.type === "overloaded_error" || (err.status ?? 0) >= 500) {
      return { message: "Le service d'IA est surchargé. Réessayez dans quelques minutes.", status: 503 };
    }
    return { message: `Le service d'IA a refusé la demande (${err.status ?? "?"} : ${err.message}).`, status: 502 };
  }
  return { message: "La génération du brouillon a échoué. Réessayez.", status: 500 };
}

/**
 * Brouillon d'article proposé par Claude Sonnet 5 à partir d'un item de la veille.
 * Entrée : { veilleId }. L'item est relu en base (titre, résumé, lien) : rien d'autre n'est envoyé à l'IA.
 * Réservé aux super admins. La clé API ne quitte jamais le serveur.
 */
export async function POST(request: NextRequest) {
  if (!(await getSuperAdmin())) return erreur("Accès refusé. Reconnectez-vous.", 401);
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("La rédaction assistée n'est pas configurée : la variable ANTHROPIC_API_KEY manque sur le serveur.", 503);
  }

  const corps = (await request.json().catch(() => ({}))) as { veilleId?: unknown };
  const veilleId = typeof corps.veilleId === "string" && UUID.test(corps.veilleId) ? corps.veilleId : null;
  if (!veilleId) return erreur("Article de veille manquant.", 400);

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("site_veille")
    .select("titre, resume, lien, source_nom")
    .eq("id", veilleId)
    .maybeSingle();
  if (error) return erreur("L'article de veille ne peut pas être lu. Reconnectez-vous puis réessayez.", 500);
  if (!data) return erreur("Cet article de veille n'existe plus.", 404);
  const item = data as ItemSource;

  const client = new Anthropic({ timeout: 100_000 });
  try {
    const reponse = await client.messages.parse({
      model: MODELE_REDACTION,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: zodOutputFormat(SchemaBrouillon) },
      system: CONSIGNE_SYSTEME,
      messages: [{ role: "user", content: messageSource(item) }],
    });

    if (reponse.stop_reason === "refusal") {
      return erreur("L'IA a refusé de rédiger à partir de cet article. Rédigez-le vous-même ou choisissez un autre article.", 422);
    }
    if (reponse.stop_reason === "max_tokens" || !reponse.parsed_output) {
      console.error("brouillon IA incomplet :", reponse.stop_reason);
      return erreur("L'IA a renvoyé une réponse vide ou incomplète. Réessayez.", 502);
    }
    const brouillon = construireBrouillon(reponse.parsed_output, item);
    if (!brouillon.contenu.trim()) {
      return erreur("L'IA a renvoyé un contenu vide. Réessayez.", 502);
    }
    return NextResponse.json({ brouillon, modele: MODELE_REDACTION });
  } catch (err) {
    console.error("brouillon IA :", err);
    const { message, status } = messageErreurApi(err);
    return erreur(message, status);
  }
}
