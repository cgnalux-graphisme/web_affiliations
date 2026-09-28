import { NextResponse } from "next/server";
import { buildC32Html } from "@/lib/onem-email-html";
import { getResendClient } from "@/lib/resend-mail";
import { destinatairesInternes, envoyerEtJournaliser, lireRefs } from "@/lib/envois-serveur";

// Adresse de contact citée dans le texte du mail (les destinataires sont réglés dans Paramètres).
const ADMIN_EMAIL = "jonathan.hubert@accg.be";

interface Payload {
  nom: string;
  prenom: string;
  email: string;
  pdfBase64: string;
  fileName: string;
  /** Id de la ligne web_c3_2 (historique des envois). */
  demandeId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const { nom, prenom, email, pdfBase64, fileName } = body;

    if (!nom || !prenom || !pdfBase64 || !fileName) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const resend = getResendClient();

    const { error } = await envoyerEtJournaliser(resend, {
      envoi: "c32",
      refs: lireRefs({ type: "c32", id: body.demandeId }),
      recipients: [...(await destinatairesInternes("c32")), email],
      subject: `Formulaire C3.2 — ${prenom} ${nom}`,
      html: buildC32Html({ nom, prenom, email, adminEmail: ADMIN_EMAIL }),
      attachments: [{ filename: fileName, content: pdfBuffer }],
    });

    if (error) {
      console.error("[send-c3-2] Erreur Resend :", error);
      return NextResponse.json({ error: "Échec envoi email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-c3-2] Erreur :", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
