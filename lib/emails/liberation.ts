import { gabaritEmail, paragraphe, type EmailRendu } from "./gabarit";

/**
 * E-mails des Libérations (lettre à l'employeur, convocation du délégué) dans le gabarit commun.
 * Le texte vient des modèles modifiables (Paramètres › Modèles, lib/liberations/courriers.ts) : il est repris
 * paragraphe par paragraphe, signature comprise (elle fait partie du modèle).
 */
export function emailLiberation(genre: "lettre_employeur" | "convocation", mail: { objet: string; texte: string }): EmailRendu {
  const paragraphes = mail.texte.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const lettre = genre === "lettre_employeur";
  return gabaritEmail({
    etiquette: "Libération syndicale",
    titre: lettre ? "Demande de libération" : "Convocation",
    apercu: (paragraphes[1] ?? paragraphes[0] ?? mail.objet).replace(/\s+/g, " ").slice(0, 140),
    blocs: paragraphes.map((p) => paragraphe(p)),
    raison: lettre
      ? "Vous recevez ce message en tant qu'employeur d'un délégué de la Centrale Générale."
      : "Vous recevez ce message en tant que délégué(e) de la Centrale Générale.",
  });
}
