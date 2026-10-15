import { NextResponse } from "next/server";
import { refuserSiTropDeRequetes } from "@/lib/limite-requetes";
import { getResendClient } from "@/lib/resend-mail";
import { destinatairesInternes, envoyerEtJournaliser, lireRefs } from "@/lib/envois-serveur";
import { construireHtml } from "@/lib/emails/modification";
import { depuisLigne, emailValide, recapitulatif, statutTransfert } from "@/lib/modification";

/**
 * « Signaler un changement » : e-mail de confirmation (PDF signé joint) à l'affilié — adresse actuelle
 * et nouvelle adresse s'il en donne une — et aux adresses internes de l'envoi « modification »
 * (écran Paramètres des envois). Le contenu de la demande n'est jamais journalisé.
 */

/** PDF d'une page : bien en deçà de la limite des requêtes Vercel (4,5 Mo). */
const PDF_MAX = 3_000_000;

type Payload = { donnees?: unknown; demandeId?: unknown; pdfBase64?: unknown; fileName?: unknown };

export async function POST(request: Request) {
  const tropDeRequetes = refuserSiTropDeRequetes(request, "send-modification", 15);
  if (tropDeRequetes) return tropDeRequetes;

  try {
    const body = (await request.json().catch(() => null)) as Payload | null;
    const donnees = body?.donnees && typeof body.donnees === "object" ? (body.donnees as Record<string, unknown>) : null;
    const pdfBase64 = typeof body?.pdfBase64 === "string" ? body.pdfBase64 : "";
    const fileName = typeof body?.fileName === "string" && /^[a-z0-9-]{1,120}\.pdf$/.test(body.fileName) ? body.fileName : "";
    if (!donnees || !pdfBase64 || !fileName) return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    if (pdfBase64.length > PDF_MAX) return NextResponse.json({ error: "Document trop volumineux." }, { status: 413 });

    const form = depuisLigne(donnees);
    const email = form.email.trim().toLowerCase();
    if (!emailValide(email) || !form.nom.trim() || !form.prenom.trim() || !form.changements.length) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }
    const nouvelEmail = form.nouvelEmail.trim().toLowerCase();
    const blocs = recapitulatif(form);
    const transfert = statutTransfert(form);

    const resend = getResendClient();
    const { error } = await envoyerEtJournaliser(resend, {
      envoi: "modification",
      refs: lireRefs({ type: "modification", id: body?.demandeId }),
      recipients: [email, ...(emailValide(nouvelEmail) ? [nouvelEmail] : []), ...(await destinatairesInternes("modification"))],
      subject: "Changement de situation — Centrale Générale FGTB Namur-Luxembourg",
      html: construireHtml(form.prenom.trim(), form.nom.trim(), blocs, transfert),
      attachments: [{ filename: fileName, content: Buffer.from(pdfBase64, "base64") }],
    });

    if (error) {
      console.error("[send-modification] échec de l'envoi Resend.");
      return NextResponse.json({ error: "Échec de l'envoi de l'e-mail." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-modification] erreur :", err instanceof Error ? err.message : "inconnue");
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
