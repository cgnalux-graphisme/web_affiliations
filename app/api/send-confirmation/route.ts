/**
 * app/api/send-confirmation/route.ts
 *
 * Route API Next.js (App Router) — côté serveur.
 * Reçoit les données du nouveau membre + le PDF en base64,
 * puis envoie via Resend :
 *   • un email de confirmation personnalisé au membre (avec PDF en pièce jointe)
 *   • une copie à l'adresse admin
 *
 * Variables d'environnement requises :
 *   RESEND_API_KEY      → clé API Resend (secrète, jamais préfixée NEXT_PUBLIC_)
 *   RESEND_FROM_EMAIL   → adresse expéditrice vérifiée dans Resend
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";

// ── Constantes ─────────────────────────────────────────────────────────────────
const ADMIN_EMAIL   = "admin.nalux@accg.be";
const TEL_NAMUR     = "+32 (0) 81 64 99 61";
const TEL_LUXEMBOURG = "+32 (0) 61 53 01 60";
const SITE_WEB      = "www.accg-nalux.be";
const IBAN_VIREMENT = "BE94 8791 5049 0114";

// ── Client Resend ──────────────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Types des données reçues ───────────────────────────────────────────────────
interface EmailPayload {
  email:                    string;
  nom:                      string;
  prenom:                   string;
  pdfBase64:                string;
  fileName:                 string;
  affiliationDebut:         string;   // ex: "Mars 2026"
  cotisationMensuelle:      string | null;   // ex: "19.00"
  modePaiement:             string;   // "domiciliation" | "virement"
  niss:                     string | null;
  premiereEcheanceMontant:  string | null;   // ex: "57.00" (virement seulement)
}

// ── Template HTML de l'email ───────────────────────────────────────────────────
function buildEmailHtml(p: EmailPayload): string {
  const isDomiciliation = p.modePaiement === "domiciliation";

  // Bloc conditionnel selon le mode de paiement
  const paiementBloc = isDomiciliation
    ? `<tr>
         <td style="padding:0 0 8px 0;">
           <table width="100%" cellpadding="0" cellspacing="0">
             <tr>
               <td width="10" style="background-color:#b91c1c;border-radius:2px;">&nbsp;</td>
               <td style="padding-left:12px;font-size:13px;color:#374151;line-height:1.6;">
                 <strong style="color:#111827;">Domiciliation automatique</strong> —
                 Le prélèvement de <strong>${p.cotisationMensuelle ?? "—"}&nbsp;€</strong>
                 sera effectué automatiquement chaque mois sur votre compte.
               </td>
             </tr>
           </table>
         </td>
       </tr>`
    : `<tr>
         <td style="padding:0 0 8px 0;">
           <table width="100%" cellpadding="0" cellspacing="0">
             <tr>
               <td width="10" style="background-color:#b91c1c;border-radius:2px;">&nbsp;</td>
               <td style="padding-left:12px;font-size:13px;color:#374151;line-height:1.6;">
                 <strong style="color:#111827;">Virement trimestriel</strong> —
                 Merci d'effectuer votre premier versement de
                 <strong>${p.premiereEcheanceMontant ?? "—"}&nbsp;€</strong>
                 sur le compte <strong style="font-family:monospace;">${IBAN_VIREMENT}</strong>
                 avec votre NISS (<strong>${p.niss ?? "—"}</strong>) en communication.
               </td>
             </tr>
           </table>
         </td>
       </tr>`;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmation d'affiliation FGTB</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background-color:#ffffff;border-radius:12px;overflow:hidden;
               box-shadow:0 2px 10px rgba(0,0,0,0.08);max-width:600px;width:100%;">

        <!-- ══ BANDEAU FGTB ══════════════════════════════════════════════ -->
        <tr>
          <td style="background-color:#b91c1c;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;line-height:1.2;">
                    Centrale Générale FGTB
                  </p>
                  <p style="margin:4px 0 0;color:#fca5a5;font-size:12px;">
                    Namur&nbsp;•&nbsp;Luxembourg
                  </p>
                </td>
                <td align="right">
                  <p style="margin:0;color:#fecaca;font-size:11px;">Confirmation d'affiliation</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ CORPS ═════════════════════════════════════════════════════ -->
        <tr>
          <td style="padding:28px 32px 0;">

            <!-- Salutation -->
            <p style="margin:0 0 18px;font-size:15px;color:#111827;">
              Bonjour <strong>${p.prenom} ${p.nom}</strong>,
            </p>

            <!-- Intro -->
            <p style="margin:0 0 14px;font-size:13px;color:#374151;line-height:1.65;">
              Nous avons bien reçu votre demande d'affiliation à la
              <strong>Centrale Générale FGTB Namur Luxembourg</strong>
              et nous vous remercions de votre confiance.
            </p>
            <p style="margin:0 0 20px;font-size:13px;color:#374151;line-height:1.65;">
              Vous trouverez en pièce jointe de cet e-mail le
              <strong>récapitulatif de votre demande au format PDF</strong>,
              comprenant les informations transmises ainsi que votre mandat de paiement.
            </p>

            <!-- ⚠️ ENCADRÉ IMPORTANT -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background-color:#fffbeb;border:1px solid #fde68a;
                     border-left:4px solid #f59e0b;border-radius:6px;margin-bottom:24px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0 0 6px;font-size:13px;color:#92400e;font-weight:bold;">
                    ⚠️ INFORMATION IMPORTANTE
                  </p>
                  <p style="margin:0 0 10px;font-size:12px;color:#78350f;line-height:1.55;">
                    Si vous n'êtes pas l'auteur de cette demande d'affiliation,
                    merci de nous contacter dans les plus brefs délais :
                  </p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:2px 0;font-size:12px;color:#92400e;">
                        📧 E-mail :&nbsp;
                        <a href="mailto:${ADMIN_EMAIL}"
                          style="color:#b45309;font-weight:bold;">${ADMIN_EMAIL}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:2px 0;font-size:12px;color:#92400e;">
                        📞 Téléphone (Namur) : <strong>${TEL_NAMUR}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:2px 0;font-size:12px;color:#92400e;">
                        📞 Téléphone (Luxembourg) : <strong>${TEL_LUXEMBOURG}</strong>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- PROCHAINES ÉTAPES -->
            <p style="margin:0 0 12px;font-size:14px;color:#111827;font-weight:bold;">
              Prochaines étapes de votre affiliation
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <!-- Étape 1 — Traitement -->
              <tr>
                <td style="padding:0 0 10px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="10" style="background-color:#b91c1c;border-radius:2px;">&nbsp;</td>
                      <td style="padding-left:12px;font-size:13px;color:#374151;line-height:1.6;">
                        <strong style="color:#111827;">Traitement de votre dossier</strong> —
                        Notre équipe administrative vérifie actuellement vos données.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Étape 2 — Activation -->
              <tr>
                <td style="padding:0 0 10px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="10" style="background-color:#b91c1c;border-radius:2px;">&nbsp;</td>
                      <td style="padding-left:12px;font-size:13px;color:#374151;line-height:1.6;">
                        <strong style="color:#111827;">Activation</strong> —
                        Votre affiliation prendra cours à partir du mois de
                        <strong>${p.affiliationDebut}</strong> comme demandé.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
                          <!-- AVANTAGES -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background-color:#fef2f2;border-left:4px solid #b91c1c;
                     border-radius:4px;margin:18px 0 24px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0 0 6px;font-size:13px;color:#7f1d1d;font-weight:bold;">
                    Vos avantages en tant que membre
                  </p>
                  <p style="margin:0;font-size:12px;color:#991b1b;line-height:1.6;">
                    En tant que membre, après votre stage de 3 mois,vous bénéficierez de notre
                    <strong>assistance juridique gratuite</strong> pour tout dossier lié
                    au droit du travail belge, ainsi que de l'accès à nos différents
                    services.
                  </p>
                </td>
              </tr>
            </table>

            <!-- CONTACT -->
            <p style="margin:0 0 24px;font-size:13px;color:#374151;line-height:1.65;">
              Nous restons à votre entière disposition pour toute question complémentaire.
            </p>

          </td>
        </tr>

        <!-- ══ SIGNATURE ════════════════════════════════════════════════ -->
        <tr>
          <td style="padding:0 32px 28px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-left:3px solid #b91c1c;padding-left:12px;">
                  <p style="margin:0;font-size:13px;color:#111827;font-weight:bold;">
                    Solidairement,
                  </p>
                  <p style="margin:4px 0 0;font-size:13px;color:#374151;">
                    L'équipe administrative
                  </p>
                  <p style="margin:2px 0 0;font-size:12px;color:#b91c1c;font-weight:bold;">
                    Centrale Générale FGTB Namur Luxembourg
                  </p>
                  <p style="margin:4px 0 0;">
                    <a href="https://${SITE_WEB}"
                      style="font-size:12px;color:#b91c1c;text-decoration:none;">
                      ${SITE_WEB}
                    </a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ PIED DE PAGE ═════════════════════════════════════════════ -->
        <tr>
          <td style="background-color:#f9fafb;padding:14px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:10px;color:#9ca3af;text-align:center;line-height:1.5;">
              Centrale Générale FGTB Namur Luxembourg ·
              <a href="mailto:${ADMIN_EMAIL}" style="color:#9ca3af;">${ADMIN_EMAIL}</a><br />
              Ce message a été généré automatiquement. Merci de ne pas y répondre directement.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
  `.trim();
}

// ── Handler POST ───────────────────────────────────────────────────────────────
export async function POST(request: Request) {
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

    const { error } = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? "noreply@accg.be",
      to:      [email],
      cc:      [ADMIN_EMAIL],
      subject: `Confirmation de votre demande d'affiliation – Centrale Générale FGTB Namur Luxembourg`,
      html:    buildEmailHtml({
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
