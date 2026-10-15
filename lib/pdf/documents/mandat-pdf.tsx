import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet, Image as PDFImage } from "@react-pdf/renderer";
import type { FormData as DonneesMandat } from "../../../FormulaireChangementCompte";
import { BureauxPdf } from "../BureauxPdf";
import { enregistrerPolicesPdf } from "../charte";

/**
 * PDF du mandat SEPA / changement de compte (FormulaireChangementCompte.tsx).
 * Module séparé, chargé seulement au moment de produire le PDF : la bibliothèque PDF
 * (plus d'un mégaoctet) ne ralentit plus l'ouverture du formulaire.
 */

function formatIBAN(value: string): string {
  return value.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

// ── Logo (chargé une fois) ───────────────────────────────────────────────────
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

// ── PDF (look aligné sur le formulaire d'affiliation) ────────────────────────
const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: "Barlow",
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 52,
    paddingLeft: 40,
    paddingRight: 40,
    backgroundColor: "#FFFFFF",
    color: "#222222",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 4,
    borderBottomColor: "#222222",
    borderBottomStyle: "solid",
    paddingBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoImage: {
    width: 150,
  },
  headerTitle: {
    fontFamily: "Barlow Condensed",
    fontWeight: 800,
    fontSize: 19,
    lineHeight: 1,
    textTransform: "uppercase",
    color: "#222222",
    textAlign: "right",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerDateLabel: {
    fontSize: 8,
    color: "#222222",
    marginTop: 4,
    textAlign: "right",
  },
  headerDateValue: {
    fontWeight: 600,
  },
  headerMember: {
    fontSize: 8,
    color: "#222222",
    marginTop: 1,
    textAlign: "right",
  },
  body: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 6,
  },
  sectionTitle: {
    fontFamily: "Barlow Condensed",
    fontWeight: 800,
    fontSize: 11.5,
    textTransform: "uppercase",
    color: "#222222",
    borderBottomWidth: 1.5,
    borderBottomColor: "#222222",
    borderBottomStyle: "solid",
    paddingBottom: 2,
    marginBottom: 4,
    marginTop: 4,
  },
  section: { marginBottom: 2 },
  twoCol: { flexDirection: "row" },
  colLeft: { flex: 1, marginRight: 12 },
  colRight: { flex: 1 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#7C90A0",
    borderBottomStyle: "solid",
    paddingBottom: 2,
    marginBottom: 1.5,
  },
  label: {
    width: "42%",
    fontFamily: "Barlow", fontWeight: 600,
    fontSize: 7.5,
    color: "#222222",
  },
  value: {
    width: "58%",
    fontSize: 7.5,
    color: "#222222",
  },
  adminBox: {
    borderWidth: 1,
    borderColor: "#7C90A0",
    borderStyle: "dashed",
    borderRadius: 3,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  adminFieldWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  adminFieldLabel: {
    fontSize: 7.5,
    fontFamily: "Barlow", fontWeight: 600,
    color: "#222222",
    marginRight: 6,
    width: "52%",
  },
  adminFieldLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#7C90A0",
    borderBottomStyle: "solid",
    height: 12,
  },
  sepaBox: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#7C90A0",
    borderTopStyle: "solid",
    borderRightWidth: 1,
    borderRightColor: "#7C90A0",
    borderRightStyle: "solid",
    borderBottomWidth: 1,
    borderBottomColor: "#7C90A0",
    borderBottomStyle: "solid",
    borderLeftWidth: 3,
    borderLeftColor: "#931510",
    borderLeftStyle: "solid",
    borderRadius: 3,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 8,
    marginTop: 4,
  },
  infoBoxTitle: {
    fontSize: 7,
    fontFamily: "Barlow", fontWeight: 600,
    color: "#222222",
    marginBottom: 3,
  },
  signatureBox: {
    borderWidth: 1,
    borderColor: "#7C90A0",
    borderStyle: "solid",
    borderRadius: 3,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
    marginTop: 3,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  signatureImage: {
    width: 150,
    alignSelf: "center",
  },
  signatureDate: {
    fontSize: 6.5,
    color: "#222222",
    marginTop: 3,
    fontFamily: "Barlow", fontStyle: "italic",
  },
  luApprouve: {
    fontSize: 7,
    color: "#222222",
    marginTop: 4,
    lineHeight: 1.5,
    borderTopWidth: 1,
    borderTopColor: "#7C90A0",
    borderTopStyle: "solid",
    paddingTop: 5,
    textAlign: "center",
  },
  footer: {
    // Positionné depuis le haut : avec react-pdf, "bottom" peut sortir de la page (A4 = 842 pt).
    position: "absolute",
    top: 808,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 7,
    color: "#222222",
    borderTopWidth: 1.5,
    borderTopColor: "#E32119",
    borderTopStyle: "solid",
    paddingTop: 4,
  },
});

const v = (val?: string) => val?.trim() || "—";

function PdfRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={pdfStyles.row}>
      <Text style={pdfStyles.label}>{label}</Text>
      <Text style={pdfStyles.value}>{value}</Text>
    </View>
  );
}

function MandatPDF({ data, logoBase64, ipAddress, dateHeure, dateDocument }: {
  data: DonneesMandat;
  logoBase64: string;
  ipAddress: string;
  dateHeure: string;
  /** Date de la demande (back-office) ; par défaut, maintenant. */
  dateDocument?: Date;
}) {
  const now = dateDocument ?? new Date();
  const dateDoc = now.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const titreDemande =
    data.typeDemande === "nouveau_mandat"
      ? "Nouveau mandat SEPA"
      : data.typeDemande === "changement_compte"
        ? "Changement de numéro de compte"
        : "Mandat SEPA";
  const typeDemandeLabel =
    data.typeDemande === "nouveau_mandat" ? "Nouveau mandat"
    : data.typeDemande === "changement_compte" ? "Changement de compte"
    : "—";
  const ibanAffiche = data.nouveauIban ? formatIBAN(data.nouveauIban) : "—";
  const titulaireLabel = data.estTitulaire ? "Oui" : "Non";
  const accordLabel =
    data.accordCloture === "avec_cloture" ? "Oui, avec clôture du compte précédent"
    : data.accordCloture === "sans_cloture" ? "Oui, sans clôture du compte précédent"
    : "—";

  return (
    <Document
      title={`${titreDemande} - Mandat SEPA`}
      author="Centrale Générale FGTB Namur-Luxembourg"
      subject="Mandat SEPA"
    >
      <Page size="A4" style={pdfStyles.page}>

        <View style={pdfStyles.header}>
          {logoBase64 ? (
            <PDFImage src={logoBase64} style={pdfStyles.logoImage} />
          ) : (
            // Logo pas encore préchargé : react-pdf le télécharge lui-même depuis le site (jamais de nom en texte).
            <PDFImage src={`${typeof window !== "undefined" ? window.location.origin : ""}/logo-cg-rouge.png`} style={pdfStyles.logoImage} />
          )}
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.headerTitle}>{titreDemande}</Text>
            <Text style={pdfStyles.headerDateLabel}>
              Document du <Text style={pdfStyles.headerDateValue}>{dateDoc}</Text>
            </Text>
            <Text style={pdfStyles.headerMember}>{data.prenom} {data.nom}</Text>
          </View>
        </View>

        <View style={pdfStyles.body}>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}><Text style={{ color: "#E32119" }}>0</Text>  Réservé à l&apos;administration</Text>
            <View style={pdfStyles.adminBox}>
              <View style={pdfStyles.adminFieldWrap}>
                <Text style={pdfStyles.adminFieldLabel}>N° de mandat :</Text>
                <View style={pdfStyles.adminFieldLine} />
              </View>
              <View style={[pdfStyles.adminFieldWrap, { marginRight: 0 }]}>
                <Text style={pdfStyles.adminFieldLabel}>Date d&apos;encodage :</Text>
                <View style={pdfStyles.adminFieldLine} />
              </View>
            </View>
            <View style={pdfStyles.adminBox}>
              <View style={[pdfStyles.adminFieldWrap, { marginRight: 0 }]}>
                <Text style={pdfStyles.adminFieldLabel}>Catégorie cotisation :</Text>
                <View style={pdfStyles.adminFieldLine} />
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}><Text style={{ color: "#E32119" }}>1</Text>  Identité</Text>
            <View style={pdfStyles.twoCol}>
              <View style={pdfStyles.colLeft}>
                <PdfRow label="Nom :" value={v(data.nom)} />
                <PdfRow label="Prénom :" value={v(data.prenom)} />
                <PdfRow label="NISS :" value={v(data.niss)} />
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="Email :" value={v(data.email)} />
                <PdfRow label="Type de demande :" value={typeDemandeLabel} />
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}><Text style={{ color: "#E32119" }}>2</Text>  Adresse</Text>
            <View style={pdfStyles.twoCol}>
              <View style={pdfStyles.colLeft}>
                <PdfRow label="Rue :" value={v(data.adresseRue)} />
                <PdfRow label="Code postal :" value={v(data.codePostal)} />
                <PdfRow label="Pays :" value={v(data.pays)} />
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="N° :" value={v(data.adresseNumero)} />
                <PdfRow label="Localité :" value={v(data.localite)} />
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}><Text style={{ color: "#E32119" }}>3</Text>  Créancier SEPA</Text>
            <View style={pdfStyles.sepaBox}>
              <Text style={[pdfStyles.infoBoxTitle, { color: "#931510", fontSize: 7.5 }]}>
                Informations créancier SEPA
              </Text>
              <View style={pdfStyles.twoCol}>
                <View style={pdfStyles.colLeft}>
                  <PdfRow label="Créancier :" value="Centrale Générale FGTB Namur-Luxembourg" />
                  <PdfRow label="Adresse :" value="Rue Fonteny Maroy, 13" />
                  <PdfRow label="Localité :" value="6800 Libramont-Chevigny" />
                </View>
                <View style={pdfStyles.colRight}>
                  <PdfRow label="Identifiant (ICS) :" value="BE00000647821" />
                  <PdfRow label="Type d'encaissement :" value="Récurrent" />
                  <PdfRow label="Périodicité :" value="Mensuel" />
                </View>
              </View>
              <PdfRow label="Description :" value="Convention pour la perception syndicale" />
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}><Text style={{ color: "#E32119" }}>4</Text>  Coordonnées bancaires</Text>
            <View style={pdfStyles.twoCol}>
              <View style={pdfStyles.colLeft}>
                <View style={pdfStyles.row}>
                  <Text style={pdfStyles.label}>Nouvel IBAN :</Text>
                  <Text style={[pdfStyles.value, { fontFamily: "Barlow", fontWeight: 600 }]}>{ibanAffiche}</Text>
                </View>
                <PdfRow label="BIC / SWIFT :" value={v(data.nouveauBic.toUpperCase())} />
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="Titulaire du compte :" value={titulaireLabel} />
                {!data.estTitulaire && (
                  <PdfRow label="Nom du titulaire :" value={v(data.nomTitulaire)} />
                )}
                {data.typeDemande === "changement_compte" && (
                  <PdfRow
                    label="Ancien IBAN :"
                    value={data.ancienIban ? formatIBAN(data.ancienIban) : "—"}
                  />
                )}
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}><Text style={{ color: "#E32119" }}>5</Text>  Autorisation</Text>
            <View style={pdfStyles.sepaBox}>
              <Text style={[pdfStyles.infoBoxTitle, { color: "#931510", fontSize: 7.5 }]}>
                Mandat de domiciliation
              </Text>
              <Text style={{ fontSize: 7, color: "#222222", lineHeight: 1.5 }}>
                En signant ce mandat de domiciliation, vous autorisez la Centrale Générale FGTB Namur-Luxembourg à envoyer des instructions à votre banque pour débiter votre compte bancaire, et ce conformément aux instructions disponibles sur simple demande. Vous bénéficiez d&apos;un droit de remboursement par votre banque selon les conditions légales.
              </Text>
            </View>
            <View style={[pdfStyles.twoCol, { marginTop: 6 }]}>
              <View style={pdfStyles.colLeft}>
                <PdfRow label="Date :" value={v(data.dateSig)} />
                {data.typeDemande === "changement_compte" && (
                  <PdfRow label="Accord transfert :" value={accordLabel} />
                )}
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="Lieu :" value={v(data.lieu)} />
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}><Text style={{ color: "#E32119" }}>6</Text>  Signature du membre</Text>
            <View style={pdfStyles.signatureBox}>
              {data.signature ? (
                <PDFImage src={data.signature} style={pdfStyles.signatureImage} />
              ) : (
                <Text style={{ fontSize: 8, color: "#222222", alignSelf: "center" }}>
                  (aucune signature fournie)
                </Text>
              )}
              <Text style={[pdfStyles.signatureDate, { textAlign: "center" }]}>
                Signé électroniquement le {dateDoc}
              </Text>
              <Text style={pdfStyles.luApprouve}>
                Lu et approuvé. Mandat complété en ligne le {dateHeure} via accg-nalux.be.{"\n"}
                Certifié conforme par signature électronique.{ipAddress ? ` IP : ${ipAddress}` : ""}{"\n"}
                Vos données personnelles sont traitées conformément au RGPD. Politique de confidentialité : https://www.accg.be/fr/protection-de-la-vie-privee — privacy@accg.be
              </Text>
            </View>
          </View>

        </View>

        {/* Nos bureaux : au-dessus du pied de page, sur l'unique page du mandat. */}
        <BureauxPdf page={1} haut={738} />

        <Text style={pdfStyles.footer} fixed>
          Centrale Générale FGTB Namur-Luxembourg · admin.nalux@accg.be · Données traitées conformément au RGPD
        </Text>

      </Page>
    </Document>
  );
}

/** Polices, logo puis rendu : appelé à la demande par le formulaire et par le back-office. */
export async function produirePdfMandat(props: Omit<Parameters<typeof MandatPDF>[0], "logoBase64">): Promise<Blob> {
  enregistrerPolicesPdf(window.location.origin);
  const logoBase64 = await fetchLogoBase64().catch(() => "");
  return pdf(<MandatPDF {...props} logoBase64={logoBase64} />).toBlob();
}
