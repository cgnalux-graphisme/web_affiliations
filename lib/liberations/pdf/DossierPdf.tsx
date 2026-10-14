import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { EnTete, Ligne, Pied, s } from "./commun";

/**
 * Synthèse du dossier de libération (lot 4, PDF complet) : demande, participants, courriers, présences et
 * signatures, frais, paiement, historique, puis les photos (tickets, pièces jointes en image). Les documents eux-mêmes
 * (lettres, convocations, attestations, fiches de paiement) et les PDF joints sont ajoutés après, par le serveur.
 */
export type ImagePdf = { titre: string; data: Buffer; format: "png" | "jpg" };

export type DonneesDossierPdf = {
  titre: string;
  numero: number;
  genereLe: string;
  demande: [string, string][];
  ordreDuJour: string[];
  priseEnCharge: [string, string][];
  participants: { nom: string; entreprise: string; employeur: string }[];
  courriers: { nom: string; lettre: string; convocation: string }[];
  presences: { date: string; lignes: { nom: string; heure: string; note: string; signature: Buffer | null }[]; absents: string[] }[];
  frais: { date: string; nom: string; trajet: string; km: string; montantKm: string; tickets: string }[];
  totaux: { nom: string; km: string; montantKm: string; tickets: string; total: string }[];
  paiement: { nom: string; attestation: string; total: string }[] | null;
  historique: { quand: string; statut: string; auteur: string }[];
  pieces: string[];
  images: ImagePdf[];
};

const d = StyleSheet.create({
  rang: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#7C90A0", paddingVertical: 3 },
  entete: { fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 8.5, textTransform: "uppercase" },
  cellule: { flex: 1, paddingRight: 4 },
  petite: { width: 70, paddingRight: 4 },
  signature: { width: 90, height: 34, objectFit: "contain" },
  sousTitre: { fontWeight: 600, marginTop: 8, marginBottom: 2 },
  imagePage: { width: "100%", maxHeight: 640, objectFit: "contain", marginTop: 8 },
});

function Tableau({ entetes, lignes, largeurs }: { entetes: string[]; lignes: string[][]; largeurs?: (number | null)[] }) {
  const style = (i: number) => (largeurs?.[i] ? { width: largeurs[i]!, paddingRight: 4 } : d.cellule);
  return (
    <View>
      <View style={d.rang} fixed>
        {entetes.map((e, i) => <Text key={i} style={[d.entete, style(i)]}>{e}</Text>)}
      </View>
      {lignes.map((l, j) => (
        <View key={j} style={d.rang} wrap={false}>
          {l.map((x, i) => <Text key={i} style={style(i)}>{x}</Text>)}
        </View>
      ))}
    </View>
  );
}

export default function DossierPdf({ x }: { x: DonneesDossierPdf }) {
  return (
    <Document title={`Dossier de libération n° ${x.numero} — ${x.titre}`} author="Centrale Générale FGTB Namur-Luxembourg" language="fr">
      <Page size="A4" style={s.page}>
        <EnTete titre={`Dossier de libération n° ${x.numero}`} />
        <Text style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{x.titre}</Text>
        <Text style={[s.petit, s.doux]}>Dossier complet généré le {x.genereLe}. Document interne.</Text>

        <Text style={s.section} minPresenceAhead={50}>1. La demande</Text>
        {x.demande.map(([l, v]) => <Ligne key={l} libelle={l} valeur={v} />)}
        {x.ordreDuJour.length > 0 && (
          <View style={s.ligne} wrap={false}>
            <Text style={s.libelle}>Ordre du jour</Text>
            <View style={s.valeur}>{x.ordreDuJour.map((p, i) => <Text key={i}>- {p}</Text>)}</View>
          </View>
        )}

        <Text style={s.section} minPresenceAhead={50}>2. Prise en charge</Text>
        {x.priseEnCharge.map(([l, v]) => <Ligne key={l} libelle={l} valeur={v} />)}

        <Text style={s.section} minPresenceAhead={50}>3. Participants ({x.participants.length})</Text>
        <Tableau entetes={["Participant", "Entreprise", "Employeur (courrier)"]} lignes={x.participants.map((p) => [p.nom, p.entreprise, p.employeur])} />

        <Text style={s.section} minPresenceAhead={50}>4. Courriers</Text>
        <Tableau entetes={["Participant", "Lettre à l'employeur", "Convocation"]} lignes={x.courriers.map((c) => [c.nom, c.lettre, c.convocation])} />

        <Text style={s.section} break={x.participants.length > 8}>5. Présences et signatures</Text>
        {x.presences.map((jour) => (
          <View key={jour.date}>
            <Text style={d.sousTitre} minPresenceAhead={40}>{jour.date}</Text>
            {jour.lignes.length ? jour.lignes.map((l, i) => (
              <View key={i} style={[d.rang, { alignItems: "center" }]} wrap={false}>
                <Text style={d.cellule}>{l.nom}{l.note ? ` (${l.note})` : ""}</Text>
                <Text style={d.petite}>{l.heure}</Text>
                {l.signature ? <Image src={{ data: l.signature, format: "png" }} style={d.signature} /> : <Text style={{ width: 90 }}> </Text>}
              </View>
            )) : <Text style={s.doux}>Aucune signature.</Text>}
            {jour.absents.length > 0 && <Text style={[s.petit, s.doux, { marginTop: 2 }]}>Pas de signature : {jour.absents.join(", ")}.</Text>}
          </View>
        ))}

        <Text style={s.section} minPresenceAhead={50}>6. Frais de déplacement</Text>
        {x.frais.length ? (
          <Tableau entetes={["Date", "Participant", "Trajet", "Km", "Montant km", "Tickets"]} largeurs={[58, null, null, 50, 62, 58]}
            lignes={x.frais.map((f) => [f.date, f.nom, f.trajet, f.km, f.montantKm, f.tickets])} />
        ) : <Text style={s.doux}>Aucun trajet déclaré.</Text>}
        {x.totaux.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <Text style={d.sousTitre} minPresenceAhead={40}>Totaux par participant</Text>
            <Tableau entetes={["Participant", "Km", "Montant km", "Tickets", "Total"]} lignes={x.totaux.map((t) => [t.nom, t.km, t.montantKm, t.tickets, t.total])} />
          </View>
        )}

        {x.paiement && (
          <>
            <Text style={s.section} minPresenceAhead={50}>7. Perte de salaire (CG fédérale)</Text>
            <Tableau entetes={["Participant", "Attestation", "Total de la fiche de paiement"]} lignes={x.paiement.map((p) => [p.nom, p.attestation, p.total])} />
          </>
        )}

        <Text style={s.section} minPresenceAhead={50}>{x.paiement ? "8" : "7"}. Pièces jointes et historique</Text>
        <Ligne libelle="Pièces jointes" valeur={x.pieces.length ? x.pieces.join(", ") : "Aucune"} />
        <View style={{ marginTop: 6 }}>
          <Tableau entetes={["Quand", "Statut", "Par"]} lignes={x.historique.map((h) => [h.quand, h.statut, h.auteur])} />
        </View>
        <Pied />
      </Page>

      {x.images.map((im, i) => (
        <Page key={i} size="A4" style={s.page}>
          <Text style={s.section} minPresenceAhead={50}>{im.titre}</Text>
          <Image src={{ data: im.data, format: im.format }} style={d.imagePage} />
          <Pied />
        </Page>
      ))}
    </Document>
  );
}
