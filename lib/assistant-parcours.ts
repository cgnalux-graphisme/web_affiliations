import {
  CATEGORIES,
  CATEGORIES_TRANSMISSIBLES,
  CHOIX_CATEGORIES,
  DEMARCHES,
  EMAIL_ACCUEIL,
  EMAIL_ADMIN,
  LIEN_MY_FGTB,
  LIEN_SECTIONS,
  MESSAGE_NON_AFFILIE,
  REFUS_FOND,
  regionDuCodePostal,
  type ActionAssistant,
  type Bloc,
  type Categorie,
  type ContactTransmission,
  type EmployeurNettoyage,
  type EtatAssistant,
  type FicheBureau,
  type IdDemarche,
  type Region,
  type ReponseAssistant,
  type Statut,
} from "./assistant";
import { choisirAntennes } from "./assistant-antennes";
import { BUREAUX, JOURS_OUVRABLES, maintenantBruxelles, periodeDuMois, type Bureau } from "./bureaux";

/**
 * Parcours de l'Assistant CG : à partir de ce que l'on sait (EtatAssistant) et des tables du chatbot, le CODE
 * décide de l'étape suivante et écrit tous les textes. L'IA n'intervient qu'avant, pour classer le message
 * libre (lib/assistant-ia.ts). Fonctions pures, sans accès à la base : testables (assistant-parcours.test.ts).
 */

// ── Données (lignes des tables site_chatbot_*) ──

export type LigneSecteur = { mot_cle: string; centrales: string; remarque: string | null };
export type LigneRepartition = {
  region: string;
  cp_code: string;
  cp_nom: string;
  contact_nom: string;
  contact_email: string;
  contact_tel: string | null;
};
export type LigneCentrale = {
  province: string;
  centrale: string;
  nom_affiche: string | null;
  bureau: string | null;
  adresse: string | null;
  code_postal: string | null;
  commune: string | null;
  telephone: string | null;
  email: string | null;
  horaires: string | null;
  site_web: string | null;
};
export type LigneAntenne = {
  province: string;
  antenne: string;
  adresse: string | null;
  code_postal: string | null;
  commune: string | null;
  telephone: string | null;
  horaires: string | null;
};
export type DonneesAssistant = {
  secteurs: LigneSecteur[];
  repartition: LigneRepartition[];
  centrales: LigneCentrale[];
  antennes: LigneAntenne[];
};

export const CENTRALE_GENERALE = "Centrale Générale";

/** « UBT ; CGSP » → ["UBT", "CGSP"]. */
export function centralesDuSecteur(s: LigneSecteur): string[] {
  return s.centrales
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean);
}

/** Les commissions paritaires d'une région, sans les commissions auxiliaires 100 et 200 (« Suivi du secteur »). */
export function commissionsDeLaRegion(d: DonneesAssistant, region: Region): LigneRepartition[] {
  return d.repartition
    .filter((r) => r.region === region && !/^CP (100|200)$/.test(r.cp_code.trim()))
    .sort((a, b) => a.cp_nom.localeCompare(b.cp_nom, "fr"));
}

// ── Ouvrier ou employé ? ──

const base = (motCle: string) => motCle.replace(/\s*\((ouvriers|employés)\)\s*$/i, "").trim().toLowerCase();

/**
 * Secteur partagé entre deux centrales selon le statut (« Commerce alimentaire (employés) » au SETCa,
 * « (ouvriers) » chez Horval) : renvoie la variante qui correspond au statut, ou null si le statut manque.
 * Secteur sans variante : renvoyé tel quel.
 */
export function secteurSelonStatut(d: DonneesAssistant, motCle: string, statut: Statut | null): LigneSecteur | null | "statut_requis" {
  const ligne = d.secteurs.find((s) => s.mot_cle === motCle);
  if (!ligne) return null;
  const variantes = d.secteurs.filter((s) => base(s.mot_cle) === base(motCle) && /\((ouvriers|employés)\)\s*$/i.test(s.mot_cle));
  if (variantes.length < 2) return ligne;
  if (!statut) return "statut_requis";
  const voulu = statut === "ouvrier" ? /\(ouvriers\)/i : /\(employés\)/i;
  return variantes.find((s) => voulu.test(s.mot_cle)) ?? ligne;
}

// ── Secteurs transférés à l'Horval ──

/**
 * Secteurs historiquement à la Centrale Générale, passés sous la responsabilité de l'Horval lors de la
 * répartition des secteurs au sein de la FGTB (précision de Fred, 08/10/2026) : un nouveau travailleur va à
 * l'Horval, mais les anciens affiliés de la Centrale Générale y restent (commission paritaire « résiduel »).
 * Clé : mot_cle de site_chatbot_secteurs ; valeur : cp_code de site_chatbot_repartition.
 */
export const SECTEURS_TRANSFERES: Record<string, string> = {
  Agriculture: "CP 144",
  Horticulture: "CP 145",
  Floriculture: "CP 145",
  Pépinières: "CP 145",
  Maraîchers: "CP 145",
  "Parcs et jardins": "CP 145",
  Fruiticulture: "CP 145",
  "Entreprises forestières": "CP 146",
  Sylviculture: "CP 146",
};

/** Commissions « résiduel » de la Centrale Générale pour ces secteurs (la CP 132 n'a pas de mot-clé propre). */
export const CP_TRANSFERES = ["CP 132", "CP 144", "CP 145", "CP 146"];

/** Centrale aujourd'hui compétente pour les secteurs transférés. */
const CENTRALE_TRANSFERT = "HORVAL";

/**
 * Secteur transféré concerné par la demande, repéré par son mot-clé ou par sa commission paritaire
 * « résiduel » (choisie dans la liste ou reconnue par l'IA), sinon null.
 */
function transfert(e: EtatAssistant, d: DonneesAssistant): { cp: string; libelle: string } | null {
  const region = e.codePostal ? regionDuCodePostal(e.codePostal) : null;
  const cp = (e.secteur && SECTEURS_TRANSFERES[e.secteur]) || (e.cpCode && CP_TRANSFERES.includes(e.cpCode) ? e.cpCode : null);
  if (!cp) return null;
  const ligne = d.repartition.find((r) => r.region === region && r.cp_code === cp);
  const libelle = e.secteur && SECTEURS_TRANSFERES[e.secteur] ? e.secteur : (ligne?.cp_nom ?? cp);
  return { cp, libelle: libelle.replace(/\s*\(résiduel\)\s*$/i, "").toLowerCase() };
}

// ── Nettoyage : c'est l'employeur qui compte ──

/**
 * « Nettoyage » ne suffit pas (précision de Fred, 08/10/2026) : la Centrale Générale couvre les travailleurs
 * payés par une entreprise de nettoyage (CP 121, même chez un client hôpital ou école) et les titres-services
 * (CP 322,01). Une personne engagée directement par un hôtel, un hôpital, une école… relève du secteur de cet
 * employeur : l'assistant demande donc qui l'emploie (EtatAssistant.employeurNettoyage).
 */
export const SECTEUR_NETTOYAGE = "Nettoyage";
export const SECTEUR_TITRES = "Titres-services";
export const CP_NETTOYAGE = "CP 121 - 200";
export const CP_TITRES = "CP 322,01";

/** Choix rapides pour une personne engagée directement par le lieu où elle nettoie (mot_cle de site_chatbot_secteurs). */
const LIEUX_NETTOYAGE = [
  { libelle: "Un hôtel, un restaurant, un café", secteur: "Horeca" },
  { libelle: "Une commune, un CPAS, un hôpital public", secteur: "Pouvoirs locaux (communes, CPAS…)" },
];

/**
 * Complète l'état avec ce qui s'en déduit sans rien demander : commission paritaire du nettoyage ou des
 * titres-services selon l'employeur, secteur « Nettoyage » retiré si la personne est engagée directement par
 * le lieu, commission « résiduel » d'un ancien affilié d'un secteur transféré à l'Horval.
 */
export function normaliser(etat: EtatAssistant, d: DonneesAssistant): EtatAssistant {
  const region = etat.codePostal ? regionDuCodePostal(etat.codePostal) : null;
  const existe = (cp: string) => d.repartition.some((r) => r.region === region && r.cp_code === cp);
  let e = etat;
  if (e.employeurNettoyage === "nettoyage") {
    e = { ...e, secteur: e.secteur ?? SECTEUR_NETTOYAGE, cpCode: e.cpCode ?? (existe(CP_NETTOYAGE) ? CP_NETTOYAGE : null) };
  } else if (e.employeurNettoyage === "titres_services") {
    e = { ...e, secteur: SECTEUR_TITRES, cpCode: existe(CP_TITRES) ? CP_TITRES : e.cpCode === CP_NETTOYAGE ? null : e.cpCode };
  } else if (e.employeurNettoyage === "autre") {
    e = {
      ...e,
      secteur: e.secteur === SECTEUR_NETTOYAGE || e.secteur === SECTEUR_TITRES ? null : e.secteur,
      cpCode: e.cpCode === CP_NETTOYAGE || e.cpCode === CP_TITRES ? null : e.cpCode,
    };
  }
  // Ancien affilié d'un secteur transféré : sa commission paritaire « résiduel » de la Centrale Générale.
  const t = e.affilie === true ? transfert(e, d) : null;
  if (t && !e.cpCode && existe(t.cp)) e = { ...e, cpCode: t.cp };
  return e;
}

// ── Bureaux et horaires de la région ──

/** Bureau de référence d'une région : Namur ; pour le Luxembourg, le siège de Libramont (lignes de la 1re ligne). */
export function bureauDeLaRegion(region: Region): Bureau {
  const ville = region === "Namur" ? "Namur" : "Libramont";
  return BUREAUX.find((b) => b.ville === ville)!;
}

/** « Lun, mar : 08:30-12:00 / 13:00-16:30 · Mer, ven : 08:30-12:00 » (jours identiques regroupés). */
export function horairesCompacts(b: Bureau, date = new Date()): string {
  const periode = periodeDuMois(maintenantBruxelles(date).mois);
  const groupes: { jours: string[]; texte: string }[] = [];
  for (const jour of JOURS_OUVRABLES) {
    const creneaux = b.horaires[periode][jour];
    if (!creneaux.length) continue;
    const texte = creneaux.map(([a, z]) => `${a}-${z}`).join(" / ");
    const g = groupes.find((x) => x.texte === texte);
    const court = jour.slice(0, 3).toLowerCase();
    if (g) g.jours.push(court);
    else groupes.push({ jours: [court], texte });
  }
  return groupes
    .map((g) => {
      const j = g.jours.join(", ");
      return `${j.charAt(0).toUpperCase()}${j.slice(1)} : ${g.texte}`;
    })
    .join(" · ");
}

// ── Destinataire d'une demande transmise ──

export type Destinataire = ContactTransmission & { destinataireEmail: string; categorie: Categorie };

/**
 * Qui reçoit la demande (cas b, c et e du parcours). Calculé UNIQUEMENT ici, côté serveur, à partir du code
 * postal, de la catégorie et de la commission paritaire : jamais une adresse venue du navigateur ni de l'IA.
 * null : pas de transmission pour ce cas (chômage, démarche en ligne, autre centrale, hors zone).
 */
export function resoudreDestinataire(brut: EtatAssistant, d: DonneesAssistant, date = new Date()): Destinataire | null {
  const etat = normaliser(brut, d);
  const region = etat.codePostal ? regionDuCodePostal(etat.codePostal) : null;
  if (!region || !etat.categorie || !CATEGORIES_TRANSMISSIBLES.includes(etat.categorie)) return null;
  const bureau = bureauDeLaRegion(region);
  const horaires = `Bureau de ${bureau.ville} · ${horairesCompacts(bureau, date)}`;
  const accueil: Destinataire = {
    categorie: etat.categorie,
    service: `Accueil de la Centrale Générale (${bureau.ville})`,
    telephone: bureau.telephone,
    horaires,
    email: EMAIL_ACCUEIL,
    destinataireEmail: EMAIL_ACCUEIL,
  };
  // Nettoyage chez un employeur qui n'est pas une entreprise de nettoyage : l'accueil réoriente.
  if (etat.employeurNettoyage === "autre") return accueil;

  if (etat.categorie === "administratif" || etat.categorie === "prime") {
    return {
      categorie: etat.categorie,
      service: "Service administratif de la Centrale Générale",
      telephone: bureau.telephone,
      horaires,
      email: EMAIL_ADMIN,
      destinataireEmail: EMAIL_ADMIN,
    };
  }
  if (etat.categorie === "juridique" && etat.cpCode) {
    const ligne = d.repartition.find((r) => r.region === region && r.cp_code === etat.cpCode);
    if (ligne?.contact_email) {
      return {
        categorie: "juridique",
        service: `${ligne.contact_nom}, 1re ligne juridique`,
        telephone: ligne.contact_tel || bureau.telephone,
        horaires,
        destinataireEmail: ligne.contact_email.trim().toLowerCase(),
      };
    }
  }
  return accueil; // « autre », ou question juridique dont le secteur reste introuvable
}

/** Partie du destinataire montrée à la personne (jamais l'adresse d'une personne nommée). */
function contactAffiche(dest: Destinataire): ContactTransmission {
  const { service, telephone, horaires, email } = dest;
  return { service, telephone, horaires, ...(email ? { email } : {}) };
}

// ── Fiches ──

function ficheCentrale(c: LigneCentrale): FicheBureau {
  const adresse = [c.adresse, [c.code_postal, c.commune].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return {
    titre: c.nom_affiche || c.centrale,
    sousTitre: c.bureau ? `Bureau ${/^[aeiouéèêh]/i.test(c.bureau) ? "d'" : "de "}${c.bureau}` : undefined,
    adresse: adresse || undefined,
    telephone: c.telephone || undefined,
    email: c.email || undefined,
    horaires: c.horaires && !/^non publi/i.test(c.horaires) ? c.horaires : undefined,
    site: c.site_web || undefined,
  };
}

function ficheAntenne(a: LigneAntenne, premiere: boolean): FicheBureau {
  return {
    titre: a.antenne,
    sousTitre: premiere ? "La plus proche de chez vous" : undefined,
    adresse: [a.adresse, [a.code_postal, a.commune].filter(Boolean).join(" ")].filter(Boolean).join(", ") || undefined,
    telephone: a.telephone || undefined,
    horaires: a.horaires || undefined,
  };
}

// ── Étapes ──

export type Etape = "code_postal" | "hors_zone" | "chomage" | "employeur_nettoyage" | "lieu_nettoyage" | "statut" | "ancien_affilie" | "autre_centrale" | "categorie" | "demarche" | "secteur" | "affilie" | "contact";

/** Où en est la demande : la prochaine chose à faire ou à demander. */
export function etapeCourante(brut: EtatAssistant, d: DonneesAssistant): Etape {
  const etat = normaliser(brut, d);
  if (!etat.codePostal) return "code_postal";
  const region = regionDuCodePostal(etat.codePostal);
  if (!region) return "hors_zone";
  if (etat.categorie === "chomage") return "chomage";
  if (etat.employeurNettoyage === null && (etat.secteur === SECTEUR_NETTOYAGE || etat.cpCode === CP_NETTOYAGE)) {
    return "employeur_nettoyage";
  }
  // Secteur transféré à l'Horval : seuls les anciens affiliés restent à la Centrale Générale.
  const t = transfert(etat, d);
  if (t) {
    if (etat.affilie === null) return "ancien_affilie";
    if (etat.affilie === false) return "autre_centrale";
  } else if (etat.secteur) {
    const s = secteurSelonStatut(d, etat.secteur, etat.statut);
    if (s === "statut_requis") return "statut";
    if (s && !centralesDuSecteur(s).includes(CENTRALE_GENERALE)) return "autre_centrale";
  }
  // Engagé(e) directement par le lieu où il ou elle nettoie : le secteur de cet employeur décide.
  if (etat.employeurNettoyage === "autre" && !etat.secteur && etat.tentativesCp < 2) return "lieu_nettoyage";
  if (!etat.categorie) return "categorie";
  if (etat.categorie === "demarche") return "demarche";
  if (etat.categorie === "juridique") {
    if (etat.employeurNettoyage === "autre") return "contact";
    if (!etat.cpCode && etat.tentativesCp < 2) return "secteur";
    if (etat.affilie === null) return "affilie";
  }
  return "contact";
}

const PROVINCE: Record<Region, string> = { Namur: "province de Namur", Luxembourg: "province de Luxembourg" };

/** Construit la réponse de l'assistant pour l'état donné. `refusFond` : la personne a demandé un avis sur le fond. */
export function construireReponse(
  etat: EtatAssistant,
  d: DonneesAssistant,
  options: { refusFond?: boolean; secteurIntrouvable?: boolean; date?: Date } = {}
): ReponseAssistant {
  const blocs: Bloc[] = [];
  if (options.refusFond) blocs.push({ type: "texte", texte: REFUS_FOND });
  const region = etat.codePostal ? regionDuCodePostal(etat.codePostal) : null;
  etat = normaliser(etat, d);
  const etape = etapeCourante(etat, d);
  let termine = false;

  switch (etape) {
    case "code_postal":
      blocs.push({ type: "texte", texte: "Quel est votre code postal ? (4 chiffres, par exemple 5000)" });
      break;

    case "hors_zone":
      blocs.push({
        type: "texte",
        texte: `Le code postal ${etat.codePostal} ne fait pas partie de la régionale Namur-Luxembourg. Trouvez la section de la Centrale Générale FGTB de votre région :`,
      });
      blocs.push({ type: "lien", texte: "Les sections de la Centrale Générale FGTB", href: LIEN_SECTIONS, externe: true });
      termine = true;
      break;

    case "chomage": {
      const deLaProvince = d.antennes.filter((a) => a.province === region);
      const antennes = choisirAntennes(deLaProvince, etat.codePostal!);
      blocs.push({
        type: "texte",
        texte:
          antennes.length < deLaProvince.length
            ? "Pour le chômage, adressez-vous à une antenne chômage de la FGTB. Voici les deux plus proches de chez vous :"
            : `Pour le chômage, adressez-vous aux antennes chômage de la FGTB dans la ${PROVINCE[region!]} :`,
      });
      blocs.push({ type: "fiches", fiches: antennes.map((a, i) => ficheAntenne(a, i === 0 && antennes.length > 1)) });
      blocs.push({
        type: "texte",
        texte: "Ces antennes ne répondent pas par e-mail. Pour poser une question par écrit, passez uniquement par My FGTB.",
      });
      blocs.push({ type: "lien", texte: "Ouvrir My FGTB", href: LIEN_MY_FGTB, externe: true });
      termine = true;
      break;
    }

    case "employeur_nettoyage":
      blocs.push({
        type: "choix",
        question: "Qui est votre employeur ? Par exemple : une société de nettoyage, un hôpital, un hôtel…",
        choix: [
          { libelle: "Une entreprise de nettoyage (elle m'envoie chez ses clients)", action: { type: "employeur", valeur: "nettoyage" } },
          { libelle: "Une entreprise de titres-services (je travaille chez des particuliers)", action: { type: "employeur", valeur: "titres_services" } },
          { libelle: "Directement l'endroit où je nettoie (hôtel, hôpital, école, commune…)", action: { type: "employeur", valeur: "autre" } },
        ],
        liste: true,
      });
      break;

    case "lieu_nettoyage":
      blocs.push({
        type: "choix",
        question: options.secteurIntrouvable
          ? "Je n'ai pas reconnu ce lieu. Dites-moi en quelques mots ce que fait votre employeur, ou choisissez dans la liste."
          : "Dans ce cas, c'est le secteur de votre employeur qui compte, pas le nettoyage. Où travaillez-vous ? Vous pouvez aussi l'écrire en quelques mots.",
        choix: [
          ...LIEUX_NETTOYAGE.filter((l) => d.secteurs.some((s) => s.mot_cle === l.secteur)).map((l) => ({
            libelle: l.libelle,
            action: { type: "secteur" as const, valeur: l.secteur },
          })),
          { libelle: "Un autre employeur (clinique privée, maison de repos, bureau…)", action: { type: "lieu_autre" as const } },
        ],
        liste: true,
      });
      break;

    case "statut":
      blocs.push({
        type: "choix",
        question: "Êtes-vous ouvrier (ouvrière) ou employé(e) ? Selon votre statut, ce n'est pas la même centrale.",
        choix: [
          { libelle: "Ouvrier ou ouvrière", action: { type: "statut", valeur: "ouvrier" } },
          { libelle: "Employé(e)", action: { type: "statut", valeur: "employe" } },
        ],
      });
      break;

    case "ancien_affilie": {
      const t = transfert(etat, d)!;
      blocs.push({
        type: "choix",
        question: `Votre secteur (${t.libelle}) dépend aujourd'hui de la centrale ${CENTRALE_TRANSFERT} de la FGTB. Si vous étiez déjà affilié(e) à la Centrale Générale, vous y restez. Êtes-vous déjà affilié(e) à la Centrale Générale ?`,
        choix: [
          { libelle: "Oui", action: { type: "affilie", valeur: true } },
          { libelle: "Non", action: { type: "affilie", valeur: false } },
        ],
      });
      break;
    }

    case "autre_centrale": {
      const t = transfert(etat, d);
      const s = t ? null : (secteurSelonStatut(d, etat.secteur!, etat.statut) as LigneSecteur);
      const noms = s ? centralesDuSecteur(s) : [CENTRALE_TRANSFERT];
      const fiches = d.centrales.filter((c) => c.province === region && noms.includes(c.centrale)).map(ficheCentrale);
      const liste = noms.join(" ou ");
      const libelle = t ? t.libelle : s!.mot_cle.replace(/\s*\(.*\)\s*$/, "").toLowerCase();
      blocs.push({
        type: "texte",
        texte: `Pour votre secteur (${libelle}), c'est la centrale ${liste} de la FGTB qui est compétente, pas la Centrale Générale. ${
          fiches.length ? `Voici ses coordonnées dans la ${PROVINCE[region!]} :` : "Contactez-la directement."
        }`,
      });
      if (noms.length > 1 && s?.remarque) blocs.push({ type: "texte", texte: s.remarque.replace(/^Arbitrage\s*:\s*/i, "") });
      if (fiches.length) blocs.push({ type: "fiches", fiches });
      termine = true;
      break;
    }

    case "categorie":
      blocs.push({
        type: "choix",
        question: "Quel est le sujet de votre question ?",
        choix: CHOIX_CATEGORIES.map((c) => ({ libelle: c.libelle, action: { type: "categorie", valeur: c.valeur } })),
        liste: true,
      });
      break;

    case "demarche": {
      const d1 = DEMARCHES.find((x) => x.id === etat.demarche);
      if (d1) {
        blocs.push({ type: "texte", texte: "Bonne nouvelle : cette démarche se fait en ligne, en quelques minutes." });
        blocs.push({ type: "lien", texte: d1.titre, href: d1.href });
      } else {
        blocs.push({ type: "texte", texte: "Voici les démarches que vous pouvez faire en ligne :" });
        for (const x of DEMARCHES) blocs.push({ type: "lien", texte: x.titre, href: x.href });
      }
      termine = true;
      break;
    }

    case "secteur": {
      const cps = commissionsDeLaRegion(d, region!);
      blocs.push({
        type: "choix",
        question: options.secteurIntrouvable
          ? "Décrivez votre métier ou ce que fait votre entreprise en quelques mots, ou choisissez votre secteur dans la liste."
          : "Pour vous orienter vers la bonne personne, j'ai besoin de connaître votre secteur. Quel est votre métier, ou que fait votre entreprise ? Vous pouvez aussi choisir dans la liste.",
        choix: [
          ...cps.map((c) => ({ libelle: c.cp_nom, action: { type: "cp" as const, valeur: c.cp_code } })),
          { libelle: "Je ne sais pas", action: { type: "cp_inconnu" as const } },
        ],
        liste: true,
      });
      break;
    }

    case "affilie":
      blocs.push({
        type: "choix",
        question: "Êtes-vous affilié(e) à la Centrale Générale ?",
        choix: [
          { libelle: "Oui", action: { type: "affilie", valeur: true } },
          { libelle: "Non", action: { type: "affilie", valeur: false } },
        ],
      });
      break;

    case "contact": {
      const dest = resoudreDestinataire(etat, d, options.date);
      if (!dest) break;
      const cp = etat.cpCode ? d.repartition.find((r) => r.region === region && r.cp_code === etat.cpCode) : null;
      if (etat.categorie === "juridique" && etat.affilie === false) {
        blocs.push({ type: "texte", texte: MESSAGE_NON_AFFILIE, ton: "alerte" });
        blocs.push({ type: "lien", texte: "S'affilier en ligne", href: "/affiliation" });
      }
      if (etat.employeurNettoyage === "autre") {
        blocs.push({
          type: "texte",
          texte:
            "Comme vous êtes engagé(e) directement par l'endroit où vous nettoyez, vous ne dépendez probablement pas de la Centrale Générale. L'accueil de la Centrale vous indiquera la bonne centrale de la FGTB :",
        });
      } else if (etat.categorie === "juridique" && cp) {
        blocs.push({ type: "texte", texte: `Votre question relève de la 1re ligne juridique de votre secteur (${cp.cp_nom.replace(/\s*\(résiduel\)\s*$/i, "").toLowerCase()}). Votre contact :` });
      } else if (etat.categorie === "juridique") {
        blocs.push({ type: "texte", texte: "Je n'ai pas pu identifier votre secteur. L'accueil de la Centrale va vous orienter :" });
      } else if (etat.categorie === "prime") {
        blocs.push({ type: "texte", texte: "Pour la prime syndicale, adressez-vous à notre service administratif :" });
      } else if (etat.categorie === "administratif") {
        blocs.push({ type: "texte", texte: "Pour une question administrative, adressez-vous à notre service administratif :" });
      } else {
        blocs.push({ type: "texte", texte: "Le mieux est de vous adresser à l'accueil de la Centrale, qui vous orientera :" });
      }
      blocs.push({ type: "contact", contact: contactAffiche(dest), resume: etat.resume });
      termine = true;
      break;
    }
  }

  return { etat: { ...etat, termine }, blocs };
}

// ── Fusion des informations ──

/** Ce que l'IA a extrait d'un message libre, déjà vérifié (valeurs connues de la base uniquement). */
export type Extraction = {
  codePostal: string | null;
  categorie: Categorie | null;
  demarche: IdDemarche | null;
  secteur: string | null;
  statut: Statut | null;
  cpCode: string | null;
  employeurNettoyage: EmployeurNettoyage | null;
  affilie: boolean | null;
  demandeFond: boolean;
  resume: string;
};

/**
 * Ajoute à l'état ce que l'IA vient d'extraire (une information connue n'est jamais effacée par un « inconnu »).
 * Compte une tentative quand on attendait le secteur et que le message ne l'a pas donné.
 */
export function fusionnerExtraction(
  etat: EtatAssistant,
  x: Extraction,
  d: DonneesAssistant
): { etat: EtatAssistant; secteurIntrouvable: boolean } {
  const avant = etapeCourante(etat, d);
  const suivant: EtatAssistant = {
    ...etat,
    codePostal: x.codePostal ?? etat.codePostal,
    categorie: x.categorie ?? etat.categorie,
    demarche: x.demarche ?? etat.demarche,
    secteur: x.secteur ?? etat.secteur,
    statut: x.statut ?? etat.statut,
    cpCode: x.cpCode ?? etat.cpCode,
    employeurNettoyage: x.employeurNettoyage ?? etat.employeurNettoyage,
    affilie: x.affilie ?? etat.affilie,
    resume: x.resume.trim() || etat.resume,
  };
  // Nouvel « engagé(e) directement par le lieu » : le compteur de tentatives repart de zéro.
  if (suivant.employeurNettoyage === "autre" && etat.employeurNettoyage !== "autre") suivant.tentativesCp = 0;
  let secteurIntrouvable = false;
  if ((avant === "secteur" || avant === "lieu_nettoyage") && etapeCourante(suivant, d) === avant) {
    suivant.tentativesCp = etat.tentativesCp + 1;
    secteurIntrouvable = suivant.tentativesCp < 2;
  }
  return { etat: suivant, secteurIntrouvable };
}

/** Applique un bouton de réponse rapide (aucun appel à l'IA). Valeurs revérifiées contre la base. */
export function appliquerAction(
  etat: EtatAssistant,
  action: ActionAssistant,
  d: DonneesAssistant
): { etat: EtatAssistant; secteurIntrouvable: boolean } {
  switch (action.type) {
    case "categorie":
      return { etat: { ...etat, categorie: CATEGORIES.includes(action.valeur) ? action.valeur : etat.categorie }, secteurIntrouvable: false };
    case "statut":
      return { etat: { ...etat, statut: action.valeur === "ouvrier" ? "ouvrier" : "employe" }, secteurIntrouvable: false };
    case "affilie":
      return { etat: { ...etat, affilie: action.valeur === true }, secteurIntrouvable: false };
    case "cp": {
      const region = etat.codePostal ? regionDuCodePostal(etat.codePostal) : null;
      const connu = d.repartition.some((r) => r.region === region && r.cp_code === action.valeur);
      return { etat: { ...etat, cpCode: connu ? action.valeur : etat.cpCode }, secteurIntrouvable: false };
    }
    case "employeur": {
      const valeur = action.valeur === "nettoyage" || action.valeur === "titres_services" ? action.valeur : "autre";
      return { etat: { ...etat, employeurNettoyage: valeur, ...(valeur === "autre" ? { tentativesCp: 0 } : {}) }, secteurIntrouvable: false };
    }
    case "secteur": {
      const connu = d.secteurs.some((s) => s.mot_cle === action.valeur);
      return { etat: { ...etat, secteur: connu ? action.valeur : etat.secteur }, secteurIntrouvable: false };
    }
    case "lieu_autre":
      return { etat: { ...etat, tentativesCp: 2 }, secteurIntrouvable: false };
    case "cp_inconnu": {
      const tentativesCp = etat.tentativesCp + 1;
      return { etat: { ...etat, cpInconnu: true, tentativesCp }, secteurIntrouvable: tentativesCp < 2 };
    }
  }
}
