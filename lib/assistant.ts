/**
 * Assistant CG (chatbot d'aiguillage) : types, limites, textes fixes et contrôles partagés par le navigateur
 * et le serveur. Fichier sans dépendance, importable côté client.
 *
 * Règle n° 1 : l'assistant ORIENTE, il ne répond jamais sur le fond. L'IA ne fait que classer la demande
 * (catégorie, code postal, secteur, commission paritaire) ; tous les textes affichés sont écrits ici, par
 * le code, et les contacts viennent de la base (lib/assistant-donnees.ts).
 * Le registre national ne passe jamais par l'IA ni par e-mail.
 */

// ── Limites ──

export const MESSAGES_MAX = 20; // messages de la personne par session
export const MESSAGE_MAX = 500; // caractères par message
export const RESUME_MAX = 1500; // résumé modifiable dans la fenêtre de transmission

// ── Textes fixes ──

export const PRESENTATION =
  "Bonjour, je suis l'Assistant CG. Je ne donne pas de conseil juridique : mon rôle est de vous orienter vers la bonne personne.";
export const DEMANDE_INITIALE =
  "Pour commencer, indiquez votre code postal et décrivez votre question en quelques mots.";
export const REFUS_FOND =
  "Je ne peux pas répondre à cette question, mais je peux vous orienter vers la personne qui pourra le faire.";
export const MESSAGE_NON_AFFILIE =
  "Pour être défendu par notre service juridique, il faut être affilié. Vous pouvez vous affilier en ligne en quelques minutes. Attention : si un litige est déjà en cours, des arriérés de cotisations vous seront réclamés.";
export const LIEN_SECTIONS = "https://www.accg.be/fr/sections";
export const LIEN_MY_FGTB = "https://www.fgtb.be/my-fgtb";

export const EMAIL_ADMIN = "admin.nalux@accg.be";
export const EMAIL_ACCUEIL = "cg.nalux@accg.be";

// ── Catégories ──

export const CATEGORIES = ["demarche", "juridique", "administratif", "prime", "chomage", "autre"] as const;
export type Categorie = (typeof CATEGORIES)[number];

export const LIBELLES_CATEGORIE: Record<Categorie, string> = {
  demarche: "Démarche en ligne",
  juridique: "Question juridique",
  administratif: "Question administrative",
  prime: "Prime syndicale",
  chomage: "Chômage",
  autre: "Autre demande",
};

/** Catégories pour lesquelles une demande peut être transmise (b, c et e du parcours). */
export const CATEGORIES_TRANSMISSIBLES: readonly Categorie[] = ["juridique", "administratif", "prime", "autre"];

/** Choix rapides « type de question » (l'ordre est celui de l'écran). */
export const CHOIX_CATEGORIES: { valeur: Categorie; libelle: string }[] = [
  { valeur: "juridique", libelle: "Problème avec mon employeur, contrat, salaire, C4, licenciement" },
  { valeur: "chomage", libelle: "Chômage (complet, temporaire, allocations)" },
  { valeur: "administratif", libelle: "Question administrative ou prime syndicale" },
  { valeur: "demarche", libelle: "Faire une démarche en ligne" },
  { valeur: "autre", libelle: "Autre chose" },
];

// ── Démarches en ligne (section « Démarches en ligne » du site, app/forms.ts) ──

export const DEMARCHES = [
  { id: "affiliation", titre: "S'affilier", href: "/affiliation", quand: "devenir membre, s'affilier, adhérer au syndicat" },
  { id: "transfert", titre: "Changer de syndicat", href: "/parcours-transfert", quand: "quitter un autre syndicat pour la FGTB (parcours affiliation + C1 + C3.2)" },
  { id: "changement", titre: "Signaler un changement", href: "/changement-situation", quand: "nouvelle adresse, nouvel e-mail ou téléphone, nouvel employeur, régime de travail, nouvelle situation professionnelle" },
  { id: "sepa", titre: "Mandat SEPA ou changement de compte", href: "/mandat-sepa", quand: "payer sa cotisation par domiciliation, changer de compte bancaire" },
  { id: "c1", titre: "Formulaire C1", href: "/formulaire-c1", quand: "remplir la déclaration de situation personnelle et familiale de l'ONEM (C1)" },
  { id: "c32", titre: "Formulaire C3.2", href: "/formulaire-c3-2", quand: "remplir la demande d'allocations de chômage temporaire (C3.2)" },
  { id: "preavis", titre: "Calcul de préavis", href: "/preavis", quand: "calculer la durée de son préavis de démission et préparer sa lettre de démission ou de rupture de commun accord" },
] as const;
export type IdDemarche = (typeof DEMARCHES)[number]["id"];
export const IDS_DEMARCHES = DEMARCHES.map((d) => d.id) as [IdDemarche, ...IdDemarche[]];

// ── Régions ──

export type Region = "Namur" | "Luxembourg";

/** 5000-5999 : Namur ; 6600-6999 : Luxembourg ; autre code postal belge : hors de notre régionale. */
export function regionDuCodePostal(cp: string): Region | null {
  if (!/^\d{4}$/.test(cp)) return null;
  const n = Number(cp);
  if (n >= 5000 && n <= 5999) return "Namur";
  if (n >= 6600 && n <= 6999) return "Luxembourg";
  return null;
}

/** Code postal belge plausible : 4 chiffres, de 1000 à 9999. */
export function codePostalValide(cp: string): boolean {
  return /^[1-9]\d{3}$/.test(cp);
}

/** Message composé uniquement d'un code postal (« 5590 », « CP 5590 ») : reconnu sans appel à l'IA. */
export function codePostalSeul(message: string): string | null {
  const m = message.trim().match(/^(?:cp|code postal)?\s*:?\s*([1-9]\d{3})\s*\.?$/i);
  return m ? m[1] : null;
}

// ── Masquage avant envoi à l'IA ──

/**
 * Remplace dans un message tout ce qui ressemble à un numéro de registre national, un IBAN, une adresse
 * e-mail ou un numéro de téléphone. Le code postal (4 chiffres) n'est pas touché.
 * Appliqué côté serveur, avant tout envoi à l'IA.
 */
export function masquerDonneesSensibles(texte: string): string {
  return (
    texte
      // IBAN (BE68 5390 0754 7034, FR76…) : 2 lettres, 2 chiffres, puis au moins 10 caractères alphanumériques.
      .replace(/\b[A-Z]{2}\d{2}(?:[ .-]?[A-Z0-9]){10,30}\b/gi, "[IBAN masqué]")
      // Registre national : 11 chiffres, séparateurs facultatifs (85.07.30-033.28, 85073003328).
      .replace(/\b\d{2}[ .\-/]?\d{2}[ .\-/]?\d{2}[ .\-/]?\d{3}[ .\-/]?\d{2}\b/g, "[numéro masqué]")
      .replace(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, "[e-mail masqué]")
      // Téléphone : 9 chiffres ou plus, éventuellement précédés de +, avec espaces, points, barres ou tirets.
      .replace(/(?:\+|\b)\d(?:[ .\-/()]*\d){8,14}\b/g, "[téléphone masqué]")
  );
}

// ── Registre national ──

/** Chiffres seuls du numéro saisi. */
export function chiffresRegistre(v: string): string {
  return v.replace(/\D/g, "");
}

/**
 * Numéro de registre national belge : 11 chiffres, clé de contrôle modulo 97 sur les 9 premiers.
 * Naissances à partir de 2000 : la clé se calcule sur « 2 » suivi des 9 premiers chiffres.
 */
export function registreNationalValide(v: string): boolean {
  const c = chiffresRegistre(v);
  if (c.length !== 11) return false;
  const base = Number(c.slice(0, 9));
  const cle = Number(c.slice(9));
  return 97 - (base % 97) === cle || 97 - ((2_000_000_000 + base) % 97) === cle;
}

/** Affichage 85.07.30-033.28. */
export function formaterRegistre(v: string): string {
  const c = chiffresRegistre(v);
  if (c.length !== 11) return v;
  return `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4, 6)}-${c.slice(6, 9)}.${c.slice(9)}`;
}

// ── Transmission ──

export const CHAMP_PIEGE_ASSISTANT = "site_web";

export type DemandeTransmission = {
  nom: string;
  prenom: string;
  email: string;
  registre_national: string;
  resume: string;
  consentement: boolean;
};
export type ErreursTransmission = Partial<Record<keyof DemandeTransmission, string>>;

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export function nettoyerTransmission(brut: Record<string, unknown>): DemandeTransmission {
  const ligne = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const resume = typeof brut.resume === "string" ? brut.resume.replace(/\r\n?/g, "\n").trim().slice(0, RESUME_MAX) : "";
  return {
    nom: ligne(brut.nom, 100),
    prenom: ligne(brut.prenom, 100),
    email: ligne(brut.email, 254).toLowerCase(),
    registre_national: ligne(brut.registre_national, 20),
    resume: resume.replace(/\n{3,}/g, "\n\n"),
    consentement: brut.consentement === true,
  };
}

export function validerTransmission(d: DemandeTransmission): ErreursTransmission {
  const e: ErreursTransmission = {};
  if (!d.nom) e.nom = "Indiquez votre nom.";
  if (!d.prenom) e.prenom = "Indiquez votre prénom.";
  if (!d.email) e.email = "Indiquez votre adresse e-mail : c'est là que nous vous répondrons.";
  else if (!EMAIL.test(d.email)) e.email = "Cette adresse e-mail n'est pas valide (exemple : prenom.nom@exemple.be).";
  if (d.registre_national && !registreNationalValide(d.registre_national)) {
    e.registre_national = "Ce numéro n'est pas valide. Vérifiez les 11 chiffres, ou laissez le champ vide.";
  }
  if (d.resume.length < 10) e.resume = "Décrivez votre demande en quelques mots (10 caractères au minimum).";
  if (!d.consentement) e.consentement = "Cochez cette case pour que nous puissions traiter votre demande.";
  return e;
}

// ── Échanges navigateur ↔ serveur ──

export type Statut = "ouvrier" | "employe";

/**
 * Qui paie une personne qui fait du nettoyage (précision de Fred, 08/10/2026) : la Centrale Générale ne
 * couvre que les entreprises de nettoyage (CP 121) et les titres-services (CP 322,01). Engagée directement
 * par un hôtel, un hôpital, une école… la personne relève du secteur de cet employeur.
 */
export type EmployeurNettoyage = "nettoyage" | "titres_services" | "autre";

/** Ce que l'assistant sait de la demande. Tenu par le navigateur, revérifié par le serveur à chaque tour. */
export type EtatAssistant = {
  codePostal: string | null;
  categorie: Categorie | null;
  demarche: IdDemarche | null;
  secteur: string | null; // mot_cle de site_chatbot_secteurs
  statut: Statut | null;
  cpCode: string | null; // cp_code de site_chatbot_repartition
  cpInconnu: boolean; // la personne a dit ne pas connaître son secteur
  employeurNettoyage: EmployeurNettoyage | null;
  tentativesCp: number;
  affilie: boolean | null;
  resume: string;
  termine: boolean;
};

export const ETAT_INITIAL: EtatAssistant = {
  codePostal: null,
  categorie: null,
  demarche: null,
  secteur: null,
  statut: null,
  cpCode: null,
  cpInconnu: false,
  employeurNettoyage: null,
  tentativesCp: 0,
  affilie: null,
  resume: "",
  termine: false,
};

/** Bouton de réponse rapide : il renvoie une action au serveur, sans passer par l'IA. */
export type Choix = { libelle: string; action: ActionAssistant };

export type ActionAssistant =
  | { type: "categorie"; valeur: Categorie }
  | { type: "cp"; valeur: string }
  | { type: "cp_inconnu" }
  | { type: "employeur"; valeur: EmployeurNettoyage }
  | { type: "secteur"; valeur: string }
  | { type: "lieu_autre" }
  | { type: "statut"; valeur: Statut }
  | { type: "affilie"; valeur: boolean };

export type FicheBureau = {
  titre: string;
  sousTitre?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  horaires?: string;
  site?: string;
};

export type ContactTransmission = {
  service: string; // nom affiché (personne ou service)
  telephone: string;
  horaires: string;
  email?: string; // affiché seulement pour les adresses génériques
};

/** Ce que l'assistant affiche, bloc par bloc. Tous les textes sont écrits par le code. */
export type Bloc =
  | { type: "texte"; texte: string; ton?: "info" | "alerte" }
  | { type: "lien"; texte: string; href: string; externe?: boolean }
  | { type: "choix"; question?: string; choix: Choix[]; liste?: boolean }
  | { type: "fiches"; fiches: FicheBureau[] }
  | { type: "contact"; contact: ContactTransmission; resume: string };

export type ReponseAssistant = { etat: EtatAssistant; blocs: Bloc[] };

/** Texte brut d'un bloc (pour l'historique envoyé à l'IA comme contexte). */
export function texteDuBloc(b: Bloc): string {
  switch (b.type) {
    case "texte":
      return b.texte;
    case "lien":
      return b.texte;
    case "choix":
      return b.question ?? "";
    case "fiches":
      return `Coordonnées affichées : ${b.fiches.map((f) => f.titre).join(", ")}.`;
    case "contact":
      return `Contact proposé : ${b.contact.service}.`;
  }
}
