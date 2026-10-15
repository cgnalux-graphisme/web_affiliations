/**
 * Aperçu de tous les e-mails envoyés automatiquement, avec des données FICTIVES, dans une seule page HTML.
 * Lancer : npx vitest run -c scripts/apercu-emails/vitest.config.mts
 * (APERCU_SORTIE=<fichier.html> pour choisir la sortie). Rien n'est envoyé : les gabarits sont appelés directement.
 */
import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { buildEmailHtml } from "../../lib/emails/confirmation-affiliation";
import { buildHtml as htmlMandat } from "../../lib/emails/mandat-sepa";
import { construireHtml as htmlModification } from "../../lib/emails/modification";
import { buildC1Html, buildC32Html, buildOnemBundleHtml, buildLivraisonPersonnelleHtml } from "../../lib/onem-email-html";
import { htmlContact, sujetContact } from "../../lib/contact-email";
import { htmlEmailAssistant, sujetEmailAssistant } from "../../lib/assistant-email";
import { FORM_VIDE, recapitulatif, statutTransfert, type FormModification } from "../../lib/modification";
import { emailCourrier, textesModeles, type ContexteCourrier } from "../../lib/liberations/courriers";
import { emailLiberation } from "../../lib/emails/liberation";
import { controlesAntiSpam, type EmailRendu } from "../../lib/emails/gabarit";

type Apercu = { groupe: string; titre: string; quand: string; a: string; objet: string; pj: string; html: EmailRendu };

const PERSONNE = { nom: "Exemple", prenom: "Marie", email: "marie.exemple@exemple.be" };
const ADMIN_ONEM = "jonathan.hubert@accg.be";

const modif: FormModification = {
  ...FORM_VIDE,
  nom: "Exemple",
  prenom: "Marie",
  niss: "85073003328",
  email: PERSONNE.email,
  changements: ["adresse", "employeur"],
  adresseRue: "Rue de l'Exemple",
  adresseNumero: "12",
  adresseCodePostal: "5000",
  adresseLocalite: "Namur",
  adresseDepuis: "01/10/2026",
  employeurNom: "Entreprise Exemple SA",
  employeurLocalite: "Gembloux",
  employeurCp: "124",
  employeurDepuis: "01/10/2026",
  dateSig: "15/10/2026",
  lieu: "Namur",
};
const modifTransfert: FormModification = { ...modif, changements: ["employeur"], employeurCp: "000" };

const ctx: ContexteCourrier = {
  dossier: {
    objet: "Commission professionnelle Construction",
    lieu_nom: "Centrale Générale Namur",
    lieu_complement: null,
    lieu_rue: "Rue Dewez",
    lieu_numero: "40-42",
    lieu_boite: null,
    lieu_code_postal: "5000",
    lieu_localite: "Namur",
    salle: "grande salle, 2e étage",
    ordre_du_jour: "1. Accueil\n2. Négociations sectorielles\n3. Divers",
    perte_salaire: true,
    perte_salaire_charge: "employeur",
  },
  dates: [{ jour: "2026-11-12", duree: "journee", heure_debut: "09:00" }],
  participant: { prenom: "Marie", nom: "Exemple", genre: "F" },
  employeur: "Entreprise Exemple SA",
  signataire: { nom: "Jean Permanent", fonction: "Secrétaire permanent" },
  correspondant: { nom: "Paul Correspondant", telephone: "+32 (0) 81 64 99 64", email: "paul.correspondant@exemple.be" },
  textes: textesModeles([]),
};
const lettre = emailCourrier("lettre_employeur", ctx);
const convocation = emailCourrier("convocation", ctx);

const assistant = {
  categorie: "Chômage temporaire",
  prenom: "Marie",
  nom: "Exemple",
  codePostal: "5000",
  region: "Namur",
  commission: "124 Construction",
  affilie: true,
  resume: "La personne est en chômage temporaire depuis lundi et demande comment remplir sa carte de contrôle.",
  email: PERSONNE.email,
  lien: "https://exemple.be/espace/demarches/chatbot?id=exemple",
};
const contact = {
  nom: "Marie Exemple",
  email: PERSONNE.email,
  sujet: "Question sur ma cotisation",
  message: "Bonjour,\n\nJ'ai changé d'employeur le mois dernier. Dois-je modifier ma cotisation ?\n\nMerci,\nMarie",
};

const APERCUS: Apercu[] = [
  {
    groupe: "Affiliés et public",
    titre: "Confirmation d'affiliation",
    quand: "Après une demande d'affiliation (seule ou dans le parcours de transfert)",
    a: "La personne + adresses de l'envoi « Nouvelle affiliation »",
    objet: "Confirmation de votre demande d'affiliation – Centrale Générale FGTB Namur Luxembourg",
    pj: "PDF de la demande",
    html: buildEmailHtml({
      ...PERSONNE,
      pdfBase64: "",
      fileName: "",
      affiliationDebut: "11/2026",
      cotisationMensuelle: "19,00",
      modePaiement: "domiciliation",
      niss: "85.07.30-033.28",
      premiereEcheanceMontant: null,
    }),
  },
  {
    groupe: "Affiliés et public",
    titre: "Nouveau mandat SEPA",
    quand: "Après la signature d'un nouveau mandat SEPA",
    a: "La personne + adresses de l'envoi « Nouveau mandat SEPA »",
    objet: "Nouveau mandat SEPA — Centrale Générale FGTB Namur Luxembourg",
    pj: "PDF du mandat",
    html: htmlMandat({ ...PERSONNE, pdfBase64: "", fileName: "", nouveauIban: "BE68 5390 0754 7034", typeDemande: "nouveau_mandat" }),
  },
  {
    groupe: "Affiliés et public",
    titre: "Changement de compte",
    quand: "Après un changement de numéro de compte",
    a: "La personne + adresses de l'envoi « Changement de compte »",
    objet: "Changement de compte / Mandat SEPA — Centrale Générale FGTB Namur Luxembourg",
    pj: "PDF du mandat",
    html: htmlMandat({ ...PERSONNE, pdfBase64: "", fileName: "", nouveauIban: "BE68 5390 0754 7034", typeDemande: "changement_compte" }),
  },
  {
    groupe: "Affiliés et public",
    titre: "Changement de situation",
    quand: "Après le formulaire « Signaler un changement »",
    a: "La personne (et sa nouvelle adresse e-mail) + adresses de l'envoi « Changement de situation »",
    objet: "Changement de situation — Centrale Générale FGTB Namur-Luxembourg",
    pj: "PDF signé",
    html: htmlModification("Marie", "Exemple", recapitulatif(modif), statutTransfert(modif)),
  },
  {
    groupe: "Affiliés et public",
    titre: "Changement de situation, avec transfert",
    quand: "Même formulaire, nouvel employeur hors de nos secteurs (CP « Autre »)",
    a: "Idem",
    objet: "Changement de situation — Centrale Générale FGTB Namur-Luxembourg",
    pj: "PDF signé",
    html: htmlModification("Marie", "Exemple", recapitulatif(modifTransfert), statutTransfert(modifTransfert)),
  },
  {
    groupe: "Affiliés et public",
    titre: "Formulaires envoyés à soi-même",
    quand: "Quand la personne choisit de recevoir ses formulaires remplis (C1, C3.2…)",
    a: "L'adresse saisie par la personne, seulement",
    objet: "Formulaires remplis — Marie Exemple",
    pj: "Les PDF choisis",
    html: buildLivraisonPersonnelleHtml({
      nom: "Exemple",
      prenom: "Marie",
      emailDeclarant: PERSONNE.email,
      documents: ["Formulaire C1", "Formulaire C3.2"],
      adminEmail: ADMIN_ONEM,
    }),
  },
  {
    groupe: "Service chômage",
    titre: "Formulaire C1",
    quand: "Quand la personne choisit « Envoyer au service chômage »",
    a: "Adresses de l'envoi C1 + la personne",
    objet: "Formulaire C1 — Marie Exemple",
    pj: "PDF du C1",
    html: buildC1Html({ ...PERSONNE, adminEmail: ADMIN_ONEM }),
  },
  {
    groupe: "Service chômage",
    titre: "Formulaire C3.2",
    quand: "Quand la personne choisit « Envoyer au service chômage »",
    a: "Adresses de l'envoi C3.2 + la personne",
    objet: "Formulaire C3.2 — Marie Exemple",
    pj: "PDF du C3.2",
    html: buildC32Html({ ...PERSONNE, adminEmail: ADMIN_ONEM }),
  },
  {
    groupe: "Service chômage",
    titre: "Parcours de transfert : C1 + C3.2",
    quand: "Fin du parcours de transfert",
    a: "Adresses de l'envoi « Parcours de transfert » + la personne",
    objet: "Formulaires C1 et C3.2 — Marie Exemple",
    pj: "PDF du C1 et du C3.2",
    html: buildOnemBundleHtml({ ...PERSONNE, adminEmail: ADMIN_ONEM }),
  },
  {
    groupe: "Interne",
    titre: "Formulaire de contact",
    quand: "Message envoyé depuis la page Contact",
    a: "Adresse générale de la Centrale (« Répondre » = le visiteur)",
    objet: sujetContact(contact),
    pj: "Aucune",
    html: htmlContact(contact, "15/10/2026 à 10:42"),
  },
  {
    groupe: "Interne",
    titre: "Demande transmise par l'Assistant CG",
    quand: "Quand une personne transmet sa demande depuis l'Assistant",
    a: "Service choisi par la répartition de l'Assistant (« Répondre » = la personne)",
    objet: sujetEmailAssistant(assistant),
    pj: "Aucune",
    html: htmlEmailAssistant(assistant),
  },
  {
    groupe: "Libérations",
    titre: "Lettre à l'employeur",
    quand: "Envoi de la lettre de libération par e-mail (Espace CG), texte du modèle par défaut",
    a: "E-mail de l'employeur (« Répondre » = le correspondant)",
    objet: lettre.objet,
    pj: "Lettre en PDF (+ attestation de perte de salaire si la CG fédérale paie)",
    html: emailLiberation("lettre_employeur", lettre),
  },
  {
    groupe: "Libérations",
    titre: "Convocation du délégué",
    quand: "Envoi de la convocation par e-mail (Espace CG), texte du modèle par défaut",
    a: "E-mail du délégué (« Répondre » = le correspondant)",
    objet: convocation.objet,
    pj: "Convocation en PDF",
    html: emailLiberation("convocation", convocation),
  },
];

const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STYLES = `
:root{--rouge:#E32119;--bordeaux:#931510;--charbon:#222;--fond:#f3f5f7;--trait:#dde2e7}
*{box-sizing:border-box}
body{margin:0;background:var(--fond);color:var(--charbon);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Arial,sans-serif}
.tete{background:#fff;border-bottom:4px solid var(--bordeaux);padding:16px;position:sticky;top:0;z-index:2}
.tete-in{max-width:1400px;margin:0 auto;display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between}
h1{margin:0;font-size:22px}
.tete p{margin:2px 0 0;color:#56646f;font-size:14px}
.largeurs{display:flex;gap:6px}
.largeurs button{min-height:44px;padding:0 14px;border:1px solid var(--trait);background:#fff;border-radius:999px;font:inherit;font-weight:600;cursor:pointer}
.largeurs button[aria-pressed=true]{background:var(--charbon);color:#fff;border-color:var(--charbon)}
.largeurs button:focus-visible,nav a:focus-visible{outline:3px solid var(--rouge);outline-offset:2px}
main{max-width:1400px;margin:0 auto;padding:16px}
nav.sommaire{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 20px}
nav.sommaire a{font-size:13px;padding:6px 10px;background:#fff;border:1px solid var(--trait);border-radius:999px;color:var(--charbon);text-decoration:none}
h2{font-size:18px;margin:28px 0 12px;padding-left:10px;border-left:4px solid var(--rouge)}
.grille{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(min(100%,var(--l,660px)),1fr))}
.carte{background:#fff;border:1px solid var(--trait);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;scroll-margin-top:110px}
.carte header{padding:14px 16px;border-bottom:1px solid var(--trait)}
h3{margin:0 0 8px;font-size:16px;display:flex;gap:8px;align-items:center}
.num{display:inline-grid;place-items:center;min-width:26px;height:26px;border-radius:50%;background:var(--bordeaux);color:#fff;font-size:13px}
dl{margin:0;display:grid;gap:3px;font-size:13px}
dl div{display:grid;grid-template-columns:96px 1fr;gap:8px}
dt{color:#56646f}
dd{margin:0}
.cadre{background:#e9edf0;padding:12px;display:flex;justify-content:center;flex:1}
.controles{padding:10px 16px;border-top:1px solid var(--trait);font-size:13px}.controles summary{cursor:pointer;font-weight:600;min-height:32px}.controles pre{white-space:pre-wrap;background:var(--fond);padding:10px;border-radius:8px}
iframe{width:var(--l,660px);max-width:100%;height:1150px;border:1px solid var(--trait);background:#fff;border-radius:6px}
`;

function carte(a: Apercu, i: number): string {
  return `
    <article class="carte" id="e${i}">
      <header>
        <h3><span class="num">${i + 1}</span>${echapper(a.titre)}</h3>
        <dl>
          <div><dt>Quand</dt><dd>${echapper(a.quand)}</dd></div>
          <div><dt>À</dt><dd>${echapper(a.a)}</dd></div>
          <div><dt>Objet</dt><dd><b>${echapper(a.objet)}</b></dd></div>
          <div><dt>Pièce jointe</dt><dd>${echapper(a.pj)}</dd></div>
        </dl>
      </header>
      <div class="cadre"><iframe title="${echapper(a.titre)}" loading="lazy" srcdoc="${echapper(a.html.html)}"></iframe></div>
      <details class="controles"><summary>${(() => { const k = controlesAntiSpam(a.objet, a.html).filter((c) => !c.ok); return k.length ? `Anti-spam : ${k.length} point(s) à revoir` : "Anti-spam : tous les contrôles au vert"; })()} · version texte</summary>
        <ul>${controlesAntiSpam(a.objet, a.html).map((c) => `<li>${c.ok ? "OK" : "À revoir"} · ${echapper(c.regle)} (${echapper(c.detail)})</li>`).join("")}</ul>
        <pre>${echapper(a.html.texte)}</pre></details>
    </article>`;
}

function page(): string {
  const groupes = [...new Set(APERCUS.map((a) => a.groupe))];
  const sections = groupes
    .map((g) => {
      const cartes = APERCUS.map((a, i) => (a.groupe === g ? carte(a, i) : "")).join("");
      return `<section><h2>${echapper(g)}</h2><div class="grille">${cartes}</div></section>`;
    })
    .join("");
  const sommaire = APERCUS.map((a, i) => `<a href="#e${i}">${i + 1}. ${echapper(a.titre)}</a>`).join("");
  const script = `document.querySelectorAll(".largeurs button").forEach(function(b){b.addEventListener("click",function(){document.documentElement.style.setProperty("--l",b.dataset.l);document.querySelectorAll(".largeurs button").forEach(function(x){x.setAttribute("aria-pressed",String(x===b))})})})`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>E-mails automatiques</title><style>${STYLES}</style></head><body>
<div class="tete"><div class="tete-in"><div><h1>E-mails automatiques du site</h1>
<p>${APERCUS.length} e-mails, données fictives (Marie Exemple). Les PDF joints ne sont pas montrés.</p></div>
<div class="largeurs" role="group" aria-label="Largeur d'affichage"><button type="button" data-l="660px" aria-pressed="true">Ordinateur</button><button type="button" data-l="375px" aria-pressed="false">Téléphone</button></div></div></div>
<main><nav class="sommaire" aria-label="Sommaire">${sommaire}</nav>${sections}</main>
<script>${script}</script></body></html>`;
}

it("écrit l'aperçu des e-mails", () => {
  const sortie = process.env.APERCU_SORTIE ?? "apercu-emails.html";
  writeFileSync(sortie, page(), "utf-8");
  // APERCU_DOSSIER=<dossier> : chaque e-mail aussi dans son propre fichier (captures d'écran).
  const dossier = process.env.APERCU_DOSSIER;
  if (dossier) APERCUS.forEach((a, i) => writeFileSync(`${dossier}/email-${String(i + 1).padStart(2, "0")}.html`, a.html.html, "utf-8"));
  console.log(`Aperçu écrit : ${sortie} (${APERCUS.length} e-mails)`);
});
