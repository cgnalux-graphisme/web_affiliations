/**
 * E-mail « demande transmise par l'Assistant CG ». Contient SEULEMENT : catégorie, prénom et nom, code postal,
 * commission paritaire, affilié oui / non, résumé, lien vers le back-office et bouton « Répondre » (adresse
 * e-mail de la personne, demande de Fred du 08/10/2026 ; « Répondre à » de l'e-mail pointe aussi vers elle).
 * JAMAIS le numéro de registre national (consultable dans le back-office uniquement).
 */

export type ContenuEmailAssistant = {
  categorie: string;
  prenom: string;
  nom: string;
  codePostal: string;
  region: string;
  commission: string | null;
  affilie: boolean | null;
  resume: string;
  email: string;
  lien: string;
};

function echapper(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sujetEmailAssistant(c: ContenuEmailAssistant): string {
  return `Assistant CG : ${c.categorie}, ${c.prenom} ${c.nom}`.replace(/[\r\n]+/g, " ").slice(0, 200);
}

export function htmlEmailAssistant(c: ContenuEmailAssistant): string {
  const ligne = (libelle: string, valeur: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#222222;font-weight:bold;vertical-align:top;white-space:nowrap;">${libelle}</td><td style="padding:6px 0;color:#222222;">${valeur}</td></tr>`;
  const affilie = c.affilie === null ? "Non précisé" : c.affilie ? "Oui" : "Non";
  // Bouton « Répondre » : ouvre un nouveau message dans Outlook, adressé à la personne, objet prérempli.
  const mailto = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(`Votre demande à la Centrale Générale FGTB Namur-Luxembourg (${c.categorie})`)}&body=${encodeURIComponent(`Bonjour ${c.prenom} ${c.nom},

`)}`;
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222222;">
  <div style="max-width:640px;margin:0 auto;">
    <div style="border-top:4px solid #E32119;padding-top:16px;">
      <p style="margin:0;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;color:#931510;font-weight:bold;">Demande transmise par l'Assistant CG</p>
      <h1 style="margin:6px 0 16px;font-size:22px;color:#222222;">${echapper(c.categorie)}</h1>
    </div>
    <table style="border-collapse:collapse;margin-bottom:16px;">
      ${ligne("Personne", echapper(`${c.prenom} ${c.nom}`))}
      ${ligne("Code postal", echapper(`${c.codePostal} (${c.region})`))}
      ${ligne("Commission paritaire", echapper(c.commission ?? "Non identifiée"))}
      ${ligne("Affilié(e)", affilie)}
    </table>
    <div style="border-left:4px solid #931510;padding:12px 16px;background:#ffffff;border-top:1px solid #7C90A0;border-right:1px solid #7C90A0;border-bottom:1px solid #7C90A0;">${echapper(c.resume).replace(/\n/g, "<br />")}</div>
    <p style="margin-top:20px;">
      <a href="${echapper(mailto)}" style="display:inline-block;background:#931510;color:#ffffff;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:12px;margin:0 8px 8px 0;">Répondre à ${echapper(c.prenom)} ${echapper(c.nom)}</a>
      <a href="${echapper(c.lien)}" style="display:inline-block;background:#ffffff;color:#222222;font-weight:bold;text-decoration:none;padding:10px 18px;border-radius:12px;border:2px solid #222222;margin:0 8px 8px 0;">Ouvrir dans le back-office</a>
    </p>
    <p style="margin-top:12px;font-size:13px;color:#222222;">Vous pouvez aussi cliquer « Répondre » dans votre messagerie : la réponse part vers ${echapper(c.email)}. Le registre national, s'il a été donné, se trouve uniquement dans le back-office.</p>
  </div>
</body></html>`;
}
