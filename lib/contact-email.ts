import type { MessageContact } from "./contact";

function echapper(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Objet de l'e-mail reçu par la centrale. */
export function sujetContact(m: MessageContact): string {
  return `Contact site — ${m.sujet}`.slice(0, 200);
}

/** Corps de l'e-mail reçu par la centrale (tout le texte du visiteur est échappé). */
export function htmlContact(m: MessageContact, recuLe: string): string {
  const message = echapper(m.message).replace(/\n/g, "<br />");
  const ligne = (libelle: string, valeur: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#222222;font-weight:bold;vertical-align:top;white-space:nowrap;">${libelle}</td><td style="padding:6px 0;color:#222222;">${valeur}</td></tr>`;

  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222222;">
  <div style="max-width:640px;margin:0 auto;">
    <div style="border-top:4px solid #E32119;padding-top:16px;">
      <p style="margin:0;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:#931510;font-weight:bold;">Formulaire de contact du site</p>
      <h1 style="margin:6px 0 16px;font-size:22px;color:#222222;">${echapper(m.sujet)}</h1>
    </div>
    <table style="border-collapse:collapse;margin-bottom:16px;">
      ${ligne("Nom", echapper(m.nom))}
      ${ligne("E-mail", `<a href="mailto:${echapper(m.email)}" style="color:#931510;">${echapper(m.email)}</a>`)}
      ${ligne("Reçu le", echapper(recuLe))}
    </table>
    <div style="border-left:4px solid #931510;padding:12px 16px;background:#ffffff;border-top:1px solid #7C90A0;border-right:1px solid #7C90A0;border-bottom:1px solid #7C90A0;">${message}</div>
    <p style="margin-top:20px;font-size:13px;color:#222222;">Pour répondre, utilisez simplement « Répondre » : la réponse part vers ${echapper(m.email)}.</p>
  </div>
</body></html>`;
}
