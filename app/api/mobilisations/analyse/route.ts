import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import { messageErreurApi } from "../../../../lib/anthropic-erreurs";
import { aujourdhui } from "../../../../lib/articles";
import {
  ANALYSE_MAX,
  CONSIGNE_ANALYSE,
  MODELE_MOBILISATION,
  SchemaAnalyse,
  construireAnalyse,
  messageAnalyse,
} from "../../../../lib/mobilisation-ia";
import { getSuperAdmin } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status });
}

/**
 * Analyse des textes collés par Fred (articles, tracts, communiqués) avec Claude Sonnet 5 et propose
 * tous les champs d'une nouvelle mobilisation. Entrée : { textes }. Rien n'est enregistré : les champs
 * reviennent dans le formulaire, où Fred relit, corrige et enregistre. Réservé aux super admins.
 */
export async function POST(request: NextRequest) {
  if (!(await getSuperAdmin())) return erreur("Accès refusé. Reconnectez-vous.", 401);
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("L'analyse n'est pas configurée : la variable ANTHROPIC_API_KEY manque sur le serveur.", 503);
  }

  const corps = (await request.json().catch(() => ({}))) as { textes?: unknown };
  const textes = typeof corps.textes === "string" ? corps.textes.trim() : "";
  if (textes.length < 80) {
    return erreur("Collez des textes plus complets (article, tract, communiqué) avant de lancer l'analyse.", 400);
  }
  if (textes.length > ANALYSE_MAX) {
    return erreur(`Trop de texte : ${ANALYSE_MAX.toLocaleString("fr-BE")} caractères maximum. Gardez les passages utiles.`, 413);
  }

  try {
    const resultat = await new Anthropic({ timeout: 180_000 }).messages.parse({
      model: MODELE_MOBILISATION,
      max_tokens: 12000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: zodOutputFormat(SchemaAnalyse) },
      system: CONSIGNE_ANALYSE,
      messages: [{ role: "user", content: messageAnalyse(textes, aujourdhui()) }],
    });
    if (resultat.stop_reason === "refusal") {
      return erreur("L'IA a refusé d'analyser ces textes. Remplissez les champs vous-même.", 422);
    }
    if (resultat.stop_reason !== "end_turn" || !resultat.parsed_output) {
      console.error("analyse mobilisation incomplète :", resultat.stop_reason);
      return erreur("L'IA a renvoyé une réponse vide ou incomplète. Réessayez.", 502);
    }
    return NextResponse.json({ ...construireAnalyse(resultat.parsed_output, textes), modele: MODELE_MOBILISATION });
  } catch (err) {
    console.error("analyse mobilisation :", err);
    const { message, status } = messageErreurApi(err, "L'analyse a échoué. Réessayez.");
    return erreur(message, status);
  }
}
