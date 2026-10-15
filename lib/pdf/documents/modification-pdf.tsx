import React from "react";
import { Document, Image as PDFImage, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { MENTION_COTISATION, MESSAGES_TRANSFERT, formaterNiss, recapitulatif, statutTransfert, type FormModification } from "../../modification";
import { BureauxPdf } from "../BureauxPdf";
import { PDF_COULEURS, enregistrerPolicesPdf } from "../charte";

/**
 * PDF du formulaire « Signaler un changement » (FormulaireModification.tsx).
 * Module séparé, chargé seulement au moment de produire le PDF : la bibliothèque PDF
 * (plus d'un mégaoctet) ne ralentit plus l'ouverture du formulaire.
 */

async function fetchLogoBase64(): Promise<string> {
  const res = await fetch("/logo-cg-rouge.png");
  if (!res.ok) return "";
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// ── PDF (charte « Registre », une seule page) ────────────────────────────────

const C = PDF_COULEURS;
const ps = StyleSheet.create({
  page: { fontFamily: "Barlow", fontSize: 9, paddingTop: 28, paddingBottom: 52, paddingLeft: 40, paddingRight: 40, backgroundColor: C.blanc, color: C.charbon },
  entete: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", borderBottomWidth: 4, borderBottomColor: C.charbon, borderBottomStyle: "solid", paddingBottom: 6 },
  logo: { width: 150 },
  enteteDroite: { alignItems: "flex-end" },
  titre: { fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 19, lineHeight: 1, textTransform: "uppercase", textAlign: "right" },
  enteteLigne: { fontSize: 8, marginTop: 3, textAlign: "right" },
  gras: { fontWeight: 600 },
  section: { marginTop: 4 },
  sectionTitre: { fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", borderBottomWidth: 1.5, borderBottomColor: C.charbon, borderBottomStyle: "solid", paddingBottom: 2, marginBottom: 4, marginTop: 4 },
  numero: { color: C.rouge },
  deuxCol: { flexDirection: "row" },
  colG: { flex: 1, marginRight: 12 },
  colD: { flex: 1 },
  ligne: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.ardoise, borderBottomStyle: "solid", paddingBottom: 2, marginBottom: 1.5 },
  libelle: { width: "42%", fontWeight: 600, fontSize: 7.5 },
  valeur: { width: "58%", fontSize: 7.5 },
  encadre: { borderTopWidth: 1, borderTopColor: C.ardoise, borderTopStyle: "solid", borderRightWidth: 1, borderRightColor: C.ardoise, borderRightStyle: "solid", borderBottomWidth: 1, borderBottomColor: C.ardoise, borderBottomStyle: "solid", borderLeftWidth: 3, borderLeftColor: C.bordeaux, borderLeftStyle: "solid", borderRadius: 3, paddingTop: 4, paddingBottom: 4, paddingLeft: 10, paddingRight: 8, marginTop: 6 },
  encadreTitre: { fontSize: 7.5, fontWeight: 600, color: C.bordeaux, marginBottom: 2 },
  encadreTexte: { fontSize: 7, lineHeight: 1.5 },
  signatureBloc: { borderWidth: 1, borderColor: C.ardoise, borderStyle: "solid", borderRadius: 3, paddingTop: 5, paddingBottom: 5, paddingLeft: 8, paddingRight: 8, marginTop: 4, alignItems: "center" },
  // Le cadre de signature fait 480 × 100 px : hauteur bornée pour ne jamais pousser « Nos bureaux ».
  signature: { width: 150, height: 32, objectFit: "contain", alignSelf: "center" },
  signatureNote: { fontSize: 7, marginTop: 4, lineHeight: 1.5, borderTopWidth: 1, borderTopColor: C.ardoise, borderTopStyle: "solid", paddingTop: 5, textAlign: "center" },
  pied: { position: "absolute", top: 808, left: 40, right: 40, textAlign: "center", fontSize: 7, borderTopWidth: 1.5, borderTopColor: C.rouge, borderTopStyle: "solid", paddingTop: 4 },
});

function LignePdf({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <View style={ps.ligne}>
      <Text style={ps.libelle}>{libelle}</Text>
      <Text style={ps.valeur}>{valeur || "—"}</Text>
    </View>
  );
}

function TitrePdf({ n, children }: { n: number; children: string }) {
  return (
    <Text style={ps.sectionTitre}>
      <Text style={ps.numero}>{n}</Text>  {children}
    </Text>
  );
}

/** Exporté pour la vérification de mise en page (une seule page, cas le plus long). */
export function ModificationPDF({ data, logoBase64, dateDocument }: { data: FormModification; logoBase64: string; dateDocument: Date }) {
  const dateDoc = dateDocument.toLocaleDateString("fr-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit", year: "numeric" });
  const dateHeure = dateDocument.toLocaleString("fr-BE", { timeZone: "Europe/Brussels" });
  const blocs = recapitulatif(data);
  const transfert = statutTransfert(data);
  const coupe = (l: [string, string][]) => [l.slice(0, Math.ceil(l.length / 2)), l.slice(Math.ceil(l.length / 2))];

  return (
    <Document title="Changement de situation" author="Centrale Générale FGTB Namur-Luxembourg" subject="Changement de situation">
      <Page size="A4" style={ps.page}>
        <View style={ps.entete}>
          <PDFImage
            src={logoBase64 || `${typeof window !== "undefined" ? window.location.origin : ""}/logo-cg-rouge.png`}
            style={ps.logo}
          />
          <View style={ps.enteteDroite}>
            <Text style={ps.titre}>Changement de situation</Text>
            <Text style={ps.enteteLigne}>
              Document du <Text style={ps.gras}>{dateDoc}</Text>
            </Text>
            <Text style={ps.enteteLigne}>
              {data.prenom} {data.nom}
            </Text>
          </View>
        </View>

        <View style={ps.section}>
          <TitrePdf n={1}>Identité</TitrePdf>
          <View style={ps.deuxCol}>
            <View style={ps.colG}>
              <LignePdf libelle="Nom :" valeur={data.nom} />
              <LignePdf libelle="Prénom :" valeur={data.prenom} />
            </View>
            <View style={ps.colD}>
              <LignePdf libelle="NISS :" valeur={formaterNiss(data.niss)} />
              <LignePdf libelle="E-mail :" valeur={data.email} />
            </View>
          </View>
        </View>

        {blocs.map((b, i) => {
          const [gauche, droite] = coupe(b.lignes);
          return (
            <View key={b.changement} style={ps.section} wrap={false}>
              <TitrePdf n={i + 2}>{b.titre}</TitrePdf>
              <View style={ps.deuxCol}>
                <View style={ps.colG}>
                  {gauche.map(([l, v]) => (
                    <LignePdf key={l} libelle={`${l} :`} valeur={v} />
                  ))}
                </View>
                <View style={ps.colD}>
                  {droite.map(([l, v]) => (
                    <LignePdf key={l} libelle={`${l} :`} valeur={v} />
                  ))}
                </View>
              </View>
              {b.changement === "regime" && <Text style={[ps.encadreTexte, { marginTop: 2 }]}>{MENTION_COTISATION}</Text>}
            </View>
          );
        })}

        {transfert !== "non" && (
          <View style={ps.encadre} wrap={false}>
            <Text style={ps.encadreTitre}>
              {transfert === "a_organiser" ? "Transfert vers une autre centrale de la FGTB" : "Secteur à vérifier"}
            </Text>
            <Text style={ps.encadreTexte}>{MESSAGES_TRANSFERT[transfert]}</Text>
          </View>
        )}

        <View style={ps.section} wrap={false}>
          <TitrePdf n={blocs.length + 2}>Signature du membre</TitrePdf>
          <View style={ps.deuxCol}>
            <View style={ps.colG}>
              <LignePdf libelle="Date :" valeur={data.dateSig} />
            </View>
            <View style={ps.colD}>
              <LignePdf libelle="Lieu :" valeur={data.lieu} />
            </View>
          </View>
          <View style={ps.signatureBloc}>
            {data.signature ? <PDFImage src={data.signature} style={ps.signature} /> : <Text>(aucune signature fournie)</Text>}
            <Text style={ps.signatureNote}>
              Je certifie l&apos;exactitude des informations ci-dessus. Document complété en ligne le {dateHeure} via accg-nalux.be.
              {"\n"}Certifié conforme par signature électronique.
              {"\n"}Vos données personnelles sont traitées conformément au RGPD. Politique de confidentialité :
              https://www.accg.be/fr/protection-de-la-vie-privee — privacy@accg.be
            </Text>
          </View>
        </View>

        <BureauxPdf page={1} haut={738} />

        <Text style={ps.pied} fixed>
          Centrale Générale FGTB Namur-Luxembourg · admin.nalux@accg.be · Données traitées conformément au RGPD
        </Text>
      </Page>
    </Document>
  );
}

export async function produirePdfModification(data: FormModification, dateDocument: Date): Promise<Blob> {
  enregistrerPolicesPdf(window.location.origin);
  const logoBase64 = await fetchLogoBase64().catch(() => "");
  return pdf(<ModificationPDF data={data} logoBase64={logoBase64} dateDocument={dateDocument} />).toBlob();
}

