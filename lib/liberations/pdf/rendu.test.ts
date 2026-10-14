import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { donneesCourrier, textesModeles, type ContexteCourrier } from "../courriers";
import { assemblerPdf, pdfAttestationPerte, pdfCourrier, pdfDossier, pdfFichePaiement } from "./rendu";

/** Rendu réel des PDF côté serveur. PDF_SORTIE=<dossier> enregistre les fichiers pour les regarder. */

const ctx: ContexteCourrier = {
  dossier: {
    objet: "Commission Professionnelle Construction", lieu_nom: "CEPAG", lieu_complement: "Espace Solidarité", lieu_rue: "Rue de Namur",
    lieu_numero: "47", lieu_boite: null, lieu_code_postal: "5000", lieu_localite: "Beez", salle: "grande salle, 4e étage",
    ordre_du_jour: "Accueil\nAccord sectoriel 2027-2028\nDivers", perte_salaire: true, perte_salaire_charge: "cg_federale",
  },
  dates: [{ jour: "2026-10-12", duree: "journee", heure_debut: "08:00:00" }, { jour: "2026-10-13", duree: "matin", heure_debut: "08:30:00" }],
  participant: { prenom: "Marie", nom: "Dupont", genre: "F" },
  employeur: "CARMEUSE",
  signataire: { nom: "Magali Houba", fonction: "Secrétaire permanente" },
  correspondant: { nom: "David Binamé", telephone: "081/649964", email: "david.biname@accg.be" },
  textes: textesModeles([]),
};
const DESTINATAIRE = ["À l'attention de Service Ressources Humaines", "CARMEUSE SA", "Rue du Château 13", "5300 Seilles"];

const sortie = process.env.PDF_SORTIE;
function garder(nom: string, b: Buffer) {
  if (sortie) fs.writeFileSync(path.join(sortie, nom), b);
}
const estPdf = (b: Buffer) => b.subarray(0, 5).toString() === "%PDF-";

describe("PDF des libérations (serveur)", () => {
  it("fabrique la lettre, la convocation et l'attestation de présence", async () => {
    for (const genre of ["lettre_employeur", "convocation", "attestation_presence"] as const) {
      const b = await pdfCourrier(donneesCourrier(genre, "mission_syndicale", ctx, genre === "lettre_employeur" ? DESTINATAIRE : ["Marie Dupont"], "2026-10-14"));
      expect(estPdf(b)).toBe(true);
      garder(`${genre}.pdf`, b);
    }
  }, 30000);

  it("fabrique l'attestation de perte de salaire", async () => {
    const b = await pdfAttestationPerte({
      reunion: "Commission Professionnelle Construction", codePaiement: null,
      employeur: { nom: "CARMEUSE SA", adresse: ["Rue du Château 13", "5300 Seilles"], numero: "0412.345.678" },
      travailleur: { nom: "Marie Dupont", domicile: ["Rue Haute 5", "5000 Namur"] },
      dates: ["12/10/2026 (journée)", "13/10/2026 (matin)"],
    });
    expect(estPdf(b)).toBe(true);
    garder("attestation_perte.pdf", b);
  }, 30000);

  it("fabrique la synthèse du dossier et l'assemble avec d'autres PDF", async () => {
    const image = fs.readFileSync(path.join(process.cwd(), "public", "logo-cg-rouge.png"));
    const synthese = await pdfDossier({
      titre: "Commission Professionnelle Construction", numero: 12, genereLe: "14/10/2026 16h05",
      demande: [["Type de libération", "Mission syndicale extérieure"], ["Dates", "12/10/2026 (journée, 08h00) ; 13/10/2026 (matin)"], ["Lieu", "CEPAG, Espace Solidarité, Rue de Namur 47, 5000 Beez"]],
      ordreDuJour: ["Accueil", "Accord sectoriel"],
      priseEnCharge: [["Perte de salaire", "Oui, à charge de la cg fédérale"], ["Lunch prévu", "Oui"]],
      participants: [{ nom: "Marie Dupont", entreprise: "CARMEUSE", employeur: "CARMEUSE SA · rh@carmeuse.be" }],
      courriers: [{ nom: "Marie Dupont", lettre: "Envoyé le 10/10/2026 à rh@carmeuse.be", convocation: "Imprimé le 10/10/2026" }],
      presences: [{ date: "12/10/2026 (journée)", lignes: [{ nom: "Marie Dupont", heure: "08h12", note: "", signature: image }], absents: ["Jean Martin"] }],
      frais: [{ date: "12/10/2026", nom: "Marie Dupont", trajet: "En voiture, seul(e)", km: "64,8", montantKm: "27,73 €", tickets: "" }],
      totaux: [{ nom: "Marie Dupont", km: "64,8", montantKm: "27,73 €", tickets: "0,00 €", total: "27,73 €" }],
      paiement: [{ nom: "Marie Dupont", attestation: "Reçue le 20/10/2026", total: "159,31 €" }],
      historique: [{ quand: "08/10/2026 10h00", statut: "Brouillon", auteur: "Magali Houba" }, { quand: "12/10/2026 08h12", statut: "Jour J", auteur: "Première signature" }],
      pieces: ["invitation.pdf"],
      images: [{ titre: "Ticket de train 1 : Marie Dupont, 12/10/2026 (journée)", data: image, format: "png" }],
    });
    expect(estPdf(synthese)).toBe(true);
    const lettre = await pdfCourrier(donneesCourrier("lettre_employeur", "mission_syndicale", ctx, DESTINATAIRE, "2026-10-14"));
    const { pdf, ignores } = await assemblerPdf([{ nom: "synthèse", pdf: synthese }, { nom: "lettre", pdf: lettre }, { nom: "abîmé", pdf: Buffer.from("pas un pdf") }]);
    expect(estPdf(pdf)).toBe(true);
    expect(ignores).toEqual(["abîmé"]);
    garder("dossier_complet.pdf", pdf);
  }, 30000);

  it("fabrique la fiche de paiement", async () => {
    const b = await pdfFichePaiement({
      conseil: "Conseil régional",
      participant: { nom: "Marie Dupont", registreNational: "85.07.30-033.28", adresse: ["Rue Haute 5", "5000 Namur"], iban: "BE68 5390 0754 7034" },
      entreprise: { numero: "0412.345.678", nom: "CARMEUSE SA", cp: "102 - Carrières" },
      lignes: [
        { date: "12/10/2026", montants: { salaire_brut: 152.4, cheques_repas: 6.91 } },
        { date: "13/10/2026", montants: { salaire_brut: 76.2 } },
      ],
      remarques: null,
    });
    expect(estPdf(b)).toBe(true);
    garder("fiche_paiement.pdf", b);
  }, 30000);
});
