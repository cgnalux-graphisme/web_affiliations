const TEL_NAMUR = "+32 (0) 81 64 99 61";
const TEL_LUXEMBOURG = "+32 (0) 61 53 01 60";
const SITE_WEB = "www.accg-nalux.be";

function emailShell(title: string, body: string, adminEmail: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><title>${title}</title></head>
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
      ${body}
      <tr>
        <td style="background:#f9fafb;padding:14px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:10px;color:#9ca3af;text-align:center;">
            Centrale Générale FGTB Namur Luxembourg ·
            <a href="mailto:${adminEmail}" style="color:#9ca3af;">${adminEmail}</a><br />
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

function signatureBlock(): string {
  return `
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
      </tr>`;
}

export function buildC1Html(p: {
  nom: string;
  prenom: string;
  email: string;
  adminEmail: string;
}): string {
  const body = `
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
      ${signatureBlock()}`;

  return emailShell("Formulaire C1 — FGTB", body, p.adminEmail);
}

export function buildC32Html(p: {
  nom: string;
  prenom: string;
  email: string;
  adminEmail: string;
}): string {
  const body = `
      <tr>
        <td style="padding:28px 32px 0;">
          <p style="margin:0 0 18px;font-size:15px;color:#111;">
            Nouveau formulaire C3.2 reçu de <strong>${p.prenom} ${p.nom}</strong>
          </p>
          <p style="margin:0 0 14px;font-size:13px;color:#374151;line-height:1.65;">
            Un formulaire C3.2 (Demande d&apos;allocations de chômage temporaire — ONEM) a été complété
            et signé en ligne. Le document rempli est joint en pièce jointe.
          </p>
          ${p.email ? `<p style="margin:0 0 20px;font-size:13px;color:#374151;line-height:1.65;">
            Adresse e-mail du déclarant : <a href="mailto:${p.email}" style="color:#b91c1c;">${p.email}</a>
          </p>` : ""}
        </td>
      </tr>
      ${signatureBlock()}`;

  return emailShell("Formulaire C3.2 — FGTB", body, p.adminEmail);
}

export function buildOnemBundleHtml(p: {
  nom: string;
  prenom: string;
  email: string;
  adminEmail: string;
}): string {
  const body = `
      <tr>
        <td style="padding:28px 32px 0;">
          <p style="margin:0 0 18px;font-size:15px;color:#111;">
            Nouveaux formulaires ONEM reçus de <strong>${p.prenom} ${p.nom}</strong>
          </p>
          <p style="margin:0 0 14px;font-size:13px;color:#374151;line-height:1.65;">
            Les formulaires <strong>C1</strong> (déclaration de situation personnelle et familiale) et
            <strong>C3.2</strong> (demande d&apos;allocations de chômage temporaire) ont été complétés
            et signés en ligne dans le cadre d&apos;un parcours de transfert syndical.
            Les deux documents remplis sont joints à ce message.
          </p>
          ${p.email ? `<p style="margin:0 0 20px;font-size:13px;color:#374151;line-height:1.65;">
            Adresse e-mail du déclarant : <a href="mailto:${p.email}" style="color:#b91c1c;">${p.email}</a>
          </p>` : ""}
        </td>
      </tr>
      ${signatureBlock()}`;

  return emailShell("Formulaires C1 et C3.2 — FGTB", body, p.adminEmail);
}
