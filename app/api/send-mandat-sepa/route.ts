import { NextResponse } from "next/server";
import { refuserSiTropDeRequetes } from "@/lib/limite-requetes";
import { buildHtml, type Payload } from "@/lib/emails/mandat-sepa";
import { getResendClient } from "@/lib/resend-mail";
import { destinatairesInternes, envoyerEtJournaliser, lireRefs } from "@/lib/envois-serveur";

export async function POST(request: Request) {
  const tropDeRequetes = refuserSiTropDeRequetes(request, "send-mandat-sepa", 15);
  if (tropDeRequetes) return tropDeRequetes;

  try {
    const body = (await request.json()) as Payload;
    const { email, nom, prenom, pdfBase64, fileName, nouveauIban, typeDemande } = body;

    if (!email || !nom || !prenom || !pdfBase64 || !fileName) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const resend = getResendClient();

    const envoi = typeDemande === "changement_compte" ? "changement" : "sepa";
    const { error } = await envoyerEtJournaliser(resend, {
      envoi,
      refs: lireRefs({ type: envoi, id: body.demandeId }),
      recipients: [email, ...(await destinatairesInternes(envoi))],
      subject: `${typeDemande === "nouveau_mandat" ? "Nouveau mandat SEPA" : "Changement de compte / Mandat SEPA"} — Centrale Générale FGTB Namur Luxembourg`,
      html: buildHtml({ email, nom, prenom, pdfBase64, fileName, nouveauIban, typeDemande }),
      attachments: [{ filename: fileName, content: pdfBuffer }],
    });

    if (error) {
      console.error("[send-mandat-sepa] Erreur Resend :", error);
      return NextResponse.json({ error: "Échec envoi email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[send-mandat-sepa] Erreur :", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
