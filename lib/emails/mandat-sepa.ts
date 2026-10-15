import { gabaritEmail, paragraphe, pasVous, signature, type EmailRendu } from "./gabarit";

/** E-mail d'un nouveau mandat SEPA ou d'un changement de compte (route /api/send-mandat-sepa), PDF joint par la route. */

export interface Payload {
  email: string;
  nom: string;
  prenom: string;
  pdfBase64: string;
  fileName: string;
  nouveauIban: string;
  typeDemande?: "nouveau_mandat" | "changement_compte";
  /** Id de la ligne web_mandats_sepa (historique des envois). */
  demandeId?: string;
}

export function buildHtml(p: Payload): EmailRendu {
  const nouveau = p.typeDemande === "nouveau_mandat";
  const libelleDemande = nouveau ? "nouveau mandat SEPA" : "changement de numéro de compte / mandat SEPA";
  return gabaritEmail({
    etiquette: nouveau ? "Mandat SEPA" : "Changement de compte",
    titre: nouveau ? "Mandat bien reçu" : "Changement bien reçu",
    apercu: "Votre mandat signé est en pièce jointe. Notre service administratif le traitera dans les meilleurs délais.",
    salutation: `Bonjour ${p.prenom} ${p.nom},`,
    blocs: [
      paragraphe(`Nous avons bien reçu votre demande de ${libelleDemande} auprès de la Centrale Générale FGTB Namur-Luxembourg.`, {
        gras: [libelleDemande],
      }),
      paragraphe(
        `Le mandat signé est joint à ce message en PDF. Notre service administratif le traitera dans les meilleurs délais. Votre nouveau compte (${p.nouveauIban}) sera actif dès le prochain prélèvement suivant l'enregistrement.`,
        { gras: [p.nouveauIban] }
      ),
      paragraphe("Nous restons à votre disposition pour toute question."),
      pasVous(),
      signature(),
    ],
    raison: "Vous recevez ce message parce qu'un mandat SEPA a été signé avec votre adresse sur notre site.",
  });
}
