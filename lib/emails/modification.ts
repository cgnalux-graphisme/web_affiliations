import { MENTION_COTISATION, MESSAGES_TRANSFERT, recapitulatif as recapDemande, statutTransfert } from "../modification";
import { encadre, gabaritEmail, intertitre, paragraphe, pasVous, recapitulatif, signature, type Bloc, type EmailRendu } from "./gabarit";

/** E-mail « Changement de situation » (route /api/send-modification), PDF joint par la route. */

export function construireHtml(
  prenom: string,
  nom: string,
  blocs: ReturnType<typeof recapDemande>,
  transfert: ReturnType<typeof statutTransfert>
): EmailRendu {
  const details: Bloc[] = blocs.flatMap((b) => [
    intertitre(b.titre),
    recapitulatif(b.lignes),
    ...(b.changement === "regime" ? [paragraphe(MENTION_COTISATION, { petit: true })] : []),
  ]);
  return gabaritEmail({
    etiquette: "Changement de situation",
    titre: "Changement bien reçu",
    apercu: "Le document signé est en pièce jointe. Nos services mettront votre dossier à jour.",
    salutation: `Bonjour ${prenom} ${nom},`,
    blocs: [
      paragraphe(
        "Nous avons bien reçu votre changement de situation. Le document signé est joint à ce message en PDF. Nos services mettront votre dossier à jour dans les meilleurs délais.",
        { gras: ["changement de situation"] }
      ),
      ...details,
      ...(transfert === "non"
        ? []
        : [encadre(transfert === "a_organiser" ? "Nous organisons votre transfert" : "Nous vérifions votre secteur", MESSAGES_TRANSFERT[transfert], "fort")]),
      pasVous(),
      signature(),
    ],
    raison: "Vous recevez ce message parce qu'un changement de situation a été signalé avec votre adresse sur notre site.",
  });
}
