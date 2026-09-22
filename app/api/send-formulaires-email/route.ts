/**
 * Envoi des PDF vers l'adresse saisie par la personne.
 * Cet envoi ne part pas vers le service chômage : une seule adresse, celle du champ.
 */
import { NextResponse } from "next/server";
import { buildLivraisonPersonnelleHtml } from "@/lib/onem-email-html";
import { getResendClient, sendIsolatedEmail } from "@/lib/resend-mail";

const ADMIN_EMAIL = "jonathan.hubert@accg.be";
const MAX_FICHIER_OCTETS = 4 * 1024 * 1024;
const MAX_TOTAL_OCTETS = 10 * 1024 * 1024;
const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DocumentPayload {
  label?: string;
  fileName?: string;
  pdfBase64?: string;
}

interface Payload {
  nom?: string;
  prenom?: string;
  to?: string;
  emailDeclarant?: string;
  documents?: DocumentPayload[];
}

function nomFichierSur(nom: string, index: number): string {
  const base = nom.split(/[/\\]/).pop()?.trim() || `formulaire-${index + 1}.pdf`;
  const propre = base.replace(/[^\w.\- ()]/g, "_").slice(0, 120);
  return propre.toLowerCase().endsWith(".pdf") ? propre : `${propre}.pdf`;
}

function decoderPdf(pdfBase64: string): Buffer | null {
  const compact = pdfBase64.replace(/\s/g, "");
  if (!compact || compact.length > 8_000_000) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return null;
  const buffer = Buffer.from(compact, "base64");
  if (buffer.length === 0 || buffer.length > MAX_FICHIER_OCTETS) return null;
  return buffer;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const nom = body.nom?.trim() ?? "";
    const prenom = body.prenom?.trim() ?? "";
    const to = body.to?.trim().toLowerCase() ?? "";
    const emailDeclarant = body.emailDeclarant?.trim().toLowerCase() ?? "";
    const documents = body.documents ?? [];

    if (!nom || !prenom || !EMAIL_VALIDE.test(to) || documents.length === 0) {
      return NextResponse.json({ error: "Données manquantes ou adresse e-mail invalide." }, { status: 400 });
    }

    const pieces: { filename: string; content: Buffer; label: string }[] = [];
    let total = 0;

    for (const [index, document] of documents.entries()) {
      if (!document.pdfBase64) {
        return NextResponse.json({ error: "Un document est incomplet." }, { status: 400 });
      }
      const content = decoderPdf(document.pdfBase64);
      if (!content) {
        return NextResponse.json({ error: "Un document PDF est trop lourd ou illisible." }, { status: 400 });
      }
      total += content.length;
      if (total > MAX_TOTAL_OCTETS) {
        return NextResponse.json({ error: "Les documents sont trop lourds pour l'envoi." }, { status: 400 });
      }
      pieces.push({
        filename: nomFichierSur(document.fileName ?? "", index),
        content,
        label: document.label?.trim() || `Document ${index + 1}`,
      });
    }

    const resend = getResendClient();
    const sujet = `Formulaires remplis — ${prenom} ${nom}`.replace(/[\r\n]/g, " ").slice(0, 180);

    const { error } = await sendIsolatedEmail(resend, {
      recipients: [to],
      subject: sujet,
      html: buildLivraisonPersonnelleHtml({
        nom,
        prenom,
        emailDeclarant,
        documents: pieces.map((piece) => piece.label),
        adminEmail: ADMIN_EMAIL,
      }),
      attachments: pieces.map(({ filename, content }) => ({ filename, content })),
    });

    if (error) {
      console.error("[send-formulaires-email] Erreur Resend :", error);
      return NextResponse.json({ error: "Échec envoi email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-formulaires-email] Erreur :", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
