/**
 * app/api/send-confirmation/route.ts
 *
 * Route API Next.js (App Router) — côté serveur.
 * Reçoit les données du nouveau membre + le PDF en base64,
 * puis envoie via Resend (un e-mail individuel par destinataire — voir lib/resend-mail.ts) :
 *   • un email de confirmation personnalisé au membre (avec PDF en pièce jointe)
 *   • une copie à l'adresse admin
 *
 * Variables d'environnement requises :
 *   RESEND_API_KEY      → clé API Resend (secrète, jamais préfixée NEXT_PUBLIC_)
 *   RESEND_FROM_EMAIL   → adresse expéditrice vérifiée dans Resend
 */

import { NextResponse } from "next/server";
import { refuserSiTropDeRequetes } from "@/lib/limite-requetes";
import { buildEmailHtml, type EmailPayload } from "@/lib/emails/confirmation-affiliation";
import { getResendClient } from "@/lib/resend-mail";
import { destinatairesInternes, envoyerEtJournaliser, lireRefs } from "@/lib/envois-serveur";

// ── Handler POST ───────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const tropDeRequetes = refuserSiTropDeRequetes(request, "send-confirmation", 15);
  if (tropDeRequetes) return tropDeRequetes;

  try {
    const body = (await request.json()) as EmailPayload;

    const {
      email, nom, prenom, pdfBase64, fileName,
      affiliationDebut, cotisationMensuelle, modePaiement,
      niss, premiereEcheanceMontant,
    } = body;

    if (!email || !nom || !prenom || !pdfBase64 || !fileName) {
      return NextResponse.json(
        { error: "Données manquantes dans la requête." },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const resend = getResendClient();

    const { error } = await envoyerEtJournaliser(resend, {
      envoi: "affiliation",
      refs: lireRefs({ type: "affiliation", id: body.demandeId }),
      recipients: [email, ...(await destinatairesInternes("affiliation"))],
      subject: `Confirmation de votre demande d'affiliation – Centrale Générale FGTB Namur Luxembourg`,
      html: buildEmailHtml({
        email, nom, prenom, pdfBase64, fileName,
        affiliationDebut:        affiliationDebut        ?? "—",
        cotisationMensuelle:     cotisationMensuelle     ?? null,
        modePaiement:            modePaiement            ?? "domiciliation",
        niss:                    niss                    ?? null,
        premiereEcheanceMontant: premiereEcheanceMontant ?? null,
      }),
      attachments: [{ filename: fileName, content: pdfBuffer }],
    });

    if (error) {
      console.error("[send-confirmation] Erreur Resend :", error);
      return NextResponse.json(
        { error: "Échec de l'envoi de l'email." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[send-confirmation] Erreur inattendue :", err);
    return NextResponse.json(
      { error: "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
