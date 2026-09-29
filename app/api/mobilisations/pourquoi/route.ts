import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import { messageErreurApi } from "../../../../lib/anthropic-erreurs";
import {
  CONSIGNE_POURQUOI,
  MODELE_MOBILISATION,
  POINTS_MAX,
  SchemaPourquoi,
  construirePourquoi,
  messagePourquoi,
  type ContexteMobilisation,
} from "../../../../lib/mobilisation-ia";
import { getSuperAdmin } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status });
}

const texte = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * Rédige le « Pourquoi on se mobilise » avec Claude Sonnet 5 à partir des points de Fred.
 * Entrée : { points, titre?, date?, lieu?, revendications? }. Rien n'est enregistré : le texte revient
 * dans le formulaire, où Fred le relit, le corrige et l'enregistre. Réservé aux super admins.
 */
export async function POST(request: NextRequest) {
  if (!(await getSuperAdmin())) return erreur("Accès refusé. Reconnectez-vous.", 401);
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("La rédaction assistée n'est pas configurée : la variable ANTHROPIC_API_KEY manque sur le serveur.", 503);
  }

  const corps = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const contexte: ContexteMobilisation = {
    points: texte(corps.points, POINTS_MAX),
    titre: texte(corps.titre, 300),
    date: texte(corps.date, 60),
    lieu: texte(corps.lieu, 300),
    revendications: texte(corps.revendications, 4000),
  };
  if (contexte.points.trim().length < 10) {
    return erreur("Donnez au moins un ou deux points (les raisons de la mobilisation) avant de lancer l'IA.", 400);
  }

  try {
    const resultat = await new Anthropic({ timeout: 120_000 }).messages.parse({
      model: MODELE_MOBILISATION,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: zodOutputFormat(SchemaPourquoi) },
      system: CONSIGNE_POURQUOI,
      messages: [{ role: "user", content: messagePourquoi(contexte) }],
    });
    if (resultat.stop_reason === "refusal") {
      return erreur("L'IA a refusé de rédiger ce texte. Rédigez-le vous-même ou reformulez vos points.", 422);
    }
    if (resultat.stop_reason !== "end_turn" || !resultat.parsed_output?.pourquoi.trim()) {
      console.error("pourquoi mobilisation incomplet :", resultat.stop_reason);
      return erreur("L'IA a renvoyé une réponse vide ou incomplète. Réessayez.", 502);
    }
    return NextResponse.json({ ...construirePourquoi(resultat.parsed_output, contexte), modele: MODELE_MOBILISATION });
  } catch (err) {
    console.error("pourquoi mobilisation :", err);
    const { message, status } = messageErreurApi(err, "La rédaction a échoué. Réessayez.");
    return erreur(message, status);
  }
}
