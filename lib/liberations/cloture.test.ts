import { describe, expect, it } from "vitest";
import { manquantsPourCloturer, type EtatCloture } from "./cloture";

const complet: EtatCloture = {
  participants: [{ id: "p1", nom: "Marie Dupont", attestationRecue: true }, { id: "p2", nom: "Jean Martin", attestationRecue: true }],
  dates: [{ id: "d1" }],
  presences: [{ participantId: "p1", dateId: "d1", aVerifier: false }, { participantId: "p2", dateId: "d1", aVerifier: false }],
  trajets: [
    { mode: "voiture", km: 64.8, ticketsVerifies: false, nom: "Marie Dupont" },
    { mode: "covoit_passager", km: 0, ticketsVerifies: false, nom: "Jean Martin" },
  ],
  cgFederale: true,
};

describe("manquantsPourCloturer", () => {
  it("rien ne manque", () => {
    expect(manquantsPourCloturer(complet)).toEqual([]);
  });

  it("liste ce qui manque", () => {
    expect(manquantsPourCloturer({
      ...complet,
      participants: [...complet.participants.map((p, i) => ({ ...p, attestationRecue: i === 0 })), { id: "p3", nom: "Ali Benali", attestationRecue: true }],
      presences: [...complet.presences, { participantId: null, dateId: "d1", aVerifier: true }],
      trajets: [
        { mode: "voiture", km: null, ticketsVerifies: false, nom: "Marie Dupont" },
        { mode: "voiture_train", km: 12, ticketsVerifies: false, nom: "Jean Martin" },
        { mode: "train", km: 0, ticketsVerifies: true, nom: "Hors Liste" },
      ],
    })).toEqual([
      "1 présence à vérifier",
      "aucune signature pour Ali Benali",
      "kilomètres à calculer ou à saisir pour Marie Dupont",
      "tickets de train à vérifier pour Jean Martin",
      "attestation de perte de salaire non reçue pour Jean Martin",
    ]);
  });

  it("n'attend pas d'attestation sans prise en charge par la CG fédérale", () => {
    expect(manquantsPourCloturer({ ...complet, cgFederale: false, participants: complet.participants.map((p) => ({ ...p, attestationRecue: false })) })).toEqual([]);
  });
});
