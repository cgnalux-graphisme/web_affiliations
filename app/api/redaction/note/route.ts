import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { messageErreurApi } from "../../../../lib/anthropic-erreurs";
import { BUCKET_NOTES } from "../../../../lib/articles";
import { ErreurNote, NOTE_TAILLE_MAX, extraireTexteNote, nomArchive } from "../../../../lib/notes-extraction";
import { getSuperAdmin } from "../../../../lib/supabase-server";
import { getSupabaseService } from "../../../../lib/supabase-service";
import {
  CONSIGNE_VULGARISATION,
  MODELE_VULGARISATION,
  SchemaVulgarisation,
  construireVulgarisation,
  messageNote,
} from "../../../../lib/vulgarisation-ia";

export const dynamic = "force-dynamic";
// Extraction + vulgarisation d'une note de plusieurs pages : jusqu'à 2 ou 3 minutes.
export const maxDuration = 300;

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status });
}

/**
 * « On vous explique » : reçoit une note FGTB (.docx ou .pdf), en extrait le texte, la fait vulgariser
 * par Claude Sonnet 5 et archive le fichier d'origine dans le bucket privé notes-sources.
 * Entrée : multipart/form-data, champ « fichier ». Sortie : { vulgarisation, document_source, archive }.
 * Réservé aux super admins. La clé API et la clé service_role ne quittent jamais le serveur.
 */
export async function POST(request: Request) {
  if (!(await getSuperAdmin())) return erreur("Accès refusé. Reconnectez-vous.", 401);
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("La vulgarisation n'est pas configurée : la variable ANTHROPIC_API_KEY manque sur le serveur.", 503);
  }

  const form = await request.formData().catch(() => null);
  const fichier = form?.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return erreur("Aucun fichier reçu. Choisissez une note .docx ou .pdf.", 400);
  if (fichier.size > NOTE_TAILLE_MAX) {
    return erreur(
      `Le fichier est trop lourd (${(fichier.size / 1024 / 1024).toFixed(1).replace(".", ",")} Mo, 4 Mo maximum). Pour un PDF, essayez la version Word de la note.`,
      413
    );
  }

  const octets = new Uint8Array(await fichier.arrayBuffer());
  let texte: string;
  let format: "docx" | "pdf";
  try {
    ({ texte, format } = await extraireTexteNote(fichier.name, octets));
  } catch (err) {
    if (err instanceof ErreurNote) return erreur(err.message, 422);
    console.error("note (extraction) :", err instanceof Error ? err.message : "erreur");
    return erreur("Le texte de la note n'a pas pu être extrait. Réessayez avec la version Word.", 422);
  }

  // Vulgarisation
  let vulgarisation;
  try {
    const client = new Anthropic({ timeout: 240_000 });
    const reponse = await client.messages.parse({
      model: MODELE_VULGARISATION,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: zodOutputFormat(SchemaVulgarisation) },
      system: CONSIGNE_VULGARISATION,
      messages: [{ role: "user", content: messageNote(texte, fichier.name) }],
    });
    if (reponse.stop_reason === "refusal") {
      return erreur("L'IA a refusé de vulgariser cette note. Rédigez l'explication vous-même.", 422);
    }
    if (reponse.stop_reason !== "end_turn" || !reponse.parsed_output) {
      console.error("note (IA) : réponse incomplète", reponse.stop_reason);
      return erreur("L'IA a renvoyé une réponse vide ou incomplète. Réessayez.", 502);
    }
    vulgarisation = construireVulgarisation(reponse.parsed_output, texte);
    if (!vulgarisation.contenu.trim() || !vulgarisation.titre) {
      return erreur("L'IA a renvoyé un contenu vide. Réessayez.", 502);
    }
  } catch (err) {
    console.error("note (IA) :", err instanceof Error ? err.message : "erreur");
    const { message, status } = messageErreurApi(err, "La vulgarisation a échoué. Réessayez.");
    return erreur(message, status);
  }

  // Archive du fichier d'origine (traçabilité interne). Un échec n'empêche pas d'utiliser la vulgarisation.
  let documentSource: string | null = null;
  const db = getSupabaseService();
  if (db) {
    const chemin = `${new Date().getFullYear()}/${crypto.randomUUID()}-${nomArchive(fichier.name, format)}`;
    const { error } = await db.storage.from(BUCKET_NOTES).upload(chemin, octets, {
      contentType:
        format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });
    if (error) console.error("note (archive) :", error.message);
    else documentSource = chemin;
  }

  return NextResponse.json({
    vulgarisation,
    document_source: documentSource,
    archive: documentSource
      ? null
      : "La note n'a pas pu être archivée : la vulgarisation reste utilisable, mais gardez le fichier d'origine.",
    modele: MODELE_VULGARISATION,
  });
}
