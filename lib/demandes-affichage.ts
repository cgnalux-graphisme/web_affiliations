import { isoToDateFr } from "./dates";
import { dateHeureBruxelles, libelleStatut, type TypeDemande } from "./demandes";

/**
 * Vue détail d'une demande : sections, libellés et mise en forme des valeurs.
 * Fichier sans dépendance serveur (importé par l'écran admin). Aucune donnée ici.
 */

export type Champ = { cle: string; libelle: string; valeur: string; liste?: string[][] };
export type Section = { titre: string; champs: Champ[] };
export type Detail = { sections: Section[]; signature: string | null };

type Plan = { titre: string; cles: [string, string][] }[];

const PLAN_AFFILIATION: Plan = [
  { titre: "Demande", cles: [["created_at", "Reçue le"], ["status", "Statut"]] },
  {
    titre: "Identité",
    cles: [
      ["nom", "Nom"], ["prenom", "Prénom"], ["niss", "NISS"], ["genre", "Genre"],
      ["date_naissance", "Date de naissance"], ["lieu_naissance", "Lieu de naissance"],
      ["nationalite", "Nationalité"], ["etat_civil", "État civil"], ["email", "E-mail"], ["tel", "Téléphone"],
    ],
  },
  {
    titre: "Adresse",
    cles: [["rue", "Rue"], ["numero", "Numéro"], ["boite", "Boîte"], ["code_postal", "Code postal"], ["localite", "Localité"], ["pays", "Pays"]],
  },
  {
    titre: "Situation professionnelle",
    cles: [
      ["situation_pro", "Situation"], ["statut", "Statut professionnel"], ["type_inactif", "Type d'inactivité"],
      ["allocations_chomage", "Allocations de chômage"], ["autre_inactif_precision", "Précision"],
      ["entreprise", "Entreprise"], ["secteur", "Secteur"], ["secteur_autre", "Autre secteur"],
      ["matricule_onss", "Matricule ONSS"], ["date_entree", "Date d'entrée"],
      ["regime_travail", "Régime de travail"], ["regime_travail_detail", "Détail du régime"],
    ],
  },
  {
    titre: "Transfert syndical",
    cles: [
      ["autres_centrale_fgtb", "Déjà affilié à une autre centrale FGTB"], ["centrales_fgtb_choisie", "Centrale FGTB"],
      ["province_centrale_fgtb", "Province de la centrale"], ["affilie_autre_syndicat", "Affilié à un autre syndicat"],
      ["autre_syndicat_choix", "Syndicat"], ["autre_syndicat_autre_detail", "Précision"], ["dossier_juridique", "Dossier juridique en cours"],
    ],
  },
  {
    titre: "Cotisation et paiement",
    cles: [
      ["affiliation_mois", "Mois de début"], ["affiliation_annee", "Année de début"],
      ["cotisation_mensuelle", "Cotisation mensuelle (€)"], ["cotisation_categorie", "Catégorie"],
      ["mode_paiement", "Mode de paiement"], ["iban", "IBAN"], ["bic", "BIC"],
      ["titulaire_du_compte", "Titulaire du compte"], ["titulaire_nom_prenom", "Titulaire (si autre)"],
    ],
  },
  {
    titre: "Mentions acceptées",
    cles: [
      ["mention_assistance", "Assistance juridique"], ["mention_continuite", "Continuité d'affiliation"],
      ["mention_information", "Obligation d'information"], ["mention_accord", "Accord général"], ["mention_rgpd", "RGPD"],
    ],
  },
];

const PLAN_SEPA: Plan = [
  {
    titre: "Demande",
    cles: [
      ["created_at", "Reçue le"], ["type_demande", "Type"], ["date_signature", "Date de signature"],
      ["lieu_signature", "Lieu de signature"], ["ip_address", "Adresse IP"],
    ],
  },
  { titre: "Identité", cles: [["nom", "Nom"], ["prenom", "Prénom"], ["niss", "NISS"], ["email", "E-mail"]] },
  {
    titre: "Adresse",
    cles: [["adresse_rue", "Rue"], ["adresse_numero", "Numéro"], ["code_postal", "Code postal"], ["localite", "Localité"], ["pays", "Pays"]],
  },
  {
    titre: "Compte",
    cles: [
      ["nouveau_iban_be", "Nouvel IBAN (belge)"], ["nouveau_iban_eu", "Nouvel IBAN (étranger)"], ["nouveau_bic", "BIC"],
      ["ancien_iban", "Ancien IBAN"], ["est_titulaire", "Titulaire du compte"], ["nom_titulaire", "Nom du titulaire"],
      ["accord_cloture", "Clôture du compte précédent"], ["categorie_cotisation", "Catégorie de cotisation"],
    ],
  },
];

const PLAN_ONEM: Plan = [
  { titre: "Demande", cles: [["created_at", "Reçue le"]] },
  { titre: "Identité", cles: [["nom", "Nom"], ["prenom", "Prénom"], ["niss", "NISS"], ["email", "E-mail"]] },
];

const VALEURS: Record<string, string> = {
  nouveau_mandat: "Nouveau mandat",
  changement_compte: "Changement de compte",
  avec_cloture: "Oui, avec clôture du compte précédent",
  sans_cloture: "Non, sans clôture",
  non_applicable: "Sans objet",
  domiciliation: "Domiciliation",
  virement: "Virement trimestriel",
  actif: "Actif",
  inactif: "Inactif",
  oui: "Oui",
  non: "Non",
  premiere_fois: "Première fois",
  inchangee: "Inchangée",
  joins: "Jointe",
  deja: "Déjà fournie",
};

/** Libellés des clés du formulaire C1 / C3.2 les plus courantes ; les autres sont déduites du nom. */
const LIBELLES_ONEM: Record<string, string> = {
  niss: "NISS", nom: "Nom", prenom: "Prénom", email: "E-mail", telephone: "Téléphone",
  dateNaissance: "Date de naissance", nationalite: "Nationalité", rue: "Rue", numero: "Numéro", boite: "Boîte",
  codePostal: "Code postal", commune: "Commune", localite: "Localité", pays: "Pays",
  dateSig: "Date de signature", lieuSig: "Lieu de signature", declAffirme: "Déclare sur l'honneur",
  dateDebutChomage: "Début du chômage temporaire", typeDemandeur: "Type de demandeur",
};

function libelleDepuisCle(cle: string): string {
  if (LIBELLES_ONEM[cle]) return LIBELLES_ONEM[cle];
  const mots = cle
    .replace(/_/g, " ")
    .replace(/([a-zà-ÿ0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\bniss\b/g, "NISS")
    .replace(/\biban\b/g, "IBAN")
    .replace(/\bonem\b/g, "ONEM");
  return mots.charAt(0).toUpperCase() + mots.slice(1);
}

function groupeIban(v: string): string {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(v) ? v.replace(/(.{4})/g, "$1 ").trim() : v;
}

/** Valeur lisible : Oui / Non, dates jj/mm/aaaa, IBAN groupés, codes traduits, « — » si vide. */
export function formaterValeur(cle: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "number") return String(v).replace(".", ",");
  if (typeof v !== "string") return JSON.stringify(v);
  if (cle === "created_at") return dateHeureBruxelles(v);
  if (cle === "status") return libelleStatut(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return isoToDateFr(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return dateHeureBruxelles(v);
  if (/iban/i.test(cle)) return groupeIban(v.replace(/\s/g, "").toUpperCase());
  return VALEURS[v] ?? v;
}

function champs(ligne: Record<string, unknown>, cles: [string, string][], vues: Set<string>): Champ[] {
  return cles.map(([cle, libelle]) => {
    vues.add(cle);
    return { cle, libelle, valeur: formaterValeur(cle, ligne[cle]) };
  });
}

/** Tableau (ex. cohabitants du C1) : une ligne par élément, « libellé : valeur » pour chaque propriété. */
function liste(v: unknown[]): string[][] {
  return v.map((el) =>
    el && typeof el === "object"
      ? Object.entries(el as Record<string, unknown>)
          .filter(([, x]) => x !== "" && x !== null && x !== undefined && x !== false)
          .map(([k, x]) => `${libelleDepuisCle(k)} : ${formaterValeur(k, x)}`)
      : [formaterValeur("", el)]
  );
}

const SIGNATURE_IMAGE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;

/** Toutes les informations d'une demande, rangées par section (rien n'est omis, sauf l'identifiant technique). */
export function detailDemande(type: TypeDemande, ligne: Record<string, unknown>): Detail {
  const plan = type === "affiliation" ? PLAN_AFFILIATION : type === "sepa" || type === "changement" ? PLAN_SEPA : PLAN_ONEM;
  const vues = new Set<string>(["id", "signature", "data"]);
  const sections: Section[] = plan.map((s) => ({ titre: s.titre, champs: champs(ligne, s.cles, vues) }));

  let signature = typeof ligne.signature === "string" ? ligne.signature : null;

  // C1 / C3.2 : le formulaire complet est dans `data`.
  const data = ligne.data && typeof ligne.data === "object" ? (ligne.data as Record<string, unknown>) : null;
  if (data) {
    if (typeof data.signature === "string") signature = data.signature;
    const contenu: Champ[] = Object.entries(data)
      .filter(([k]) => k !== "signature")
      .map(([k, v]) =>
        Array.isArray(v)
          ? { cle: k, libelle: libelleDepuisCle(k), valeur: v.length ? `${v.length} élément(s)` : "—", liste: liste(v) }
          : { cle: k, libelle: libelleDepuisCle(k), valeur: formaterValeur(k, v) }
      );
    sections.push({ titre: "Contenu du formulaire", champs: contenu });
  }

  // Colonnes non prévues dans le plan (ajoutées plus tard en base) : affichées aussi.
  const autres = Object.keys(ligne).filter((k) => !vues.has(k));
  if (autres.length) {
    sections.push({ titre: "Autres informations", champs: autres.map((k) => ({ cle: k, libelle: libelleDepuisCle(k), valeur: formaterValeur(k, ligne[k]) })) });
  }

  return { sections, signature: signature && SIGNATURE_IMAGE.test(signature) ? signature : null };
}
