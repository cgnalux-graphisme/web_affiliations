import type { C1Data } from "../app/api/fill-c1/route";
import type { C32Data } from "../app/api/fill-c3-2/route";
import { isoToDateFr } from "./dates";

/** Données communes partagées entre les formulaires du parcours de transfert. */
export interface PersonProfile {
  nom: string;
  prenom: string;
  niss: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  nationalite: string;
  adresse: {
    rue: string;
    numero: string;
    boite: string;
    codePostal: string;
    ville: string;
    pays: string;
  };
  paiement: {
    iban: string;
    bic: string;
    compteAMonNom: boolean;
    nomTitulaire: string;
  };
  situationPro: string;
  statut: string;
  typeInactif: string;
}

export interface AffiliationProfileSource {
  nom: string;
  prenom: string;
  niss: string;
  email: string;
  tel: string;
  dateNaissance: string;
  nationalite: string;
  rue: string;
  numero: string;
  boite: string;
  codePostal: string;
  localite: string;
  pays: string;
  iban: string;
  bic: string;
  titulaireDuCompte: string;
  titulaireNomPrenom: string;
  situationPro: string;
  statut: string;
  typeInactif: string;
}

function formatNissFromDigits(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 6) return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
  if (d.length <= 9) return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}-${d.slice(6, 9)}.${d.slice(9)}`;
}

export function affiliationToProfile(data: AffiliationProfileSource): PersonProfile {
  return {
    nom: data.nom.trim(),
    prenom: data.prenom.trim(),
    niss: data.niss.replace(/\D/g, ""),
    email: data.email.trim().toLowerCase(),
    telephone: data.tel.trim(),
    dateNaissance: data.dateNaissance,
    nationalite: data.nationalite.trim() || "Belge",
    adresse: {
      rue: data.rue.trim(),
      numero: data.numero.trim(),
      boite: data.boite.trim(),
      codePostal: data.codePostal.trim(),
      ville: data.localite.trim(),
      pays: data.pays.trim() || "Belgique",
    },
    paiement: {
      iban: data.iban.replace(/\s/g, ""),
      bic: data.bic.trim(),
      compteAMonNom: data.titulaireDuCompte !== "non",
      nomTitulaire: data.titulaireNomPrenom.trim(),
    },
    situationPro: data.situationPro,
    statut: data.statut,
    typeInactif: data.typeInactif,
  };
}

export function profileToC1(profile: PersonProfile): Partial<C1Data> {
  return {
    nom: profile.nom,
    prenom: profile.prenom,
    niss: profile.niss ? formatNissFromDigits(profile.niss) : "",
    dateNaissance: profile.dateNaissance ? isoToDateFr(profile.dateNaissance) : "",
    nationalite: profile.nationalite,
    rue: profile.adresse.rue,
    numero: profile.adresse.numero,
    boite: profile.adresse.boite,
    codePostal: profile.adresse.codePostal,
    commune: profile.adresse.ville,
    pays: profile.adresse.pays,
    email: profile.email,
    telephone: profile.telephone,
    paiementIban: profile.paiement.iban,
    paiementBic: profile.paiement.bic,
    paiementCompteAMonNom: profile.paiement.compteAMonNom ? "oui" : "non",
    paiementNomTitulaire: profile.paiement.nomTitulaire,
    paiementVirement: true,
    motifDemandeAlloc: true,
    motifChangementOrganisme: true,
    cotisationAction: "autorise",
  };
}

export function profileToC32(profile: PersonProfile): Partial<C32Data> {
  let typeDemandeur: C32Data["typeDemandeur"] = "";
  if (profile.statut === "apprenti") {
    typeDemandeur = "apprenti";
  } else if (profile.situationPro === "actif") {
    typeDemandeur = "travailleur";
  }

  return {
    nom: profile.nom,
    prenom: profile.prenom,
    niss: profile.niss ? formatNissFromDigits(profile.niss) : "",
    email: profile.email,
    typeDemandeur,
  };
}
