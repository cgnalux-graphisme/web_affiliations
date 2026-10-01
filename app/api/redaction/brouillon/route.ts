import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import {
  CONSIGNE_SYSTEME,
  CONSIGNES_MAX,
  EXTRAIT_MAX,
  LECTURES_MAX,
  MODELE_REDACTION,
  SOURCES_MAX,
  SchemaBrouillon,
  construireBrouillon,
  messageSources,
  raisonLecture,
  type LectureSource,
  type SourceRedaction,
} from "../../../../lib/redaction-ia";
import { messageErreurApi } from "../../../../lib/anthropic-erreurs";
import { lienReel } from "../../../../lib/lien-reel";
import { lecturesDepuis, type SourceLue } from "../../../../lib/redaction-lecture";
import { verifierLisibilite } from "../../../../lib/lisibilite";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";
// Lecture de 2 articles + rédaction : jusqu'à 2 ou 3 minutes.
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REPRISES_PAUSE = 3;
/** Total des textes collés et des notes. */
const TEXTES_TOTAL_MAX = 2 * EXTRAIT_MAX;

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status });
}

/**
 * Brouillon d'article proposé par Claude Sonnet 5 à partir d'une ou plusieurs sources de la veille
 * (un article du fil, ou les articles d'un sujet du Check IA).
 * Entrée : { veilleIds, lire?, textes?, notes?, consignes? }. Les sources sont relues en base.
 * - lire : ids des sources que l'IA lit en ligne (outil web_fetch, LECTURES_MAX au plus) ; une source dont le
 *   site interdit les robots d'IA est écartée d'avance ; si l'API refuse quand même, relance sans lecture.
 * - textes : { [id]: texte de l'article collé par l'éditeur } ; notes : notes personnelles.
 * - consignes : consignes de rédaction propres à cet article (sans jamais lever les règles strictes).
 * Réservé aux super admins. La clé API ne quitte jamais le serveur.
 */
export async function POST(request: NextRequest) {
  if (!(await getSuperAdmin())) return erreur("Accès refusé. Reconnectez-vous.", 401);
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("La rédaction assistée n'est pas configurée : la variable ANTHROPIC_API_KEY manque sur le serveur.", 503);
  }

  const corps = (await request.json().catch(() => ({}))) as {
    veilleIds?: unknown;
    lire?: unknown;
    textes?: unknown;
    notes?: unknown;
    consignes?: unknown;
  };
  const ids = Array.isArray(corps.veilleIds)
    ? [...new Set(corps.veilleIds.filter((v): v is string => typeof v === "string" && UUID.test(v)))]
    : [];
  if (!ids.length) return erreur("Article de Scan News manquant.", 400);
  if (ids.length > SOURCES_MAX) return erreur(`${SOURCES_MAX} sources au maximum par brouillon.`, 400);
  const aLire = new Set(Array.isArray(corps.lire) ? corps.lire.filter((v) => typeof v === "string" && ids.includes(v)) : []);
  if (aLire.size > LECTURES_MAX) return erreur(`L'IA lit ${LECTURES_MAX} sources au maximum par brouillon.`, 400);
  const textes =
    corps.textes && typeof corps.textes === "object" ? (corps.textes as Record<string, unknown>) : {};
  const texteDe = (id: string) => (typeof textes[id] === "string" ? (textes[id] as string).trim() : "");
  const notes = typeof corps.notes === "string" ? corps.notes.trim() : "";
  const consignes = typeof corps.consignes === "string" ? corps.consignes.trim() : "";
  if (ids.some((id) => texteDe(id).length > EXTRAIT_MAX) || notes.length > EXTRAIT_MAX) {
    return erreur(`Un texte collé est trop long (${EXTRAIT_MAX} caractères maximum). Gardez les passages utiles.`, 413);
  }
  if (ids.reduce((n, id) => n + texteDe(id).length, notes.length) > TEXTES_TOTAL_MAX) {
    return erreur(`Les textes collés sont trop longs au total (${TEXTES_TOTAL_MAX} caractères maximum).`, 413);
  }
  if (consignes.length > CONSIGNES_MAX) {
    return erreur(`Les consignes sont trop longues (${consignes.length} caractères, ${CONSIGNES_MAX} maximum).`, 413);
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from("site_veille").select("id, titre, resume, lien, source_nom").in("id", ids);
  if (error) return erreur("Les articles de Scan News ne peuvent pas être lus. Reconnectez-vous puis réessayez.", 500);
  const lignes = (data ?? []) as { id: string; titre: string; resume: string | null; lien: string; source_nom: string | null }[];
  if (!lignes.length) return erreur("Ces articles ont été effacés de Scan News (plus de 3 jours).", 404);

  // Ordre de l'éditeur ; alertes Google résolues vers l'adresse du média.
  const sources: SourceLue[] = await Promise.all(
    ids
      .map((id) => lignes.find((l) => l.id === id))
      .filter((l): l is (typeof lignes)[number] => Boolean(l))
      .map(async (l) => {
        const { lien } = await lienReel(l.lien);
        let domaine = "";
        try {
          domaine = new URL(lien).hostname;
        } catch {}
        return { ...l, lien, domaine, texteColle: texteDe(l.id), lire: aLire.has(l.id) };
      })
  );

  // Lectures interdites d'avance (robots.txt) : écartées, et signalées dans le brouillon.
  const refusees: LectureSource[] = [];
  await Promise.all(
    sources
      .filter((s) => s.lire)
      .map(async (s) => {
        if (!s.domaine || (await verifierLisibilite(s.lien)).lisible === "non") {
          s.lire = false;
          refusees.push({ source: s.source_nom ?? (s.domaine || "source"), etat: "echec", raison: raisonLecture("site_refuse_ia") });
        }
      })
  );
  const demandees = sources.filter((s) => s.lire);

  const client = new Anthropic({ timeout: 240_000 });

  /** Lecture des sources demandées puis rédaction ; relance le tour s'il est mis en pause. */
  async function rediger(lectureRefusee: boolean) {
    const avecLecture = demandees.length > 0 && !lectureRefusee;
    // Version de base de web_fetch : elle renvoie le texte lu tel quel (garde-fou des reprises mot pour mot).
    const outils: Anthropic.ToolUnion[] = [
      {
        type: "web_fetch_20250910",
        name: "web_fetch",
        max_uses: demandees.length,
        allowed_domains: [...new Set(demandees.map((s) => s.domaine))],
        max_content_tokens: 30000,
      },
    ];
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: messageSources(sources, { notes, consignes, lectureRefusee }) },
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
      // Site qui interdit la lecture par les robots d'IA sans que son robots.txt l'ait annoncé : l'API refuse
      // toute la demande. On respecte ce choix et on rédige sans lecture (seul le message distingue ce cas).
      if (demandees.length && err instanceof Anthropic.BadRequestError && /not accessible to our user agent/i.test(err.message)) {
        lectureRefusee = true;
        resultat = await rediger(true);
      } else {
        throw err;
      }
    }
    const { reponse, blocs } = resultat;

    if (reponse.stop_reason === "refusal") {
      return erreur("L'IA a refusé de rédiger à partir de ces articles. Rédigez-le vous-même ou choisissez un autre sujet.", 422);
    }
    if (reponse.stop_reason !== "end_turn" || !reponse.parsed_output) {
      console.error("brouillon IA incomplet :", reponse.stop_reason);
      return erreur("L'IA a renvoyé une réponse vide ou incomplète. Réessayez.", 502);
    }

    const lu = lectureRefusee
      ? {
          lectures: demandees.map((s): LectureSource => ({
            source: s.source_nom ?? s.domaine,
            etat: "echec",
            raison: raisonLecture("site_refuse_ia"),
          })),
          texte: "",
        }
      : lecturesDepuis(blocs, demandees);
    const brouillon = construireBrouillon(reponse.parsed_output, sources, [...refusees, ...lu.lectures], lu.texte, notes);
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
