import { NextResponse } from "next/server";
import { Resend } from "resend";

const ADMIN_EMAIL    = "jonathan.hubert@accg.be";
const TEL_NAMUR      = "+32 (0) 81 64 99 61";
const TEL_LUXEMBOURG = "+32 (0) 61 53 01 60";
const SITE_WEB       = "www.accg-nalux.be";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY manquante");
  return new Resend(apiKey);
}

interface Payload {
  nom:       string;
  prenom:    string;
  email:     string;
  pdfBase64: string;
  fileName:  string;
}

function buildHtml(p: Payload): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><title>Formulaire C1 — FGTB</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);max-width:600px;width:100%;">

      <tr>
        <td style="background:#b91c1c;padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:bold;">Centrale Générale FGTB</p>
          <p style="margin:4px 0 0;color:#fca5a5;font-size:12px;">Namur&nbsp;•&nbsp;Luxembourg</p>
        </td>
      </tr>

      <tr>
        <td style="padding:28px 32px 0;">
          <p style="margin:0 0 18px;font-size:15px;color:#111;">
            Nouveau formulaire C1 reçu de <strong>${p.prenom} ${p.nom}</strong>
          </p>
          <p style="margin:0 0 14px;font-size:13px;color:#374151;line-height:1.65;">
            Un formulaire C1 (Déclaration de situation personnelle et familiale — ONEM) a été complété
            et signé en ligne. Le document rempli est joint en pièce jointe.
          </p>
          ${p.email ? `<p style="margin:0 0 20px;font-size:13px;color:#374151;line-height:1.65;">
            Adresse e-mail du déclarant : <a href="mailto:${p.email}" style="color:#b91c1c;">${p.email}</a>
          </p>` : ""}
        </td>
      </tr>

      <tr>
        <td style="padding:0 32px 28px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-left:3px solid #b91c1c;padding-left:12px;">
                <p style="margin:0;font-size:13px;color:#111;font-weight:bold;">Solidairement,</p>
                <p style="margin:4px 0 0;font-size:13px;color:#374151;">Le formulaire en ligne</p>
                <p style="margin:2px 0 0;font-size:12px;color:#b91c1c;font-weight:bold;">Centrale Générale FGTB Namur Luxembourg</p>
                <p style="margin:4px 0 0;font-size:12px;color:#374151;">📞 Namur : ${TEL_NAMUR} &nbsp;|&nbsp; Luxembourg : ${TEL_LUXEMBOURG}</p>
                <p style="margin:4px 0 0;"><a href="https://${SITE_WEB}" style="font-size:12px;color:#b91c1c;text-decoration:none;">${SITE_WEB}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="background:#f9fafb;padding:14px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:10px;color:#9ca3af;text-align:center;">
            Centrale Générale FGTB Namur Luxembourg ·
            <a href="mailto:${ADMIN_EMAIL}" style="color:#9ca3af;">${ADMIN_EMAIL}</a><br />
            Ce message a été généré automatiquement.
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
    const { nom, prenom, email, pdfBase64, fileName } = body;

    if (!nom || !prenom || !pdfBase64 || !fileName) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const resend = getResendClient();

    const to: string[] = [ADMIN_EMAIL];
    if (email) to.push(email);

    const { error } = await resend.emails.send({
      from:        process.env.RESEND_FROM_EMAIL ?? "noreply@accg.be",
      to,
      subject:     `Formulaire C1 — ${prenom} ${nom}`,
      html:        buildHtml({ nom, prenom, email, pdfBase64, fileName }),
      attachments: [{ filename: fileName, content: pdfBuffer }],
    });

    if (error) {
      console.error("[send-c1] Erreur Resend :", error);
      return NextResponse.json({ error: "Échec envoi email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[send-c1] Erreur :", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
