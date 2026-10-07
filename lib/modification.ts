import { CP_AUTRE, CP_INCONNUE, COMMISSIONS_PARITAIRES, libelleCommission } from "./commissions-paritaires";
import { dateFrToIso, isoToDateFr } from "./dates";

/**
 * Formulaire « Signaler un changement » (/changement-situation, table web_modifications) :
 * règles partagées entre le formulaire (navigateur), la route d'envoi et le back-office.
 * Fichier sans dépendance serveur, sans donnée.
 */

export const CHANGEMENTS = ["adresse", "contact", "employeur", "regime", "situation"] as const;
export type Changement = (typeof CHANGEMENTS)[number];

export const INFOS_CHANGEMENT: Record<Changement, { titre: string; description: string }> = {
  adresse: { titre: "Adresse", description: "Vous avez déménagé." },
  contact: { titre: "E-mail ou téléphone", description: "Nouvelle adresse e-mail ou nouveau numéro." },
  employeur: { titre: "Employeur", description: "Vous travaillez pour un nouvel employeur." },
  regime: { titre: "Régime de travail", description: "Passage à temps plein ou à temps partiel, heures modifiées." },
  situation: { titre: "Situation professionnelle", description: "Nouvelle profession, chômage ou maladie de longue durée." },
};

export type Regime = "" | "temps_plein" | "temps_partiel";
export type Situation = "" | "profession" | "chomage" | "mutuelle";
export type Transfert = "non" | "a_organiser" | "a_verifier";

export const LIBELLES_REGIME: Record<Exclude<Regime, "">, string> = {
  temps_plein: "Temps plein",
  temps_partiel: "Temps partiel",
};

export const LIBELLES_SITUATION: Record<Exclude<Situation, "">, string> = {
  profession: "Nouvelle profession",
  chomage: "Chômage",
  mutuelle: "Maladie de longue durée (mutuelle)",
};

export const LIBELLES_TRANSFERT: Record<Transfert, string> = {
  non: "Non",
  a_organiser: "Transfert à organiser",
  a_verifier: "Secteur à vérifier",
};

/** Message à l'affilié (écran, e-mail, PDF) quand un transfert est possible. */
export const MESSAGES_TRANSFERT: Record<Exclude<Transfert, "non">, string> = {
  a_organiser:
    "Votre nouvelle profession relève d'une autre centrale de la FGTB. Nous nous chargeons de votre transfert. Votre nouvelle centrale professionnelle prendra contact avec vous.",
  a_verifier:
    "Nos services vérifieront votre secteur. Si un transfert vers une autre centrale est nécessaire, nous nous en chargeons et votre nouvelle centrale prendra contact avec vous.",
};

export const MENTION_COTISATION = "Votre cotisation sera adaptée par nos services.";

/** Saisie du formulaire. Dates au format jj/mm/aaaa, heures telles que tapées (« 19,5 »). */
export type FormModification = {
  nom: string;
  prenom: string;
  niss: string;
  email: string;
  changements: Changement[];
  adresseRue: string;
  adresseNumero: string;
  adresseBoite: string;
  adresseCodePostal: string;
  adresseLocalite: string;
  adresseDepuis: string;
  nouvelEmail: string;
  nouveauTelephone: string;
  contactDepuis: string;
  employeurNom: string;
  employeurOnssTva: string;
  employeurLocalite: string;
  employeurCp: string;
  employeurDepuis: string;
  regime: Regime;
  regimeHeures: string;
  regimeDepuis: string;
  situation: Situation;
  profession: string;
  professionCp: string;
  situationDepuis: string;
  dateSig: string;
  lieu: string;
  signature: string;
};

export const FORM_VIDE: FormModification = {
  nom: "", prenom: "", niss: "", email: "",
  changements: [],
  adresseRue: "", adresseNumero: "", adresseBoite: "", adresseCodePostal: "", adresseLocalite: "", adresseDepuis: "",
  nouvelEmail: "", nouveauTelephone: "", contactDepuis: "",
  employeurNom: "", employeurOnssTva: "", employeurLocalite: "", employeurCp: CP_INCONNUE, employeurDepuis: "",
  regime: "", regimeHeures: "", regimeDepuis: "",
  situation: "", profession: "", professionCp: CP_INCONNUE, situationDepuis: "",
  dateSig: "", lieu: "", signature: "",
};

export type ChampModification = keyof FormModification;
export type Erreurs = Partial<Record<ChampModification, string>>;

// ── Contrôles ────────────────────────────────────────────────────────────────

export const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValide(email: string): boolean {
  const e = email.trim();
  return e.length <= 254 && EMAIL_VALIDE.test(e);
}

/** Numéro de registre national : 11 chiffres et clé de contrôle (nés avant ou après 2000). */
export function nissValide(niss: string): boolean {
  const c = niss.replace(/\D/g, "");
  if (c.length !== 11) return false;
  const base = parseInt(c.slice(0, 9), 10);
  const cle = parseInt(c.slice(9), 10);
  return 97 - (base % 97) === cle || 97 - ((2000000000 + base) % 97) === cle;
}

/** Saisie du NISS formatée à la frappe : 85.04.12-123.45. */
export function formaterNiss(valeur: string): string {
  const c = valeur.replace(/\D/g, "").slice(0, 11);
  if (c.length <= 2) return c;
  if (c.length <= 4) return `${c.slice(0, 2)}.${c.slice(2)}`;
  if (c.length <= 6) return `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4)}`;
  if (c.length <= 9) return `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4, 6)}-${c.slice(6)}`;
  return `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4, 6)}-${c.slice(6, 9)}.${c.slice(9)}`;
}

/** Téléphone : chiffres, espaces, + . / - ( ), entre 8 et 15 chiffres. */
export function telephoneValide(tel: string): boolean {
  const t = tel.trim();
  if (!/^[+0-9 ./()-]{8,30}$/.test(t)) return false;
  const chiffres = t.replace(/\D/g, "").length;
  return chiffres >= 8 && chiffres <= 15;
}

/** Moyenne d'heures par semaine : « 19 », « 19,5 » ou « 19.5 » → 19.5 ; entre 1 et 38, une décimale au plus. */
export function lireHeures(saisie: string): number | null {
  const t = saisie.trim().replace(",", ".");
  if (!/^\d{1,2}(\.\d)?$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= 38 ? n : null;
}

const CP_CONNUES = new Set(COMMISSIONS_PARITAIRES.map((c) => c.id));

function cpValide(cp: string): boolean {
  return CP_CONNUES.has(cp);
}

function dateValide(d: string): boolean {
  const iso = dateFrToIso(d);
  if (!iso) return false;
  const annee = Number(iso.slice(0, 4));
  return annee >= 1950 && annee <= 2100;
}

function aCoche(f: FormModification, c: Changement): boolean {
  return f.changements.includes(c);
}

// ── Transfert ────────────────────────────────────────────────────────────────

function transfertDeCp(cp: string): Transfert {
  if (cp === CP_AUTRE) return "a_organiser";
  if (cp === CP_INCONNUE || !cp) return "a_verifier";
  return "non";
}

const POIDS: Record<Transfert, number> = { non: 0, a_verifier: 1, a_organiser: 2 };

/**
 * Transfert vers une autre centrale, déduit des commissions paritaires saisies (employeur, nouvelle
 * profession). « Autre » → à organiser ; « Je ne sais pas » → à vérifier ; le plus fort l'emporte.
 * Chômage, mutuelle et blocs non cochés : aucun effet.
 */
export function statutTransfert(f: FormModification): Transfert {
  const cps: string[] = [];
  if (aCoche(f, "employeur")) cps.push(f.employeurCp);
  if (aCoche(f, "situation") && f.situation === "profession") cps.push(f.professionCp);
  return cps.map(transfertDeCp).reduce<Transfert>((a, b) => (POIDS[b] > POIDS[a] ? b : a), "non");
}

// ── Validation par étape ─────────────────────────────────────────────────────

export const ETAPES = ["Vous", "Ce qui change", "Le détail", "Signature"] as const;

export function validerEtape(etape: number, f: FormModification): Erreurs {
  const e: Erreurs = {};
  const requis = (champ: ChampModification, valeur: string, max = 150) => {
    if (!valeur.trim()) e[champ] = "Champ obligatoire.";
    else if (valeur.trim().length > max) e[champ] = `${max} caractères maximum.`;
  };
  const depuis = (champ: ChampModification, valeur: string) => {
    if (!valeur.trim()) e[champ] = "Indiquez la date (jj/mm/aaaa).";
    else if (!dateValide(valeur)) e[champ] = "Date invalide : utilisez le format jj/mm/aaaa.";
  };
  const facultatif = (champ: ChampModification, valeur: string, max: number) => {
    if (valeur.trim().length > max) e[champ] = `${max} caractères maximum.`;
  };

  if (etape === 0) {
    requis("nom", f.nom, 100);
    requis("prenom", f.prenom, 100);
    if (!f.niss.trim()) e.niss = "Champ obligatoire.";
    else if (!nissValide(f.niss)) e.niss = "Numéro de registre national invalide : vérifiez les 11 chiffres.";
    if (!f.email.trim()) e.email = "Champ obligatoire.";
    else if (!emailValide(f.email)) e.email = "Adresse e-mail invalide.";
  }

  if (etape === 1 && f.changements.length === 0) {
    e.changements = "Cochez au moins un changement.";
  }

  if (etape === 2) {
    if (aCoche(f, "adresse")) {
      requis("adresseRue", f.adresseRue);
      requis("adresseNumero", f.adresseNumero, 20);
      facultatif("adresseBoite", f.adresseBoite, 20);
      if (!/^\d{4}$/.test(f.adresseCodePostal.trim())) e.adresseCodePostal = "Code postal belge : 4 chiffres.";
      requis("adresseLocalite", f.adresseLocalite, 100);
      depuis("adresseDepuis", f.adresseDepuis);
    }
    if (aCoche(f, "contact")) {
      const mail = f.nouvelEmail.trim();
      const tel = f.nouveauTelephone.trim();
      if (!mail && !tel) e.nouvelEmail = "Indiquez un nouvel e-mail, un nouveau téléphone, ou les deux.";
      if (mail && !emailValide(mail)) e.nouvelEmail = "Adresse e-mail invalide.";
      if (tel && !telephoneValide(tel)) e.nouveauTelephone = "Numéro invalide : 8 à 15 chiffres.";
      depuis("contactDepuis", f.contactDepuis);
    }
    if (aCoche(f, "employeur")) {
      requis("employeurNom", f.employeurNom);
      facultatif("employeurOnssTva", f.employeurOnssTva, 30);
      facultatif("employeurLocalite", f.employeurLocalite, 100);
      if (!cpValide(f.employeurCp)) e.employeurCp = "Choisissez une commission paritaire ou « Je ne sais pas ».";
      depuis("employeurDepuis", f.employeurDepuis);
    }
    if (aCoche(f, "regime")) {
      if (!f.regime) e.regime = "Choisissez temps plein ou temps partiel.";
      if (f.regime === "temps_partiel" && lireHeures(f.regimeHeures) === null) {
        e.regimeHeures = "Indiquez une moyenne entre 1 et 38 heures (ex. 19 ou 19,5).";
      }
      depuis("regimeDepuis", f.regimeDepuis);
    }
    if (aCoche(f, "situation")) {
      if (!f.situation) e.situation = "Choisissez votre nouvelle situation.";
      if (f.situation === "profession") {
        requis("profession", f.profession);
        if (!cpValide(f.professionCp)) e.professionCp = "Choisissez une commission paritaire ou « Je ne sais pas ».";
      }
      depuis("situationDepuis", f.situationDepuis);
    }
  }

  if (etape === 3) {
    if (!f.dateSig.trim()) e.dateSig = "Champ obligatoire.";
    else if (!dateValide(f.dateSig)) e.dateSig = "Date invalide : utilisez le format jj/mm/aaaa.";
    requis("lieu", f.lieu, 100);
    if (!f.signature) e.signature = "Dessinez votre signature dans le cadre.";
  }

  return e;
}

// ── Formulaire ↔ ligne en base (web_modifications) ───────────────────────────

const net = (s: string) => s.trim().replace(/\s+/g, " ");
const ouNull = (s: string) => (net(s) ? net(s) : null);

/** Ligne à insérer : seuls les blocs cochés sont remplis, les autres restent vides (null). */
export function versLigne(f: FormModification): Record<string, unknown> {
  const c = (x: Changement) => aCoche(f, x);
  const partiel = c("regime") && f.regime === "temps_partiel";
  const profession = c("situation") && f.situation === "profession";
  return {
    nom: net(f.nom),
    prenom: net(f.prenom),
    niss: f.niss.replace(/\D/g, ""),
    email: f.email.trim().toLowerCase(),
    changements: CHANGEMENTS.filter(c),

    adresse_rue: c("adresse") ? ouNull(f.adresseRue) : null,
    adresse_numero: c("adresse") ? ouNull(f.adresseNumero) : null,
    adresse_boite: c("adresse") ? ouNull(f.adresseBoite) : null,
    adresse_code_postal: c("adresse") ? ouNull(f.adresseCodePostal) : null,
    adresse_localite: c("adresse") ? ouNull(f.adresseLocalite) : null,
    adresse_depuis: c("adresse") ? dateFrToIso(f.adresseDepuis) : null,

    nouvel_email: c("contact") && f.nouvelEmail.trim() ? f.nouvelEmail.trim().toLowerCase() : null,
    nouveau_telephone: c("contact") ? ouNull(f.nouveauTelephone) : null,
    contact_depuis: c("contact") ? dateFrToIso(f.contactDepuis) : null,

    employeur_nom: c("employeur") ? ouNull(f.employeurNom) : null,
    employeur_onss_tva: c("employeur") ? ouNull(f.employeurOnssTva) : null,
    employeur_localite: c("employeur") ? ouNull(f.employeurLocalite) : null,
    employeur_cp: c("employeur") ? f.employeurCp : null,
    employeur_depuis: c("employeur") ? dateFrToIso(f.employeurDepuis) : null,

    regime: c("regime") && f.regime ? f.regime : null,
    regime_heures: partiel ? lireHeures(f.regimeHeures) : null,
    regime_depuis: c("regime") ? dateFrToIso(f.regimeDepuis) : null,

    situation: c("situation") && f.situation ? f.situation : null,
    profession: profession ? ouNull(f.profession) : null,
    profession_cp: profession ? f.professionCp : null,
    situation_depuis: c("situation") ? dateFrToIso(f.situationDepuis) : null,

    transfert: statutTransfert(f),
    date_signature: dateFrToIso(f.dateSig),
    lieu_signature: net(f.lieu),
    signature: f.signature,
  };
}

/** Ligne en base (ou données reçues par la route d'envoi) → saisie du formulaire. */
export function depuisLigne(l: Record<string, unknown>): FormModification {
  const t = (v: unknown) => (typeof v === "string" ? v : "");
  const d = (v: unknown) => (typeof v === "string" ? isoToDateFr(v.slice(0, 10)) : "");
  const brut = Array.isArray(l.changements) ? l.changements : [];
  const regime = t(l.regime);
  const situation = t(l.situation);
  const heures = typeof l.regime_heures === "number" || typeof l.regime_heures === "string" ? String(l.regime_heures) : "";
  return {
    nom: t(l.nom),
    prenom: t(l.prenom),
    niss: t(l.niss),
    email: t(l.email),
    changements: CHANGEMENTS.filter((c) => brut.includes(c)),
    adresseRue: t(l.adresse_rue),
    adresseNumero: t(l.adresse_numero),
    adresseBoite: t(l.adresse_boite),
    adresseCodePostal: t(l.adresse_code_postal),
    adresseLocalite: t(l.adresse_localite),
    adresseDepuis: d(l.adresse_depuis),
    nouvelEmail: t(l.nouvel_email),
    nouveauTelephone: t(l.nouveau_telephone),
    contactDepuis: d(l.contact_depuis),
    employeurNom: t(l.employeur_nom),
    employeurOnssTva: t(l.employeur_onss_tva),
    employeurLocalite: t(l.employeur_localite),
    employeurCp: t(l.employeur_cp) || CP_INCONNUE,
    employeurDepuis: d(l.employeur_depuis),
    regime: regime === "temps_plein" || regime === "temps_partiel" ? regime : "",
    regimeHeures: heures.replace(".", ","),
    regimeDepuis: d(l.regime_depuis),
    situation: situation === "profession" || situation === "chomage" || situation === "mutuelle" ? situation : "",
    profession: t(l.profession),
    professionCp: t(l.profession_cp) || CP_INCONNUE,
    situationDepuis: d(l.situation_depuis),
    dateSig: d(l.date_signature),
    lieu: t(l.lieu_signature),
    signature: t(l.signature),
  };
}

// ── Récapitulatif (écran, PDF, e-mail) ───────────────────────────────────────

export type BlocRecap = { changement: Changement; titre: string; lignes: [string, string][] };

/** Les changements cochés, dans l'ordre, avec leurs informations remplies (les vides sont omis). */
export function recapitulatif(f: FormModification): BlocRecap[] {
  const blocs: BlocRecap[] = [];
  const garder = (lignes: [string, string][]) => lignes.filter(([, v]) => v.trim() !== "");
  for (const c of CHANGEMENTS) {
    if (!aCoche(f, c)) continue;
    let lignes: [string, string][] = [];
    if (c === "adresse") {
      const rue = [f.adresseRue.trim(), f.adresseNumero.trim()].filter(Boolean).join(" ");
      lignes = [
        ["Nouvelle adresse", f.adresseBoite.trim() ? `${rue}, boîte ${f.adresseBoite.trim()}` : rue],
        ["Code postal et localité", [f.adresseCodePostal.trim(), f.adresseLocalite.trim()].filter(Boolean).join(" ")],
        ["À partir du", f.adresseDepuis],
      ];
    } else if (c === "contact") {
      lignes = [
        ["Nouvel e-mail", f.nouvelEmail.trim().toLowerCase()],
        ["Nouveau téléphone", f.nouveauTelephone.trim()],
        ["À partir du", f.contactDepuis],
      ];
    } else if (c === "employeur") {
      lignes = [
        ["Employeur", f.employeurNom.trim()],
        ["N° ONSS ou TVA", f.employeurOnssTva.trim()],
        ["Localité", f.employeurLocalite.trim()],
        ["Commission paritaire", libelleCommission(f.employeurCp)],
        ["Date d'entrée", f.employeurDepuis],
      ];
    } else if (c === "regime") {
      const h = lireHeures(f.regimeHeures);
      lignes = [
        ["Régime", f.regime ? LIBELLES_REGIME[f.regime] : ""],
        ["Heures / semaine (moyenne)", f.regime === "temps_partiel" && h !== null ? `${String(h).replace(".", ",")} h` : ""],
        ["À partir du", f.regimeDepuis],
      ];
    } else {
      lignes = [
        ["Situation", f.situation ? LIBELLES_SITUATION[f.situation] : ""],
        ["Profession", f.situation === "profession" ? f.profession.trim() : ""],
        ["Commission paritaire", f.situation === "profession" ? libelleCommission(f.professionCp) : ""],
        ["À partir du", f.situationDepuis],
      ];
    }
    blocs.push({ changement: c, titre: INFOS_CHANGEMENT[c].titre, lignes: garder(lignes) });
  }
  return blocs;
}

/** Nom du fichier PDF : « changement-situation-dupont-marie.pdf ». */
export function nomFichierModification(nom: string, prenom: string): string {
  const morceau = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return ["changement-situation", morceau(nom), morceau(prenom)].filter(Boolean).join("-") + ".pdf";
}
