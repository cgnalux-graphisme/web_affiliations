import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DonneesCourrierPdf } from "../courriers";
import { Pied, logoRouge, s } from "./commun";

/**
 * Courrier des libérations : lettre à l'employeur, convocation, attestation de présence. Mise en page d'une
 * lettre belge : logo et expéditeur à gauche, correspondant à droite, destinataire, « Namur, le … »,
 * « Concerne », texte, signature du permanent. SERVEUR UNIQUEMENT (polices lues sur le disque).
 */
const l = StyleSheet.create({
  tete: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  expediteur: { marginTop: 6 },
  correspondant: { width: 200, borderLeftWidth: 2, borderLeftColor: "#E32119", paddingLeft: 8 },
  destinataire: { marginTop: 30, marginLeft: 290, lineHeight: 1.15 },
  lieuDate: { marginTop: 26, textAlign: "right" },
  concerne: { marginTop: 18, fontWeight: 600 },
  corps: { marginTop: 16 },
  paragraphe: { marginBottom: 10, lineHeight: 1.2 },
  signature: { marginTop: 22, marginLeft: 290 },
});

/** Un ou plusieurs courriers (impression groupée) : une page par courrier, plus si le texte est long. */
export default function CourrierPdf({ ds }: { ds: DonneesCourrierPdf[] }) {
  return (
    <Document title={ds.length === 1 ? `${ds[0].titre} — ${ds[0].destinataire[0] ?? ""}` : ds[0]?.titre ?? "Courriers"}
      author="Centrale Générale FGTB Namur-Luxembourg" language="fr">
      {ds.map((d, i) => <PageCourrier key={i} d={d} />)}
    </Document>
  );
}

function PageCourrier({ d }: { d: DonneesCourrierPdf }) {
  const paragraphes = d.corps.split(/\n\s*\n/).filter((p) => p.trim());
  return (
      <Page size="A4" style={s.page}>
        <View style={l.tete}>
          <View>
            <Image src={{ data: logoRouge(), format: "png" }} style={s.logo} />
            <View style={[s.petit, l.expediteur]}>
              {d.expediteur.map((x, i) => <Text key={i} style={i === 0 ? s.gras : undefined}>{x}</Text>)}
            </View>
          </View>
          {d.correspondant && (
            <View style={[s.petit, l.correspondant]}>
              <Text style={[s.gras, { textTransform: "uppercase", fontSize: 7.5 }]}>Votre correspondant à {d.correspondant.ville}</Text>
              {d.correspondant.lignes.map((x, i) => <Text key={i}>{x}</Text>)}
            </View>
          )}
        </View>

        {d.destinataire.length > 0 && (
          <View style={l.destinataire}>
            {d.destinataire.map((x, i) => <Text key={i}>{x}</Text>)}
          </View>
        )}

        <Text style={l.lieuDate}>{d.lieuDate}</Text>
        {d.concerne && <Text style={l.concerne}>Concerne : {d.concerne}</Text>}

        <View style={l.corps}>
          {paragraphes.map((p, i) => <Text key={i} style={l.paragraphe}>{p}</Text>)}
        </View>

        <View style={l.signature} wrap={false}>
          <Text style={s.gras}>{d.signature.nom}</Text>
          {d.signature.fonction && <Text>{d.signature.fonction}</Text>}
        </View>

        <Pied />
      </Page>
  );
}
