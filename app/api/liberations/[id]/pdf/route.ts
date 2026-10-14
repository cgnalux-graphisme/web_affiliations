import { contexteLiberations } from "../../../../../lib/liberations/donnees-serveur";
import {
  documentAttestationPerte, documentCourrier, documentFichePaiement, nomParticipant, preparerCourriers,
} from "../../../../../lib/liberations/courriers-serveur";
import { nomFichierCourrier, type GenreCourrier } from "../../../../../lib/liberations/courriers";
import { pdfAttestationPerte, pdfCourrier, pdfFichePaiement } from "../../../../../lib/liberations/pdf/rendu";

/**
 * PDF d'un document de libération : GET ?doc=lettre_employeur|convocation|attestation_presence|attestation_perte|fiche_paiement
 * &participant=<id> (ou « tous » pour une impression groupée des courriers et attestations).
 * Réservé aux admins (ADMIN_OP, SUPER_ADMIN) : le document contient des données personnelles. Rien n'est enregistré.
 */
export const dynamic = "force-dynamic";

const COURRIERS: GenreCourrier[] = ["lettre_employeur", "convocation", "attestation_presence"];
const DOCS = [...COURRIERS, "attestation_perte", "fiche_paiement"] as const;

function erreur(statut: number, message: string) {
  return new Response(message, { status: statut, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await contexteLiberations();
  if (!c?.admin) return erreur(403, "Réservé aux admins (ADMIN_OP, SUPER_ADMIN).");
  const { id } = await params;
  const url = new URL(requete.url);
  const doc = url.searchParams.get("doc") ?? "";
  const qui = url.searchParams.get("participant") ?? "";
  if (!(DOCS as readonly string[]).includes(doc)) return erreur(400, "Document inconnu.");
  const prep = await preparerCourriers(id, c);
  if (!prep) return erreur(404, "Dossier introuvable.");
  const participants = qui === "tous" ? prep.dossier.participants : prep.dossier.participants.filter((p) => p.id === qui);
  if (!participants.length) return erreur(404, "Participant introuvable.");
  if (doc === "fiche_paiement" && participants.length > 1) return erreur(400, "Une fiche de paiement à la fois.");

  try {
    let pdf: Buffer;
    if (doc === "attestation_perte") pdf = await pdfAttestationPerte(participants.map((p) => documentAttestationPerte(prep, p)));
    else if (doc === "fiche_paiement") pdf = await pdfFichePaiement(documentFichePaiement(prep, participants[0]));
    else pdf = await pdfCourrier(participants.map((p) => documentCourrier(prep, p, doc as GenreCourrier)));
    const nom = participants.length > 1 ? `${doc.replace(/_/g, "-")}-dossier-${prep.dossier.numero}.pdf` : nomFichierCourrier(doc, nomParticipant(participants[0]));
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${url.searchParams.get("telecharger") ? "attachment" : "inline"}; filename="${nom}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[liberations] PDF :", err instanceof Error ? err.message : "erreur");
    return erreur(500, "Le PDF n'a pas pu être fabriqué. Réessayez dans un instant.");
  }
}
