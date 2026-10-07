import { NextResponse } from "next/server";
import { getResendClient } from "@/lib/resend-mail";
import { destinatairesInternes, envoyerEtJournaliser, lireRefs } from "@/lib/envois-serveur";
import { MENTION_COTISATION, MESSAGES_TRANSFERT, depuisLigne, emailValide, recapitulatif, statutTransfert } from "@/lib/modification";

/**
 * « Signaler un changement » : e-mail de confirmation (PDF signé joint) à l'affilié — adresse actuelle
 * et nouvelle adresse s'il en donne une — et aux adresses internes de l'envoi « modification »
 * (écran Paramètres des envois). Le contenu de la demande n'est jamais journalisé.
 */

const ADMIN_EMAIL = "admin.nalux@accg.be";
const TEL_NAMUR = "+32 (0) 81 64 99 61";
const TEL_LUXEMBOURG = "+32 (0) 61 53 01 60";
const SITE_WEB = "www.accg-nalux.be";
/** PDF d'une page : bien en deçà de la limite des requêtes Vercel (4,5 Mo). */
const PDF_MAX = 3_000_000;

function echapper(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type Payload = { donnees?: unknown; demandeId?: unknown; pdfBase64?: unknown; fileName?: unknown };

function construireHtml(prenom: string, nom: string, blocs: ReturnType<typeof recapitulatif>, transfert: ReturnType<typeof statutTransfert>): string {
  const lignesBlocs = blocs
    .map(
      (b) => `
          <tr><td style="padding:12px 0 4px;font-size:14px;font-weight:bold;color:#931510;text-transform:uppercase;">${echapper(b.titre)}</td></tr>
          ${b.lignes
            .map(
              ([l, v]) =>
                `<tr><td style="padding:2px 0;font-size:13px;color:#222222;line-height:1.5;"><strong>${echapper(l)} :</strong> ${echapper(v)}</td></tr>`
            )
            .join("")}
          ${b.changement === "regime" ? `<tr><td style="padding:2px 0;font-size:12px;color:#222222;">${echapper(MENTION_COTISATION)}</td></tr>` : ""}`
    )
    .join("");

  const encartTransfert =
    transfert === "non"
      ? ""
      : `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#931510;border-radius:8px;margin:20px 0;">
            <tr><td style="padding:16px 18px;">
              <p style="margin:0 0 6px;font-size:15px;font-weight:bold;color:#ffffff;">${transfert === "a_organiser" ? "Nous organisons votre transfert" : "Nous vérifions votre secteur"}</p>
              <p style="margin:0;font-size:13px;color:#ffffff;line-height:1.6;">${echapper(MESSAGES_TRANSFERT[transfert])}</p>
            </td></tr>
          </table>`;

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><title>Changement de situation — FGTB</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(34,34,34,0.08);max-width:600px;width:100%;">
      <tr>
        <td style="background:#931510;padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:bold;">Centrale Générale FGTB</p>
          <p style="margin:4px 0 0;color:#ffffff;font-size:12px;">Namur&nbsp;•&nbsp;Luxembourg</p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px 0;">
          <p style="margin:0 0 18px;font-size:15px;color:#222222;">Bonjour <strong>${echapper(prenom)} ${echapper(nom)}</strong>,</p>
          <p style="margin:0 0 6px;font-size:13px;color:#222222;line-height:1.65;">
            Nous avons bien reçu votre <strong>changement de situation</strong>. Le document signé est joint à ce
            message en PDF. Nos services mettront votre dossier à jour dans les meilleurs délais.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #7C90A0;margin-top:14px;">
            ${lignesBlocs}
          </table>
          ${encartTransfert}
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #7C90A0;border-left:4px solid #E32119;border-radius:6px;margin:20px 0 24px;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0 0 6px;font-size:13px;color:#931510;font-weight:bold;">Information importante</p>
              <p style="margin:0 0 8px;font-size:12px;color:#222222;line-height:1.55;">Si vous n&apos;êtes pas l&apos;auteur de cette demande, contactez-nous immédiatement :</p>
              <p style="margin:2px 0;font-size:12px;color:#222222;"><a href="mailto:${ADMIN_EMAIL}" style="color:#931510;font-weight:bold;">${ADMIN_EMAIL}</a></p>
              <p style="margin:2px 0;font-size:12px;color:#222222;">Namur : <strong>${TEL_NAMUR}</strong> · Luxembourg : <strong>${TEL_LUXEMBOURG}</strong></p>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 28px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="border-left:3px solid #931510;padding-left:12px;">
              <p style="margin:0;font-size:13px;color:#222222;font-weight:bold;">Solidairement,</p>
              <p style="margin:4px 0 0;font-size:13px;color:#222222;">L&apos;équipe administrative</p>
              <p style="margin:2px 0 0;font-size:12px;color:#931510;font-weight:bold;">Centrale Générale FGTB Namur-Luxembourg</p>
              <p style="margin:4px 0 0;"><a href="https://${SITE_WEB}" style="font-size:12px;color:#931510;text-decoration:none;">${SITE_WEB}</a></p>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;padding:14px 32px;border-top:1px solid #7C90A0;">
          <p style="margin:0;font-size:10px;color:#222222;text-align:center;">
            Centrale Générale FGTB Namur-Luxembourg · <a href="mailto:${ADMIN_EMAIL}" style="color:#222222;">${ADMIN_EMAIL}</a><br />
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
