import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COLONNES_MONTANT, euros, totalGeneral, totalLigne, type Montants } from "../montants";
import { EnTete, Ligne, Pied, s } from "./commun";

/**
 * Fiche de paiement individuelle (perte de salaire prise en charge par la CG fédérale) : les montants encodés
 * par l'admin à partir de l'attestation reçue. Un montant absent reste vide.
 */
export type DonneesFichePaiement = {
  conseil: string | null;
  participant: { nom: string; registreNational: string | null; adresse: string[]; iban: string | null };
  entreprise: { numero: string | null; nom: string; cp: string | null };
  lignes: { date: string; montants: Partial<Montants> }[];
  remarques: string | null;
};

const t = StyleSheet.create({
  table: { marginTop: 4, borderTopWidth: 1, borderTopColor: "#222222" },
  rang: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#7C90A0", paddingVertical: 4 },
  entete: { fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 8.5, textTransform: "uppercase" },
  date: { width: 62 },
  cellule: { flex: 1, textAlign: "right", paddingLeft: 4 },
  total: { flexDirection: "row", paddingVertical: 5, borderTopWidth: 1.5, borderTopColor: "#222222" },
});

export default function FichePaiementPdf({ d }: { d: DonneesFichePaiement }) {
  return (
    <Document title={`Fiche de paiement — ${d.participant.nom}`} author="Centrale Générale FGTB Namur-Luxembourg" language="fr">
      <Page size="A4" style={s.page}>
        <EnTete titre="Fiche de paiement individuelle" />
        <Ligne libelle="Section" valeur="Centrale Générale de Namur-Luxembourg" />
        <Ligne libelle="Conseil" valeur={d.conseil} />

        <Text style={s.section}>Participant</Text>
        <Ligne libelle="Nom" valeur={d.participant.nom} />
        <Ligne libelle="N° de registre national" valeur={d.participant.registreNational} />
        <Ligne libelle="Adresse" valeur={d.participant.adresse.join(", ")} />

        <Text style={s.section}>Entreprise</Text>
        <Ligne libelle="N° d'entreprise" valeur={d.entreprise.numero} />
        <Ligne libelle="Nom" valeur={d.entreprise.nom} />
        <Ligne libelle="Commission paritaire" valeur={d.entreprise.cp} />

        <Text style={s.section}>Montants (total comptable, précomptes inclus)</Text>
        <View style={t.table}>
          <View style={t.rang} fixed>
            <Text style={[t.entete, t.date]}>Date</Text>
            {COLONNES_MONTANT.map((c) => <Text key={c.cle} style={[t.entete, t.cellule]}>{c.libelle}</Text>)}
            <Text style={[t.entete, t.cellule]}>Total</Text>
          </View>
          {d.lignes.map((x) => (
            <View key={x.date} style={t.rang} wrap={false}>
              <Text style={t.date}>{x.date}</Text>
              {COLONNES_MONTANT.map((c) => <Text key={c.cle} style={t.cellule}>{euros(x.montants[c.cle])}</Text>)}
              <Text style={[t.cellule, s.gras]}>{euros(totalLigne(x.montants))}</Text>
            </View>
          ))}
          <View style={t.total} wrap={false}>
            <Text style={[s.gras, { flex: 1 }]}>Total</Text>
            <Text style={[s.gras, { width: 100, textAlign: "right" }]}>{euros(totalGeneral(d.lignes.map((x) => x.montants)))}</Text>
          </View>
        </View>

        <Text style={s.section}>Paiement</Text>
        <Ligne libelle="N° de compte" valeur={d.participant.iban} />
        <Ligne libelle="Remarques" valeur={d.remarques} />
        <Pied />
      </Page>
    </Document>
  );
}
