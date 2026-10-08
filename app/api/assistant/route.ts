import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import {
  CATEGORIES,
  ETAT_INITIAL,
  IDS_DEMARCHES,
  MESSAGES_MAX,
  MESSAGE_MAX,
  codePostalSeul,
  codePostalValide,
  type ActionAssistant,
  type Categorie,
  type EtatAssistant,
  type IdDemarche,
} from "../../../lib/assistant";
import { assistantActif, chargerDonneesAssistant } from "../../../lib/assistant-donnees";
import {
  JETONS_MAX,
  MODELE_ASSISTANT,
  consigneSysteme,
  messageClassement,
  schemaExtraction,
  verifierExtraction,
  type Tour,
} from "../../../lib/assistant-ia";
import {
  appliquerAction,
  construireReponse,
  fusionnerExtraction,
  type DonneesAssistant,
} from "../../../lib/assistant-parcours";
import { accepterRequete, adresseIp } from "../../../lib/limite-requetes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PRIVE = { "Cache-Control": "private, no-store" };

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status, headers: PRIVE });
}

/** État reçu du navigateur → état sûr (chaque valeur revérifiée contre les listes et la base). */
function etatSur(brut: unknown, d: DonneesAssistant): EtatAssistant {
  const e = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const texte = (v: unknown) => (typeof v === "string" ? v : "");
  const cp = texte(e.codePostal);
  const categorie = texte(e.categorie);
  const demarche = texte(e.demarche);
  const statut = texte(e.statut);
  const employeur = texte(e.employeurNettoyage);
  return {
    ...ETAT_INITIAL,
    codePostal: codePostalValide(cp) ? cp : null,
    categorie: (CATEGORIES as readonly string[]).includes(categorie) ? (categorie as Categorie) : null,
    demarche: (IDS_DEMARCHES as readonly string[]).includes(demarche) ? (demarche as IdDemarche) : null,
    secteur: d.secteurs.some((s) => s.mot_cle === e.secteur) ? (e.secteur as string) : null,
    statut: statut === "ouvrier" || statut === "employe" ? statut : null,
    cpCode: d.repartition.some((r) => r.cp_code === e.cpCode) ? (e.cpCode as string) : null,
    cpInconnu: e.cpInconnu === true,
    employeurNettoyage: employeur === "nettoyage" || employeur === "titres_services" || employeur === "autre" ? employeur : null,
    tentativesCp: Math.min(Math.max(Number(e.tentativesCp) || 0, 0), 5),
    affilie: typeof e.affilie === "boolean" ? e.affilie : null,
    resume: texte(e.resume).slice(0, 600),
  };
}

function toursSurs(brut: unknown): Tour[] {
  if (!Array.isArray(brut)) return [];
  return brut
    .filter((t): t is { role: string; texte: string } => !!t && typeof t === "object" && typeof (t as Tour).texte === "string")
    .map((t) => ({ role: t.role === "personne" ? ("personne" as const) : ("assistant" as const), texte: t.texte.slice(0, 1000) }))
    .slice(-2 * MESSAGES_MAX);
}

function actionSure(brut: unknown): ActionAssistant | null {
  if (!brut || typeof brut !== "object") return null;
  const a = brut as Record<string, unknown>;
  switch (a.type) {
    case "categorie":
    case "cp":
    case "statut":
    case "employeur":
    case "secteur":
      return typeof a.valeur === "string" ? ({ type: a.type, valeur: a.valeur } as ActionAssistant) : null;
    case "affilie":
      return typeof a.valeur === "boolean" ? { type: "affilie", valeur: a.valeur } : null;
    case "cp_inconnu":
      return { type: "cp_inconnu" };
    case "lieu_autre":
      return { type: "lieu_autre" };
    default:
      return null;
  }
}

/**
 * Un tour de l'Assistant CG. Entrée : { etat, tours, message } (texte libre, classé par l'IA) ou
 * { etat, action } (bouton, sans IA). Sortie : { etat, blocs } écrits par le code (lib/assistant-parcours.ts).
 * Rien n'est enregistré : la conversation n'existe que dans le navigateur de la personne.
 */
export async function POST(request: Request) {
  if (!(await assistantActif())) return erreur("L'assistant n'est pas disponible pour le moment.", 404);

  const corps = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!corps) return erreur("Requête illisible.", 400);

  const ip = adresseIp(request);
  const action = actionSure(corps.action);
  const message = typeof corps.message === "string" ? corps.message.trim() : "";

  if (!action) {
    if (!message) return erreur("Écrivez votre question.", 400);
    if (message.length > MESSAGE_MAX) return erreur(`Votre message dépasse ${MESSAGE_MAX} caractères. Raccourcissez-le.`, 400);
    if (!accepterRequete(`assistant:${ip}`, 30, 10 * 60_000)) {
      return erreur("Trop de messages en peu de temps. Patientez quelques minutes, ou appelez directement nos bureaux.", 429);
    }
  } else if (!accepterRequete(`assistant-bouton:${ip}`, 120, 10 * 60_000)) {
    return erreur("Trop de demandes en peu de temps. Patientez quelques minutes.", 429);
  }

  const donnees = await chargerDonneesAssistant();
  if (!donnees) return erreur("L'assistant ne peut pas charger ses informations. Réessayez plus tard ou appelez nos bureaux.", 503);

  const etat = etatSur(corps.etat, donnees);
  const tours = toursSurs(corps.tours);

  if (action) {
    const r = appliquerAction(etat, action, donnees);
    return NextResponse.json(construireReponse(r.etat, donnees, { secteurIntrouvable: r.secteurIntrouvable }), { headers: PRIVE });
  }

  if (tours.filter((t) => t.role === "personne").length >= MESSAGES_MAX) {
    return erreur(`Cette conversation a atteint ${MESSAGES_MAX} messages. Recommencez une nouvelle conversation, ou appelez nos bureaux.`, 429);
  }

  // Un code postal seul n'a pas besoin de l'IA.
  const cpSeul = codePostalSeul(message);
  if (cpSeul) {
    const r = fusionnerExtraction(
      etat,
      { codePostal: cpSeul, categorie: null, demarche: null, secteur: null, statut: null, cpCode: null, employeurNettoyage: null, affilie: null, demandeFond: false, resume: "" },
      donnees
    );
    return NextResponse.json(construireReponse(r.etat, donnees, { secteurIntrouvable: r.secteurIntrouvable }), { headers: PRIVE });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[assistant] ANTHROPIC_API_KEY manquante");
    return erreur("L'assistant n'est pas disponible pour le moment. Appelez nos bureaux.", 503);
  }

  try {
    const reponse = await new Anthropic({ timeout: 45_000, maxRetries: 1 }).messages.parse({
      model: MODELE_ASSISTANT,
      max_tokens: JETONS_MAX,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: zodOutputFormat(schemaExtraction(donnees)) },
      system: [{ type: "text", text: consigneSysteme(donnees), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: messageClassement([...tours, { role: "personne", texte: message }], etat) }],
    });
    const fiche = reponse.parsed_output;
    if (reponse.stop_reason !== "end_turn" || !fiche) {
      // Refus ou réponse incomplète : on ne devine rien, le parcours repose la question en cours.
      console.error("[assistant] classement incomplet :", reponse.stop_reason);
      return NextResponse.json(construireReponse(etat, donnees), { headers: PRIVE });
    }
    const x = verifierExtraction(fiche, donnees);
    const r = fusionnerExtraction(etat, x, donnees);
    return NextResponse.json(
      construireReponse(r.etat, donnees, { refusFond: x.demandeFond, secteurIntrouvable: r.secteurIntrouvable }),
      { headers: PRIVE }
    );
  } catch (err) {
    // Jamais le contenu du message dans les journaux.
    console.error("[assistant] Erreur IA :", err instanceof Anthropic.APIError ? `${err.status} ${err.name}` : err instanceof Error ? err.name : "inconnue");
    return erreur("L'assistant ne répond pas pour le moment. Réessayez dans un instant, ou appelez nos bureaux.", 503);
  }
}
