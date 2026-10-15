/**
 * Gabarit commun des e-mails automatiques (direction D du site), PROPOSITION du 15/10/2026 à valider par Fred.
 *
 * Chaque e-mail = { html, texte } : la version texte accompagne toujours la version HTML (filtres anti-spam,
 * messageries en mode texte, lecteurs d'écran).
 *
 * Règles tenues ici (anti-spam et charte) :
 * - palette stricte : rouge #E32119 (filets), bordeaux #931510 (bandeau, boutons, encadrés), charbon #222222
 *   (texte, pied de page), ardoise #7C90A0 (filets fins), blanc ;
 * - polices Barlow (texte) et Barlow Condensed (titres), servies par le site ; repli Arial / Arial Narrow ;
 * - aucun emoji, aucune phrase en capitales dans le texte (les capitales des titres viennent du style) ;
 * - une seule image (le logo, avec texte alternatif et dimensions) : le message reste lisible images bloquées ;
 * - liens complets en https, texte du lien = adresse réelle quand une adresse est affichée ;
 * - texte d'aperçu (preheader), langue, raison de l'envoi et adresse postale dans le pied de page ;
 * - tableaux de 600 px et styles en ligne (Outlook, Gmail), poids très inférieur à 100 Ko (Gmail coupe au-delà).
 */

import { BUREAUX } from "../bureaux";

export const COULEURS = {
  rouge: "#E32119",
  bordeaux: "#931510",
  charbon: "#222222",
  ardoise: "#7C90A0",
  blanc: "#FFFFFF",
} as const;

const C = COULEURS;
const POLICE = "'Barlow', 'Helvetica Neue', Arial, sans-serif";
const POLICE_TITRE = "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif";
export const NOM_CENTRALE = "Centrale Générale FGTB Namur-Luxembourg";
export const EMAIL_ADMIN = "admin.nalux@accg.be";
export const SITE_PUBLIC = "www.accg-nalux.be";

/** Bureaux du pied de page : les mêmes que le pied de page du site (lib/bureaux.ts). */
const BUREAUX_PIED = BUREAUX.filter((b) => b.ville === "Libramont" || b.ville === "Namur").map((b) => ({
  ville: b.siege ? `${b.ville} (siège)` : b.ville,
  adresse: b.adresse,
  tel: b.telephoneLien,
  telAffiche: b.telephone,
}));

/** Adresse publique du site (logo, polices) : SITE_URL, sinon l'adresse Vercel de production. */
export function adresseRessources(): string {
  return (process.env.SITE_URL ?? "https://web-affiliations.vercel.app").replace(/\/+$/, "");
}

export function echapper(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── Briques du corps : chacune rend { html, texte } ─────────────────────────

export type Bloc = { html: string; texte: string };

/** Paragraphe. `gras` : passages mis en valeur (texte déjà fourni en clair, échappé ici). */
export function paragraphe(texte: string, options: { gras?: string[]; petit?: boolean } = {}): Bloc {
  let html = echapper(texte);
  for (const g of options.gras ?? []) {
    const e = echapper(g);
    html = html.split(e).join(`<strong style="font-weight:600;">${e}</strong>`);
  }
  const taille = options.petit ? "14px" : "16px";
  return {
    html: `<p style="margin:0 0 16px;font-family:${POLICE};font-size:${taille};line-height:1.6;color:${C.charbon};">${html.replace(/\n/g, "<br>")}</p>`,
    texte,
  };
}

/** Intertitre de section : condensé, en capitales par le style, posé sur un filet charbon (comme le site). */
export function intertitre(texte: string): Bloc {
  return {
    html: `<h2 style="margin:24px 0 10px;padding:0 0 6px;border-bottom:3px solid ${C.charbon};font-family:${POLICE_TITRE};font-size:18px;line-height:1.2;font-weight:800;letter-spacing:0.02em;text-transform:uppercase;color:${C.charbon};">${echapper(texte)}</h2>`,
    texte: `\n${texte}\n${"-".repeat(Math.min(texte.length, 40))}`,
  };
}

/** Récapitulatif libellé / valeur sur filets ardoise (comme les PDF « Registre »). */
export function recapitulatif(lignes: [string, string][]): Bloc {
  const tr = lignes
    .map(
      ([l, v]) => `<tr>
        <td style="padding:8px 12px 8px 0;border-bottom:1px solid ${C.ardoise};font-family:${POLICE};font-size:14px;line-height:1.4;font-weight:600;color:${C.charbon};width:42%;vertical-align:top;">${echapper(l)}</td>
        <td style="padding:8px 0;border-bottom:1px solid ${C.ardoise};font-family:${POLICE};font-size:14px;line-height:1.4;color:${C.charbon};vertical-align:top;">${echapper(v || "—")}</td>
      </tr>`
    )
    .join("");
  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-collapse:collapse;">${tr}</table>`,
    texte: lignes.map(([l, v]) => `${l} : ${v || "—"}`).join("\n"),
  };
}

/** Encadré : filet bordeaux à gauche (information), ou fond bordeaux plein (message important). */
export function encadre(titre: string, texte: string, ton: "info" | "fort" = "info"): Bloc {
  const fort = ton === "fort";
  const fond = fort ? C.bordeaux : C.blanc;
  const couleur = fort ? C.blanc : C.charbon;
  const bord = fort ? `border:0;` : `border:1px solid ${C.ardoise};border-left:4px solid ${C.bordeaux};`;
  return {
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr>
      <td style="${bord}background:${fond};border-radius:8px;padding:16px 18px;">
        <p style="margin:0 0 6px;font-family:${POLICE_TITRE};font-size:17px;line-height:1.25;font-weight:800;color:${fort ? C.blanc : C.bordeaux};">${echapper(titre)}</p>
        <p style="margin:0;font-family:${POLICE};font-size:15px;line-height:1.55;color:${couleur};">${echapper(texte).replace(/\n/g, "<br>")}</p>
      </td></tr></table>`,
    texte: `${titre}\n${texte}`,
  };
}

/** Liste à puces. */
export function liste(elements: string[]): Bloc {
  const li = elements
    .map((e) => `<li style="margin:0 0 6px;font-family:${POLICE};font-size:16px;line-height:1.5;color:${C.charbon};">${echapper(e)}</li>`)
    .join("");
  return { html: `<ul style="margin:0 0 16px;padding:0 0 0 22px;">${li}</ul>`, texte: elements.map((e) => `- ${e}`).join("\n") };
}

/** Bouton bordeaux (au moins 44 px de haut). Lien complet en https, recopié en clair dans la version texte. */
export function bouton(libelle: string, href: string, secondaire = false): Bloc {
  const style = secondaire
    ? `background:${C.blanc};color:${C.charbon};border:2px solid ${C.charbon};`
    : `background:${C.bordeaux};color:${C.blanc};border:2px solid ${C.bordeaux};`;
  return {
    html: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;"><tr>
      <td style="border-radius:999px;${style}">
        <a href="${echapper(href)}" style="display:inline-block;padding:13px 26px;font-family:${POLICE};font-size:16px;line-height:1.2;font-weight:600;text-decoration:none;color:${secondaire ? C.charbon : C.blanc};border-radius:999px;">${echapper(libelle)}</a>
      </td></tr></table>`,
    texte: `${libelle} : ${href}`,
  };
}

/** « Ce n'est pas vous ? » : rappel discret, sans capitales ni pictogramme. */
export function pasVous(): Bloc {
  return paragraphe(
    `Vous n'êtes pas à l'origine de cette demande ? Écrivez-nous à ${EMAIL_ADMIN} ou appelez le +32 (0)81 64 99 61 (Namur) ou le +32 (0)61 530 160 (Libramont).`,
    { petit: true, gras: ["Vous n'êtes pas à l'origine de cette demande ?"] }
  );
}

/** Signature : « Solidairement, » puis l'équipe ou une personne (nom, fonction). */
export function signature(qui: { nom: string; fonction?: string | null } = { nom: "L'équipe administrative" }): Bloc {
  const fonction = qui.fonction ? `<br><span style="font-weight:400;">${echapper(qui.fonction)}</span>` : "";
  return {
    html: `<p style="margin:24px 0 0;font-family:${POLICE};font-size:16px;line-height:1.5;color:${C.charbon};">Solidairement,</p>
      <p style="margin:6px 0 0;padding:0 0 0 12px;border-left:4px solid ${C.rouge};font-family:${POLICE};font-size:16px;line-height:1.45;font-weight:600;color:${C.charbon};">${echapper(qui.nom)}${fonction}<br><span style="font-weight:600;color:${C.bordeaux};">${NOM_CENTRALE}</span></p>`,
    texte: `Solidairement,\n${qui.nom}${qui.fonction ? `\n${qui.fonction}` : ""}\n${NOM_CENTRALE}`,
  };
}

// ── Enveloppe ───────────────────────────────────────────────────────────────

export type OptionsGabarit = {
  /** Étiquette du bandeau : « Affiliation », « Libération »… */
  etiquette: string;
  /** Grand titre du bandeau (capitales par le style). */
  titre: string;
  /** Texte d'aperçu affiché par les messageries après l'objet (≈ 90 caractères). */
  apercu: string;
  /** Salutation (« Bonjour Marie Exemple, ») ; absente pour les e-mails internes. */
  salutation?: string;
  blocs: Bloc[];
  /** Pourquoi la personne reçoit ce message (pied de page). */
  raison: string;
};

function polices(base: string): string {
  const f = (famille: string, fichier: string, poids: number) =>
    `@font-face{font-family:'${famille}';font-style:normal;font-weight:${poids};src:url('${base}/fonts/${fichier}.woff') format('woff');}`;
  return [f("Barlow", "barlow-400", 400), f("Barlow", "barlow-600", 600), f("Barlow Condensed", "barlow-condensed-600", 600), f("Barlow Condensed", "barlow-condensed-800", 800)].join("");
}

/** Un e-mail rendu : HTML et version texte, toujours envoyés ensemble. */
export type EmailRendu = { html: string; texte: string };

export function gabaritEmail(o: OptionsGabarit): EmailRendu {
  const base = adresseRessources();
  const corps = [...(o.salutation ? [paragraphe(o.salutation)] : []), ...o.blocs];
  const lienSite = `https://${SITE_PUBLIC}`;

  const html = `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${echapper(o.titre)}</title>
<style>${polices(base)}
@media (max-width:620px){.carte{width:100%!important;border-radius:0!important;border-left:0!important;border-right:0!important}.marge{padding-left:20px!important;padding-right:20px!important}.titre{font-size:28px!important}.bureau{display:block!important;width:100%!important;padding:0 0 16px!important}.bureau-suite{border-left:0!important;padding-top:16px!important;border-top:1px solid ${C.ardoise}!important}}
a{color:${C.bordeaux};}
</style>
</head>
<body style="margin:0;padding:0;background:${C.blanc};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.blanc};font-size:1px;line-height:1px;">${echapper(o.apercu)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.blanc};">
<tr><td align="center" style="padding:24px 8px;">
  <table role="presentation" class="carte" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border:1px solid ${C.ardoise};border-radius:16px;overflow:hidden;background:${C.blanc};">
    <tr><td class="marge" style="padding:24px 32px 20px;border-bottom:4px solid ${C.rouge};">
      <a href="${lienSite}" style="text-decoration:none;"><img src="${base}/emails/logo-cg-rouge-360.png" width="180" height="50" alt="${NOM_CENTRALE}" style="display:block;border:0;width:180px;height:50px;font-family:${POLICE};font-size:14px;font-weight:600;color:${C.bordeaux};"></a>
    </td></tr>
    <tr><td class="marge" style="padding:22px 32px 24px;background:${C.bordeaux};">
      <p style="margin:0 0 4px;font-family:${POLICE_TITRE};font-size:15px;line-height:1.2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.blanc};">${echapper(o.etiquette)}</p>
      <h1 class="titre" style="margin:0;font-family:${POLICE_TITRE};font-size:34px;line-height:1.05;font-weight:800;text-transform:uppercase;color:${C.blanc};">${echapper(o.titre)}</h1>
    </td></tr>
    <tr><td class="marge" style="padding:28px 32px 32px;">
      ${corps.map((b) => b.html).join("\n      ")}
    </td></tr>
    <tr><td class="marge" align="center" style="padding:28px 32px 24px;background:${C.charbon};border-top:3px solid ${C.rouge};text-align:center;">
      <img src="${base}/emails/logo-cg-blanc-360.png" width="144" height="40" alt="" style="display:block;margin:0 auto;border:0;width:144px;height:40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;"><tr>
        ${BUREAUX_PIED.map((bu, i) => `<td class="bureau${i > 0 ? " bureau-suite" : ""}" width="50%" valign="top" align="center" style="width:50%;padding:0 12px;text-align:center;${i > 0 ? `border-left:1px solid ${C.ardoise};` : ""}">
          <p style="margin:0;font-family:${POLICE};font-size:15px;line-height:1.3;font-weight:600;color:${C.blanc};">${bu.ville}</p>
          <p style="margin:4px 0 0;font-family:${POLICE};font-size:14px;line-height:1.45;color:${C.ardoise};">${bu.adresse[0]}<br>${bu.adresse[1]}</p>
          <p style="margin:6px 0 0;font-family:${POLICE};font-size:14px;line-height:1.3;font-weight:600;"><a href="tel:${bu.tel}" style="color:${C.blanc};text-decoration:none;">${bu.telAffiche}</a></p>
        </td>`).join("")}
      </tr></table>
      <p style="margin:20px 0 0;font-family:${POLICE};font-size:14px;line-height:1.6;font-weight:600;">
        <a href="mailto:${EMAIL_ADMIN}" style="color:${C.blanc};text-decoration:underline;">${EMAIL_ADMIN}</a>
        <span style="color:${C.ardoise};">&nbsp;·&nbsp;</span>
        <a href="${lienSite}" style="color:${C.blanc};text-decoration:underline;">${SITE_PUBLIC}</a>
      </p>
      <p style="margin:18px 0 0;padding:14px 0 0;border-top:1px solid ${C.ardoise};font-family:${POLICE};font-size:12px;line-height:1.5;color:${C.ardoise};text-align:center;">${echapper(o.raison)} Vos données sont traitées conformément au RGPD : <a href="${lienSite}/vie-privee" style="color:${C.ardoise};text-decoration:underline;">${SITE_PUBLIC}/vie-privee</a>.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const texte = [
    `${o.etiquette} · ${o.titre}`,
    "",
    ...corps.map((b) => b.texte + "\n"),
    "—",
    NOM_CENTRALE,
    ...BUREAUX_PIED.map((bu) => `${bu.ville} : ${bu.adresse.join(", ")} · ${bu.telAffiche}`),
    `${EMAIL_ADMIN} · ${lienSite}`,
    "",
    `${o.raison} Vos données sont traitées conformément au RGPD : ${lienSite}/vie-privee.`,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { html, texte };
}

// ── Contrôles anti-spam (tests et aperçu) ───────────────────────────────────

/** Pictogrammes et emojis (interdits par la charte, mal vus des filtres). */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

export type Controle = { regle: string; ok: boolean; detail: string };

/** Contrôles automatiques d'un e-mail fini : poids, emojis, capitales, version texte, images, liens. */
export function controlesAntiSpam(objet: string, e: { html: string; texte: string }): Controle[] {
  const poids = Buffer.byteLength(e.html, "utf8");
  const visible = e.html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
  const mots = (objet + " " + e.texte).match(/\p{L}{4,}/gu) ?? [];
  // Les sigles (FGTB, RGPD…) sont normaux ; seuls comptent les mots criés.
  const SIGLES = new Set(["FGTB", "RGPD", "SEPA", "ONEM", "IBAN", "ONSS", "NISS"]);
  const capitales = mots.filter((m) => m === m.toUpperCase() && !SIGLES.has(m)).length;
  const images = e.html.match(/<img\b[^>]*>/g) ?? [];
  const liens = [...e.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  return [
    { regle: "Poids sous 100 Ko (Gmail coupe au-delà)", ok: poids < 100_000, detail: `${Math.round(poids / 1024)} Ko` },
    { regle: "Version texte jointe", ok: e.texte.length > 50, detail: `${e.texte.length} caractères` },
    { regle: "Aucun emoji ni pictogramme", ok: !EMOJI.test(objet + visible), detail: EMOJI.test(objet + visible) ? "emoji trouvé" : "aucun" },
    { regle: "Objet sans capitales criardes ni « ! »", ok: !/!/.test(objet) && objet !== objet.toUpperCase(), detail: objet },
    { regle: "Peu de mots en capitales (texte)", ok: capitales <= 3, detail: `${capitales} mot(s)` },
    { regle: "Images avec texte alternatif (vide si décorative) et dimensions", ok: images.every((i) => /alt="/.test(i) && /width=/.test(i)) && /alt="[^"]+"/.test(images[0] ?? ""), detail: `${images.length} image(s)` },
    { regle: "Peu d'images, beaucoup de texte", ok: images.length <= 2 && visible.replace(/\s+/g, " ").length > 300, detail: `${visible.replace(/\s+/g, " ").length} caractères visibles` },
    { regle: "Liens complets (https ou mailto), pas de raccourcisseur", ok: liens.every((l) => /^(https:\/\/|mailto:|tel:)/.test(l) && !/bit\.ly|tinyurl|goo\.gl/.test(l)), detail: `${liens.length} lien(s)` },
    { regle: "Raison de l'envoi et adresse postale", ok: /Rue Fonteny Maroy/.test(e.texte) && /(Vous recevez|Message envoyé|Ce message)/.test(e.texte), detail: "pied de page" },
  ];
}
