import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import { messageErreurApi } from "../../../../lib/anthropic-erreurs";
import { aApp } from "../../../../lib/espace/acces";
import { chargerFicheSuivi } from "../../../../lib/fiches-suivi/donnees-serveur";
import { CONSIGNE_FICHE, MODELE_FICHE, SchemaFiche, construireTexte, messageFiche, reponsesRemplies, type ContexteFiche } from "../../../../lib/fiches-suivi/redaction-ia";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status });
}

/**
 * Texte d'une fiche de suivi rédigé par Claude Sonnet 5 (POST { ficheId }). La fiche est relue en base (on ne fait
 * pas confiance au navigateur) ; rien n'est enregistré : le texte revient dans l'éditeur, où le permanent le relit.
 * App « permanents », auteur de la fiche ou SUPER_ADMIN.
 */
export async function POST(request: NextRequest) {
  if (!(await aApp("permanents"))) return erreur("Accès refusé. Reconnectez-vous.", 401);
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("La rédaction assistée n'est pas configurée : la variable ANTHROPIC_API_KEY manque sur le serveur.", 503);
  }
  const corps = (await request.json().catch(() => ({}))) as { ficheId?: unknown };
  const lue = typeof corps.ficheId === "string" ? await chargerFicheSuivi(corps.ficheId) : null;
  if (!lue || !lue.modifiable) return erreur("Fiche introuvable, ou vous n'êtes pas son auteur.", 404);
  const f = lue.fiche;
  const contexte: ContexteFiche = {
    fiche: f,
    entreprise: f.type === "usine" ? f.entreprise : null,
    site: f.type === "usine" ? f.site : null,
    secteur: f.secteur,
    documents: f.documents.map((d) => ({ nom: d.nom_origine, nature: d.nature, nature_autre: d.nature_autre })),
  };
  if (reponsesRemplies(f).length === 0) {
    return erreur("Répondez d'abord à au moins une question du suivi : l'IA ne rédige qu'à partir de vos réponses.", 400);
  }

  try {
    const resultat = await new Anthropic({ timeout: 120_000 }).messages.parse({
      model: MODELE_FICHE,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: zodOutputFormat(SchemaFiche) },
      system: CONSIGNE_FICHE,
      messages: [{ role: "user", content: messageFiche(contexte) }],
    });
    if (resultat.stop_reason === "refusal") {
      return erreur("L'IA a refusé de rédiger ce texte. Rédigez-le vous-même ou reformulez vos réponses.", 422);
    }
    if (resultat.stop_reason !== "end_turn" || !resultat.parsed_output?.texte.trim()) {
      console.error("fiche de suivi incomplète :", resultat.stop_reason);
      return erreur("L'IA a renvoyé une réponse vide ou incomplète. Réessayez.", 502);
    }
    return NextResponse.json({ ...construireTexte(resultat.parsed_output, contexte), modele: MODELE_FICHE });
  } catch (err) {
    console.error("fiche de suivi :", err);
    const { message, status } = messageErreurApi(err, "La rédaction a échoué. Réessayez.");
    return erreur(message, status);
  }
}
