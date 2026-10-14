import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { Case, EnTete, Ligne, Pied, s } from "./commun";

/**
 * Attestation de perte de salaire : formulaire envoyé à l'employeur avec la lettre quand la CG fédérale prend
 * en charge la perte de salaire. Ce qui est connu est pré-rempli ; le reste est laissé à remplir par
 * l'employeur (jamais de valeur inventée). Retour au siège social de Libramont, même pour Namur.
 */
export type DonneesAttestationPerte = {
  reunion: string;
  codePaiement: string | null;
  employeur: { nom: string; adresse: string[]; numero: string | null };
  travailleur: { nom: string; domicile: string[] };
  dates: string[];
};

export const ADRESSE_RETOUR = "Centrale Générale FGTB, Rue Fonteny Maroy 13, 6800 Libramont-Chevigny";

const a = StyleSheet.create({
  date: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#7C90A0" },
  rang: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  signatures: { flexDirection: "row", marginTop: 14, gap: 12 },
  cadre: { flex: 1, height: 70, borderWidth: 1, borderColor: "#7C90A0", padding: 4, fontSize: 8.5, color: "#56646F" },
});

const BLANC = "............................";

/** Une ou plusieurs attestations (impression groupée) : une page chacune. */
export default function AttestationPertePdf({ ds }: { ds: DonneesAttestationPerte[] }) {
  return (
    <Document title={ds.length === 1 ? `Attestation de perte de salaire — ${ds[0].travailleur.nom}` : "Attestations de perte de salaire"}
      author="Centrale Générale FGTB Namur-Luxembourg" language="fr">
      {ds.map((d, i) => <PageAttestation key={i} d={d} />)}
    </Document>
  );
}

function PageAttestation({ d }: { d: DonneesAttestationPerte }) {
  return (
      <Page size="A4" style={s.page}>
        <EnTete titre="Attestation de perte de salaire" />
        <View style={s.encadre}>
          <Text style={s.gras}>À compléter par l&apos;employeur et à renvoyer à :</Text>
          <Text>{ADRESSE_RETOUR}</Text>
        </View>

        <Text style={s.section}>1. Réunion</Text>
        <Ligne libelle="Réunion" valeur={d.reunion} />
        <Ligne libelle="Code paiement" valeur={d.codePaiement ?? BLANC} />

        <Text style={s.section}>2. Employeur</Text>
        <Ligne libelle="Nom" valeur={d.employeur.nom} />
        <Ligne libelle="Adresse" valeur={d.employeur.adresse.join(", ") || BLANC} />
        <Ligne libelle="N° d'entreprise" valeur={d.employeur.numero ?? BLANC} />
        <View style={s.ligne}>
          <Text style={s.libelle}>Ouvrier frontalier</Text>
          <Case libelle="Oui" />
          <Case libelle="Non" />
        </View>

        <Text style={s.section}>3. Travailleur</Text>
        <Ligne libelle="Nom" valeur={d.travailleur.nom} />
        <Ligne libelle="Domicile" valeur={d.travailleur.domicile.join(", ") || BLANC} />

        <Text style={s.section}>4. Salaire perdu</Text>
        {d.dates.map((x) => (
          <View key={x} style={a.date} wrap={false}>
            <Text style={[s.libelle, { width: 110 }]}>{x}</Text>
            <Text>{BLANC} € x ............ h = {BLANC} €</Text>
          </View>
        ))}
        <Ligne libelle="Tickets-repas : valeur" valeur={`${BLANC} €`} largeur={170} />
        <Ligne libelle="Quote-part patronale" valeur={`${BLANC} €`} largeur={170} />
        <Ligne libelle="Régime de travail" valeur={`${BLANC} heures / semaine`} largeur={170} />

        <Text style={s.section}>5. Pas de droit au salaire ce jour-là ? Motif</Text>
        <View style={a.rang}>
          <Case libelle="Crédit-temps" />
          <Case libelle="Maladie" />
          <Case libelle="Accident" />
          <Case libelle={`Autre : ${BLANC}`} />
        </View>

        <View style={a.signatures} wrap={false}>
          <Text style={a.cadre}>Date</Text>
          <Text style={a.cadre}>Cachet de l&apos;entreprise</Text>
          <Text style={a.cadre}>Signature</Text>
        </View>
        <Pied />
      </Page>
  );
}
