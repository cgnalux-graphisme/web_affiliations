import { encadre, gabaritEmail, intertitre, paragraphe, pasVous, recapitulatif, signature, type EmailRendu } from "./gabarit";

/**
 * E-mail de confirmation d'une demande d'affiliation (route /api/send-confirmation), PDF joint par la route.
 * Les modalités de paiement (domiciliation ou virement) sont dans le PDF joint, pas dans le corps du message.
 */

export interface EmailPayload {
  email: string;
  nom: string;
  prenom: string;
  pdfBase64: string;
  fileName: string;
  affiliationDebut: string; // ex. « 11/2026 »
  cotisationMensuelle: string | null;
  modePaiement: string; // "domiciliation" | "virement"
  niss: string | null;
  premiereEcheanceMontant: string | null;
  demandeId?: string; // id de la ligne web_affiliations (historique des envois)
}

export function buildEmailHtml(p: EmailPayload): EmailRendu {
  return gabaritEmail({
    etiquette: "Affiliation",
    titre: "Demande bien reçue",
    apercu: `Votre récapitulatif est en pièce jointe. Votre affiliation prend cours en ${p.affiliationDebut}.`,
    salutation: `Bonjour ${p.prenom} ${p.nom},`,
    blocs: [
      paragraphe(
        "Nous avons bien reçu votre demande d'affiliation à la Centrale Générale FGTB Namur-Luxembourg et nous vous remercions de votre confiance.",
        { gras: ["Centrale Générale FGTB Namur-Luxembourg"] }
      ),
      paragraphe(
        "Vous trouverez en pièce jointe de cet e-mail le récapitulatif de votre demande au format PDF, comprenant les informations transmises ainsi que votre mandat de paiement.",
        { gras: ["récapitulatif de votre demande au format PDF"] }
      ),
      intertitre("Prochaines étapes de votre affiliation"),
      recapitulatif([
        ["Traitement de votre dossier", "Notre équipe administrative vérifie actuellement vos données."],
        ["Activation", `Votre affiliation prendra cours à partir du mois de ${p.affiliationDebut} comme demandé.`],
      ]),
      encadre(
        "Vos avantages en tant que membre",
        "En tant que membre, après votre stage de 3 mois, vous bénéficierez de notre assistance juridique gratuite pour tout dossier lié au droit du travail belge, ainsi que de l'accès à nos différents services."
      ),
      paragraphe("Nous restons à votre entière disposition pour toute question complémentaire."),
      pasVous(),
      signature(),
    ],
    raison: "Vous recevez ce message parce qu'une demande d'affiliation a été envoyée avec votre adresse sur notre site.",
  });
}
