import { BUREAUX } from "../bureaux";
import { heureFr, lignesAdresse } from "./regles";
import type { Charge, DateDossier, TypeLiberation } from "./types";

/**
 * Courriers des libérations (lot 2) : textes proposés, variables, fusion, dates en toutes lettres et accords.
 * Pur (testé), importable côté navigateur. Les textes modifiés dans Paramètres (site_liberations_modeles)
 * remplacent ceux-ci ; « Rétablir » revient au texte proposé ici.
 *
 * Exception voulue à la règle jj/mm/aaaa : dans les courriers, les dates sont écrites en toutes lettres
 * (« lundi 12 octobre 2026 »), comme les courriers actuels (décision de Fred, 13/10/2026).
 */

// ── Dates en toutes lettres ─────────────────────────────────────────────────

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 2026-10-12 » → « lundi 12 octobre 2026 ». */
export function dateLongue(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const [a, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const jour = new Date(Date.UTC(a, mo - 1, j)).getUTCDay();
  return `${JOURS[jour]} ${j === 1 ? "1er" : j} ${MOIS[mo - 1]} ${a}`;
}

type DateCourrier = Pick<DateDossier, "jour" | "duree" | "heure_debut">;

const MOMENT: Record<string, string> = { journee: "toute la journée", matin: "en matinée", apres_midi: "l'après-midi" };

/** « le lundi 12 octobre 2026 toute la journée » ; plusieurs dates : « les lundi 12 … et mardi 13 … ». */
export function phraseDates(dates: DateCourrier[]): string {
  const triees = [...dates].sort((a, b) => a.jour.localeCompare(b.jour));
  if (!triees.length) return "";
  if (triees.length === 1) return `le ${dateLongue(triees[0].jour)} ${MOMENT[triees[0].duree] ?? ""}`.trim();
  const memeMoment = triees.every((d) => d.duree === triees[0].duree);
  const liste = (x: string[]) => `${x.slice(0, -1).join(", ")} et ${x[x.length - 1]}`;
  if (memeMoment) return `les ${liste(triees.map((d) => dateLongue(d.jour)))}, ${MOMENT[triees[0].duree]}`;
  return `les ${liste(triees.map((d) => `${dateLongue(d.jour)} (${MOMENT[d.duree]})`))}`;
}

/** Dates avec leur heure : « le lundi 12 octobre 2026 à 08h00 » (convocation). */
export function phraseQuand(dates: DateCourrier[]): string {
  const triees = [...dates].sort((a, b) => a.jour.localeCompare(b.jour));
  const une = (d: DateCourrier) => [dateLongue(d.jour), d.heure_debut ? `à ${heureFr(d.heure_debut)}` : ""].filter(Boolean).join(" ");
  if (!triees.length) return "";
  if (triees.length === 1) return `le ${une(triees[0])}`;
  return `les ${triees.slice(0, -1).map(une).join(", ")} et ${une(triees[triees.length - 1])}`;
}

/** « la journée », « la demi-journée » ou « ces journées » (phrase sur le salaire). */
export function periode(dates: DateCourrier[]): string {
  if (dates.length > 1) return "ces journées";
  return dates[0]?.duree === "journee" ? "la journée" : "la demi-journée";
}

// ── Accords (genre du délégué : M, F ou inconnu) ────────────────────────────

export function accords(genre: string | null) {
  const f = genre === "F";
  const inconnu = genre !== "M" && genre !== "F";
  const choix = (m: string, fem: string, deux: string) => (inconnu ? deux : f ? fem : m);
  return {
    delegue: choix("délégué", "déléguée", "délégué(e)"),
    notre_delegue: choix("notre délégué", "notre déléguée", "notre délégué(e)"),
    cher: choix("Cher", "Chère", "Cher(e)"),
    cher_min: choix("cher", "chère", "cher(e)"),
    present: choix("présent", "présente", "présent(e)"),
  };
}

// ── Modèles ─────────────────────────────────────────────────────────────────

export type CodeModele =
  | "lettre_conge_education" | "lettre_mission_syndicale" | "lettre_credit_heures" | "lettre_formation_syndicale"
  | "salaire_employeur" | "salaire_cg_federale" | "convocation" | "attestation_presence"
  | "email_employeur" | "email_convocation" | "ville";

export type Modele = { code: CodeModele; libelle: string; aide: string; email: boolean; objet?: string; texte: string };

const POLITESSE = "Nous vous en remercions et vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.";
const lettre = (cadre: string) =>
  `Madame, Monsieur,\n\nAuriez-vous l'obligeance de bien vouloir libérer {{notre_delegue}} {{participant}} {{dates}} ${cadre} ({{objet}}).\n\n{{phrase_salaire}}\n\n${POLITESSE}`;

/** Textes proposés (brouillons à relire par Fred, 14/10/2026). Variables entre doubles accolades. */
export const MODELES: Modele[] = [
  { code: "lettre_mission_syndicale", libelle: "Lettre à l'employeur : mission syndicale extérieure", email: false,
    aide: "Le corps de la lettre, entre « Concerne » et la signature.", texte: lettre("dans le cadre d'une mission syndicale extérieure") },
  { code: "lettre_credit_heures", libelle: "Lettre à l'employeur : crédit d'heures syndicales", email: false,
    aide: "Le corps de la lettre, entre « Concerne » et la signature.", texte: lettre("dans le cadre du crédit d'heures syndicales") },
  { code: "lettre_formation_syndicale", libelle: "Lettre à l'employeur : heures de formation syndicale", email: false,
    aide: "Le corps de la lettre, entre « Concerne » et la signature.",
    texte: lettre("en heures de formation syndicale conformément aux dispositions prévues par la Convention Collective de Travail") },
  { code: "lettre_conge_education", libelle: "Lettre à l'employeur : congé-éducation", email: false,
    aide: "Le corps de la lettre, entre « Concerne » et la signature.", texte: lettre("dans le cadre du congé-éducation payé") },
  { code: "salaire_employeur", libelle: "Phrase : le salaire est à charge de l'employeur", email: false,
    aide: "Remplace {{phrase_salaire}} quand l'employeur prend en charge la perte de salaire.",
    texte: "Il est bien entendu que le salaire pour {{periode}} est à votre charge." },
  { code: "salaire_cg_federale", libelle: "Phrase : la CG fédérale prend en charge la perte de salaire", email: false,
    aide: "Remplace {{phrase_salaire}} quand la CG fédérale paie. L'attestation de perte de salaire part avec la lettre.",
    texte: "La perte de salaire est prise en charge par la Centrale Générale FGTB. Nous vous remercions de compléter l'attestation de perte de salaire jointe et de la renvoyer à la Centrale Générale FGTB, Rue Fonteny Maroy 13, 6800 Libramont-Chevigny." },
  { code: "convocation", libelle: "Convocation du délégué", email: false, aide: "Le texte de la convocation, avant la signature.",
    texte: "{{cher}} Camarade,\n\nNous avons le plaisir de t'inviter à la réunion « {{objet}} ». Cette réunion aura lieu {{quand}}, {{ou}}.\n\n{{ordre_du_jour}}\n\nSi tu ne peux être {{present}} ce jour-là, merci de nous en informer ({{correspondant_contact}}).\n\nNous avons fait le nécessaire pour te faire libérer auprès de ton employeur.\n\nReçois, {{cher_min}} Camarade, nos salutations fraternelles." },
  { code: "attestation_presence", libelle: "Attestation de présence", email: false, aide: "Le texte de l'attestation, avant la signature.",
    texte: "Nous attestons par la présente que {{participant}} était en mission syndicale {{dates}}." },
  { code: "email_employeur", libelle: "E-mail à l'employeur (lettre en pièce jointe)", email: true, objet: "Demande de libération : {{participant}}",
    aide: "Le message qui accompagne la lettre en PDF.",
    texte: "Madame, Monsieur,\n\nVous trouverez en pièce jointe notre demande de libération pour {{participant}}, {{dates}}{{mention_attestation}}.\n\nVotre correspondant pour cette demande : {{correspondant_contact}}.\n\nSalutations distinguées,\n\n{{signataire}}\n{{fonction}}\nCentrale Générale FGTB Namur-Luxembourg" },
  { code: "email_convocation", libelle: "E-mail au délégué (convocation en pièce jointe)", email: true, objet: "Convocation : {{objet}}",
    aide: "Le message qui accompagne la convocation en PDF.",
    texte: "{{cher}} Camarade,\n\nTu trouveras en pièce jointe ta convocation à la réunion « {{objet}} », {{quand}}.\n\nPour toute question : {{correspondant_contact}}.\n\nSalutations fraternelles,\n\n{{signataire}}\n{{fonction}}" },
  { code: "ville", libelle: "Ville d'expédition", email: false, aide: "« Namur, le … » et « Votre correspondant à Namur ». Le bureau de cette ville sert d'expéditeur.",
    texte: "Namur" },
];

export const VARIABLES: { cle: string; libelle: string }[] = [
  { cle: "participant", libelle: "Prénom et nom du participant" },
  { cle: "notre_delegue", libelle: "« notre délégué » ou « notre déléguée »" },
  { cle: "delegue", libelle: "« délégué » ou « déléguée »" },
  { cle: "cher", libelle: "« Cher » ou « Chère »" },
  { cle: "cher_min", libelle: "« cher » ou « chère »" },
  { cle: "present", libelle: "« présent » ou « présente »" },
  { cle: "dates", libelle: "« le lundi 12 octobre 2026 toute la journée »" },
  { cle: "quand", libelle: "« le lundi 12 octobre 2026 à 08h00 »" },
  { cle: "periode", libelle: "« la journée », « la demi-journée » ou « ces journées »" },
  { cle: "objet", libelle: "Objet de la réunion" },
  { cle: "ou", libelle: "« à l'adresse suivante : lieu (salle), adresse »" },
  { cle: "ordre_du_jour", libelle: "« Ordre du jour : » et ses points (vide s'il n'y en a pas)" },
  { cle: "phrase_salaire", libelle: "La phrase sur le salaire (vide sans perte de salaire)" },
  { cle: "mention_attestation", libelle: "« ainsi que l'attestation de perte de salaire à compléter » si la CG fédérale paie" },
  { cle: "employeur", libelle: "Nom de l'employeur" },
  { cle: "signataire", libelle: "Nom du permanent qui a fait la demande" },
  { cle: "fonction", libelle: "Fonction du permanent (Paramètres › Équipe)" },
  { cle: "correspondant_contact", libelle: "Nom, téléphone et e-mail de l'admin qui traite le dossier" },
  { cle: "ville", libelle: "Ville d'expédition" },
];

export function modeleParCode(code: string): Modele | undefined {
  return MODELES.find((m) => m.code === code);
}

export function codeLettre(type: TypeLiberation): CodeModele {
  return `lettre_${type}` as CodeModele;
}

/** Textes à utiliser : ceux modifiés dans Paramètres, sinon ceux proposés ici. */
export function textesModeles(modifies: { code: string; objet: string | null; texte: string }[]): Record<CodeModele, { objet: string; texte: string; modifie: boolean }> {
  const parCode = new Map(modifies.map((m) => [m.code, m]));
  return Object.fromEntries(MODELES.map((m) => {
    const x = parCode.get(m.code);
    return [m.code, { objet: x?.objet ?? m.objet ?? "", texte: x?.texte ?? m.texte, modifie: Boolean(x) }];
  })) as Record<CodeModele, { objet: string; texte: string; modifie: boolean }>;
}

/**
 * Remplace les variables {{cle}}. Une variable inconnue ou vide devient vide (jamais de texte inventé) ; les
 * paragraphes devenus vides disparaissent, les espaces doublés aussi.
 */
export function fusionner(texte: string, vars: Record<string, string>): string {
  return texte
    .replace(/\r\n/g, "\n")
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_x, cle: string) => vars[cle] ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.split("\n").map((l) => l.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim()).filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n");
}

/** Variables du texte inconnues (avertissement dans Paramètres). */
export function variablesInconnues(texte: string): string[] {
  const connues = new Set(VARIABLES.map((v) => v.cle));
  return [...new Set([...texte.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).filter((c) => !connues.has(c)))];
}

// ── Variables d'un participant ──────────────────────────────────────────────

export type ContexteCourrier = {
  dossier: {
    objet: string | null; lieu_nom: string | null; lieu_complement: string | null; lieu_rue: string | null; lieu_numero: string | null;
    lieu_boite: string | null; lieu_code_postal: string | null; lieu_localite: string | null; salle: string | null;
    ordre_du_jour: string | null; perte_salaire: boolean | null; perte_salaire_charge: Charge | null;
  };
  dates: DateCourrier[];
  participant: { prenom: string | null; nom: string; genre: string | null };
  employeur: string | null;
  signataire: { nom: string; fonction: string | null };
  correspondant: { nom: string; telephone: string | null; email: string | null } | null;
  textes: Record<CodeModele, { objet: string; texte: string }>;
};

export function contactCorrespondant(c: ContexteCourrier["correspondant"]): string {
  if (!c) return "";
  return [c.nom, c.telephone, c.email].filter(Boolean).join(", ");
}

export function variables(ctx: ContexteCourrier): Record<string, string> {
  const d = ctx.dossier;
  const adresse = lignesAdresse({
    complement: d.lieu_complement, rue: d.lieu_rue, numero: d.lieu_numero, boite: d.lieu_boite, code_postal: d.lieu_code_postal, localite: d.lieu_localite,
  }).join(", ");
  const nomLieu = [d.lieu_nom?.trim(), d.salle?.trim() ? `(${d.salle.trim()})` : ""].filter(Boolean).join(" ");
  const ou = [nomLieu, adresse].filter(Boolean).join(", ");
  const points = (d.ordre_du_jour ?? "").split("\n").map((x) => x.replace(/^[-•*\s]+/, "").trim()).filter(Boolean);
  const cgFederale = d.perte_salaire === true && d.perte_salaire_charge === "cg_federale";
  const vars: Record<string, string> = {
    ...accords(ctx.participant.genre),
    participant: [ctx.participant.prenom, ctx.participant.nom].filter(Boolean).join(" "),
    dates: phraseDates(ctx.dates),
    quand: phraseQuand(ctx.dates),
    periode: periode(ctx.dates),
    objet: d.objet?.trim() ?? "",
    ou: ou ? `à l'adresse suivante : ${ou}` : "",
    ordre_du_jour: points.length ? `Ordre du jour :\n${points.map((p) => `- ${p}`).join("\n")}` : "",
    employeur: ctx.employeur ?? "",
    signataire: ctx.signataire.nom,
    fonction: ctx.signataire.fonction ?? "",
    correspondant_contact: contactCorrespondant(ctx.correspondant),
    ville: ctx.textes.ville.texte.trim() || "Namur",
    mention_attestation: cgFederale ? ", ainsi que l'attestation de perte de salaire à compléter" : "",
  };
  vars.phrase_salaire = d.perte_salaire !== true ? ""
    : fusionner(ctx.textes[cgFederale ? "salaire_cg_federale" : "salaire_employeur"].texte, vars);
  return vars;
}

// ── Documents ───────────────────────────────────────────────────────────────

export type GenreCourrier = "lettre_employeur" | "convocation" | "attestation_presence";

export const GENRES_COURRIER: { code: GenreCourrier; libelle: string }[] = [
  { code: "lettre_employeur", libelle: "Lettre à l'employeur" },
  { code: "convocation", libelle: "Convocation" },
  { code: "attestation_presence", libelle: "Attestation de présence" },
];

export function codeModeleCourrier(genre: GenreCourrier, type: TypeLiberation): CodeModele {
  return genre === "lettre_employeur" ? codeLettre(type) : genre;
}

/** Bureau expéditeur : celui de la ville d'expédition, sinon Namur. */
export function bureauExpediteur(ville: string) {
  const v = ville.trim().toLowerCase();
  return BUREAUX.find((b) => b.ville.toLowerCase() === v) ?? BUREAUX.find((b) => b.ville === "Namur")!;
}

export type DonneesCourrierPdf = {
  genre: GenreCourrier;
  titre: string;
  expediteur: string[];
  correspondant: { ville: string; lignes: string[] } | null;
  destinataire: string[];
  lieuDate: string;
  concerne: string | null;
  corps: string;
  signature: { nom: string; fonction: string | null };
};

/** Tout ce qu'il faut pour dessiner un courrier. `corps` : le texte retouché, sinon celui du modèle fusionné. */
export function donneesCourrier(
  genre: GenreCourrier,
  type: TypeLiberation,
  ctx: ContexteCourrier,
  destinataire: string[],
  aujourdhuiIso: string,
  corpsRetouche?: string | null
): DonneesCourrierPdf {
  const vars = variables(ctx);
  const bureau = bureauExpediteur(vars.ville);
  const corps = corpsRetouche?.trim() || fusionner(ctx.textes[codeModeleCourrier(genre, type)].texte, vars);
  const c = ctx.correspondant;
  return {
    genre,
    titre: genre === "lettre_employeur" ? "Demande de libération" : genre === "convocation" ? "Convocation" : "Attestation de présence",
    expediteur: ["Centrale Générale FGTB Namur-Luxembourg", ...bureau.adresse],
    correspondant: genre === "lettre_employeur" && c ? { ville: vars.ville, lignes: [c.nom, c.telephone, c.email].filter((x): x is string => Boolean(x)) } : null,
    destinataire,
    lieuDate: `${vars.ville}, le ${dateLongue(aujourdhuiIso)}`,
    concerne: genre === "lettre_employeur" ? "Demande de libération" : genre === "convocation" ? `Convocation à la réunion « ${ctx.dossier.objet?.trim() ?? ""} »` : null,
    corps,
    signature: ctx.signataire,
  };
}

/** Objet et texte d'un e-mail (lettre à l'employeur ou convocation). */
export function emailCourrier(genre: "lettre_employeur" | "convocation", ctx: ContexteCourrier): { objet: string; texte: string } {
  const vars = variables(ctx);
  const m = ctx.textes[genre === "lettre_employeur" ? "email_employeur" : "email_convocation"];
  return { objet: fusionner(m.objet, vars).replace(/\n+/g, " "), texte: fusionner(m.texte, vars) };
}

/** Texte brut → HTML simple et sûr (paragraphes, retours à la ligne). */
export function texteEnHtml(texte: string): string {
  const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return texte.split(/\n\s*\n/).map((p) => `<p style="margin:0 0 14px;line-height:1.5">${echapper(p).replace(/\n/g, "<br>")}</p>`).join("");
}

/** Nom de fichier d'un document : « lettre-employeur-dupont-jean.pdf ». */
export function nomFichierCourrier(genre: string, participant: string): string {
  const slug = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug(genre.replace(/_/g, " "))}-${slug(participant) || "participant"}.pdf`;
}
