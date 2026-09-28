import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import {
  CONSIGNE_SYSTEME,
  MODELE_REDACTION,
  SchemaBrouillon,
  CONSIGNES_MAX,
  EXTRAIT_MAX,
  construireBrouillon,
  messageSource,
  raisonLecture,
  type ItemSource,
  type Lecture,
} from "../../../../lib/redaction-ia";
import { messageErreurApi } from "../../../../lib/anthropic-erreurs";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";
// Lecture de l'article + rédaction : jusqu'à 2 ou 3 minutes pour un long article.
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REPRISES_PAUSE = 3;

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status });
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
    ? { lecture: { lectureDemandee: true, articleLu: true, extrait: false }, texte }
    : { lecture: { lectureDemandee: true, articleLu: false, raisonEchec: raisonLecture(codeErreur), extrait: false }, texte: "" };
}

/**
 * Brouillon d'article proposé par Claude Sonnet 5 à partir d'un item de la veille.
 * Entrée : { veilleId, lire, extrait?, consignes? }. L'item est relu en base.
 * - lire : l'IA lit l'article en ligne (outil web_fetch : une lecture, domaine de l'article) — choix de
 *   l'éditeur, car la lecture coûte plus cher ; si le site refuse les robots d'IA, relance sans lecture.
 * - extrait : texte de l'article ou notes personnelles collés par l'éditeur.
 * - consignes : consignes de rédaction propres à cet article (sans jamais lever les règles strictes).
 * Réservé aux super admins. La clé API ne quitte jamais le serveur.
 */
export async function POST(request: NextRequest) {
  if (!(await getSuperAdmin())) return erreur("Accès refusé. Reconnectez-vous.", 401);
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("La rédaction assistée n'est pas configurée : la variable ANTHROPIC_API_KEY manque sur le serveur.", 503);
  }

  const corps = (await request.json().catch(() => ({}))) as {
    veilleId?: unknown;
    lire?: unknown;
    extrait?: unknown;
    consignes?: unknown;
  };
  const veilleId = typeof corps.veilleId === "string" && UUID.test(corps.veilleId) ? corps.veilleId : null;
  if (!veilleId) return erreur("Article de veille manquant.", 400);
  const extrait = typeof corps.extrait === "string" ? corps.extrait.trim() : "";
  if (extrait.length > EXTRAIT_MAX) {
    return erreur(`Le texte collé est trop long (${extrait.length} caractères, ${EXTRAIT_MAX} maximum). Gardez les passages utiles.`, 413);
  }
  const consignes = typeof corps.consignes === "string" ? corps.consignes.trim() : "";
  if (consignes.length > CONSIGNES_MAX) {
    return erreur(`Les consignes sont trop longues (${consignes.length} caractères, ${CONSIGNES_MAX} maximum).`, 413);
  }
  const lire = corps.lire === true;

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

  /** Lecture de l'article (si demandée et permise) puis rédaction ; relance le tour s'il est mis en pause. */
  async function rediger(siteRefuse: boolean) {
    const avecLecture = lire && !siteRefuse;
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: messageSource(item, { lire, siteRefuse, extrait, consignes }) },
    ];
    const parametres = {
      model: MODELE_REDACTION,
      max_tokens: 16000,
      thinking: { type: "adaptive" as const },
      output_config: { effort: "medium" as const, format: zodOutputFormat(SchemaBrouillon) },
      system: CONSIGNE_SYSTEME,
      ...(avecLecture ? { tools: outils } : {}),
    };
    const blocs: Anthropic.ContentBlock[] = [];
    let reponse = await client.messages.parse({ ...parametres, messages });
    blocs.push(...reponse.content);
    // Outil côté serveur : l'API peut mettre le tour en pause ; on le relance tel quel.
    for (let i = 0; reponse.stop_reason === "pause_turn" && i < MAX_REPRISES_PAUSE; i++) {
      messages.push({ role: "assistant", content: reponse.content });
      reponse = await client.messages.parse({ ...parametres, messages });
      blocs.push(...reponse.content);
    }
    return { reponse, blocs };
  }

  try {
    let lectureRefusee = false;
    let resultat: Awaited<ReturnType<typeof rediger>>;
    try {
      resultat = await rediger(false);
    } catch (err) {
      // Site qui interdit la lecture par les robots d'IA (robots.txt) : l'API refuse toute la
      // demande dès qu'il figure dans allowed_domains. On respecte ce choix et on rédige
      // à partir du seul flux. Pas de type d'erreur dédié : seul le message distingue ce cas.
      if (lire && err instanceof Anthropic.BadRequestError && /not accessible to our user agent/i.test(err.message)) {
        lectureRefusee = true;
        resultat = await rediger(true);
      } else {
        throw err;
      }
    }
    const { reponse, blocs } = resultat;

    if (reponse.stop_reason === "refusal") {
      return erreur("L'IA a refusé de rédiger à partir de cet article. Rédigez-le vous-même ou choisissez un autre article.", 422);
    }
    if (reponse.stop_reason !== "end_turn" || !reponse.parsed_output) {
      console.error("brouillon IA incomplet :", reponse.stop_reason);
      return erreur("L'IA a renvoyé une réponse vide ou incomplète. Réessayez.", 502);
    }

    // Matière réellement utilisée (pour les avertissements et le garde-fou italique).
    const lu: { lecture: Lecture; texte: string } = !lire
      ? { lecture: { lectureDemandee: false, articleLu: false, extrait: false }, texte: "" }
      : lectureRefusee
        ? { lecture: { lectureDemandee: true, articleLu: false, raisonEchec: raisonLecture("site_refuse_ia"), extrait: false }, texte: "" }
        : lectureDepuis(blocs);
    const lecture: Lecture = { ...lu.lecture, extrait: Boolean(extrait) };
    const texte = `${lu.texte}
${extrait}`;
    const brouillon = construireBrouillon(reponse.parsed_output, item, lecture, texte);
    if (!brouillon.contenu.trim()) {
      return erreur("L'IA a renvoyé un contenu vide. Réessayez.", 502);
    }
    return NextResponse.json({ brouillon, modele: MODELE_REDACTION });
  } catch (err) {
    console.error("brouillon IA :", err);
    const { message, status } = messageErreurApi(err, "La génération du brouillon a échoué. Réessayez.");
    return erreur(message, status);
  }
}
