import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import {
  CONSIGNE_SYSTEME,
  MODELE_REDACTION,
  SchemaBrouillon,
  construireBrouillon,
  messageSource,
  raisonLecture,
  type ItemSource,
  type Lecture,
} from "../../../../lib/redaction-ia";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";
// Lecture de l'article + rédaction : jusqu'à 2 ou 3 minutes pour un long article.
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REPRISES_PAUSE = 3;

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

/** Texte de l'article lu par l'outil web_fetch (et le code d'erreur si la lecture a échoué). */
function lectureDepuis(blocs: Anthropic.ContentBlock[]): { lecture: Lecture; texte: string } {
  let texte = "";
  let codeErreur: string | undefined;
  for (const b of blocs) {
    if (b.type !== "web_fetch_tool_result") continue;
    if (b.content.type === "web_fetch_tool_result_error") {
      codeErreur = b.content.error_code;
    } else if (b.content.content.source.type === "text") {
      texte += `\n${b.content.content.source.data}`;
    }
  }
  return texte.trim()
    ? { lecture: { lu: true }, texte }
    : { lecture: { lu: false, raison: raisonLecture(codeErreur) }, texte: "" };
}

/**
 * Brouillon d'article proposé par Claude Sonnet 5 à partir d'un item de la veille.
 * Entrée : { veilleId }. L'item est relu en base ; l'IA lit elle-même l'article d'origine
 * (outil web_fetch : une seule lecture, limitée au domaine de l'article).
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

  let domaine: string;
  try {
    domaine = new URL(item.lien).hostname;
  } catch {
    return erreur("Le lien de cet article de veille n'est pas valide.", 422);
  }

  // Version de base de web_fetch : elle renvoie le texte lu tel quel, ce qui permet au code
  // de repérer les phrases reprises mot pour mot (garde-fou droit d'auteur).
  const outils: Anthropic.ToolUnion[] = [
    {
      type: "web_fetch_20250910",
      name: "web_fetch",
      max_uses: 1,
      allowed_domains: [domaine],
      max_content_tokens: 30000,
    },
  ];

  const client = new Anthropic({ timeout: 240_000 });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: messageSource(item) }];
  const blocsLus: Anthropic.ContentBlock[] = [];

  try {
    let reponse = await client.messages.parse({
      model: MODELE_REDACTION,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: zodOutputFormat(SchemaBrouillon) },
      system: CONSIGNE_SYSTEME,
      tools: outils,
      messages,
    });
    blocsLus.push(...reponse.content);

    // Outil côté serveur : l'API peut mettre le tour en pause ; on le relance tel quel.
    for (let i = 0; reponse.stop_reason === "pause_turn" && i < MAX_REPRISES_PAUSE; i++) {
      messages.push({ role: "assistant", content: reponse.content });
      reponse = await client.messages.parse({
        model: MODELE_REDACTION,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        output_config: { effort: "medium", format: zodOutputFormat(SchemaBrouillon) },
        system: CONSIGNE_SYSTEME,
        tools: outils,
        messages,
      });
      blocsLus.push(...reponse.content);
    }

    if (reponse.stop_reason === "refusal") {
      return erreur("L'IA a refusé de rédiger à partir de cet article. Rédigez-le vous-même ou choisissez un autre article.", 422);
    }
    if (reponse.stop_reason !== "end_turn" || !reponse.parsed_output) {
      console.error("brouillon IA incomplet :", reponse.stop_reason);
      return erreur("L'IA a renvoyé une réponse vide ou incomplète. Réessayez.", 502);
    }

    const { lecture, texte } = lectureDepuis(blocsLus);
    const brouillon = construireBrouillon(reponse.parsed_output, item, lecture, texte);
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
