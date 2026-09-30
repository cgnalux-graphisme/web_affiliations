import { NextResponse } from "next/server";
import { getResendClient } from "@/lib/resend-mail";
import { destinatairesInternes, envoyerEtJournaliser, lireRefs } from "@/lib/envois-serveur";

const ADMIN_EMAIL    = "admin.nalux@accg.be";
const TEL_NAMUR      = "+32 (0) 81 64 99 61";
const TEL_LUXEMBOURG = "+32 (0) 61 53 01 60";
const SITE_WEB       = "www.accg-nalux.be";

interface Payload {
  email:       string;
  nom:         string;
  prenom:      string;
  pdfBase64:   string;
  fileName:    string;
  nouveauIban: string;
  typeDemande?: "nouveau_mandat" | "changement_compte";
  /** Id de la ligne web_mandats_sepa (historique des envois). */
  demandeId?: string;
}

function buildHtml(p: Payload): string {
  const libelleDemande =
    p.typeDemande === "nouveau_mandat"
      ? "nouveau mandat SEPA"
      : "changement de numéro de compte / mandat SEPA";
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><title>Mandat SEPA — FGTB</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(34,34,34,0.08);max-width:600px;width:100%;">

      <tr>
        <td style="background:#931510;padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:bold;">Centrale Générale FGTB</p>
          <p style="margin:4px 0 0;color:#ffffff;font-size:12px;">Namur&nbsp;•&nbsp;Luxembourg</p>
        </td>
      </tr>

      <tr>
        <td style="padding:28px 32px 0;">
          <p style="margin:0 0 18px;font-size:15px;color:#222222;">Bonjour <strong>${p.prenom} ${p.nom}</strong>,</p>
          <p style="margin:0 0 14px;font-size:13px;color:#222222;line-height:1.65;">
            Nous avons bien reçu votre demande de <strong>${libelleDemande}</strong>
            auprès de la Centrale Générale FGTB Namur Luxembourg.
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#222222;line-height:1.65;">
            Le mandat signé est joint à ce message en PDF. Notre service administratif le traitera
            dans les meilleurs délais. Votre nouveau compte (<strong style="font-family:monospace;">${p.nouveauIban}</strong>)
            sera actif dès le prochain prélèvement suivant l&apos;enregistrement.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#ffffff;border:1px solid #7C90A0;border-left:4px solid #E32119;border-radius:6px;margin-bottom:24px;">
            <tr>
              <td style="padding:14px 18px;">
                <p style="margin:0 0 6px;font-size:13px;color:#931510;font-weight:bold;">⚠️ INFORMATION IMPORTANTE</p>
                <p style="margin:0 0 10px;font-size:12px;color:#931510;line-height:1.55;">
                  Si vous n&apos;êtes pas l&apos;auteur de cette demande, contactez-nous immédiatement :
                </p>
                <p style="margin:2px 0;font-size:12px;color:#931510;">
                  📧 <a href="mailto:${ADMIN_EMAIL}" style="color:#931510;font-weight:bold;">${ADMIN_EMAIL}</a>
                </p>
                <p style="margin:2px 0;font-size:12px;color:#931510;">📞 Namur : <strong>${TEL_NAMUR}</strong></p>
                <p style="margin:2px 0;font-size:12px;color:#931510;">📞 Luxembourg : <strong>${TEL_LUXEMBOURG}</strong></p>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 24px;font-size:13px;color:#222222;line-height:1.65;">
            Nous restons à votre disposition pour toute question.
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:0 32px 28px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-left:3px solid #931510;padding-left:12px;">
                <p style="margin:0;font-size:13px;color:#222222;font-weight:bold;">Solidairement,</p>
                <p style="margin:4px 0 0;font-size:13px;color:#222222;">L&apos;équipe administrative</p>
                <p style="margin:2px 0 0;font-size:12px;color:#931510;font-weight:bold;">Centrale Générale FGTB Namur Luxembourg</p>
                <p style="margin:4px 0 0;"><a href="https://${SITE_WEB}" style="font-size:12px;color:#931510;text-decoration:none;">${SITE_WEB}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="background:#ffffff;padding:14px 32px;border-top:1px solid #7C90A0;">
          <p style="margin:0;font-size:10px;color:#222222;text-align:center;">
            Centrale Générale FGTB Namur Luxembourg ·
            <a href="mailto:${ADMIN_EMAIL}" style="color:#222222;">${ADMIN_EMAIL}</a><br />
            Ce message a été généré automatiquement. Merci de ne pas y répondre directement.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`.trim();
}

export async function POST(request: Request) {
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
