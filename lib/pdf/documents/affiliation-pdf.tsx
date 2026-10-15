import React from "react";
import {
  Document,
  Page,
  Text as PDFText,
  View,
  StyleSheet as PDFStyleSheet,
  Image as PDFImage,
  pdf,
} from "@react-pdf/renderer";
import {
  MONTHS_FR,
  calculerCotisation,
  commissionsParitaires,
  type Echeance,
  type EcheanceDom,
  type FormData,
  type Paiement2025,
  type PdfMentions,
} from "../../../FormulaireWebIndependant";
import { BureauxPdf } from "../BureauxPdf";
import { enregistrerPolicesPdf } from "../charte";

/**
 * PDF de la demande d'affiliation (FormulaireWebIndependant.tsx), 2 pages A4 au plus.
 * Module séparé, chargé seulement au moment de produire le PDF : la bibliothèque PDF
 * (plus d'un mégaoctet) ne ralentit plus l'ouverture du formulaire.
 */

/** Formate une valeur optionnelle : affiche "—" si vide */
const v = (val?: string) => val?.trim() || "—";

const pdfStyles = PDFStyleSheet.create({
  page: {
    fontFamily: "Barlow",
    fontSize: 9,
    paddingTop: 36,
    paddingBottom: 52,
    paddingLeft: 40,
    paddingRight: 40,
    backgroundColor: "#FFFFFF",
    color: "#222222",
  },

  // ── Bandeau rouge FGTB ───────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 4,
    borderBottomColor: "#222222",
    borderBottomStyle: "solid",
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  // Largeur seule → ratio préservé automatiquement par react-pdf
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

  // ── Corps de la page ─────────────────────────────────────────────────────
  body: {
    // Contenu principal aligné sur les marges A4
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 10,
  },

  // ── Titre de section ─────────────────────────────────────────────────────
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
    marginBottom: 5,
    marginTop: 9,
  },
  section: { marginBottom: 3 },

  // ── Grille 2 colonnes ────────────────────────────────────────────────────
  twoCol: { flexDirection: "row" },
  colLeft:  { flex: 1, marginRight: 12 },
  colRight: { flex: 1 },

  // ── Ligne label / valeur ─────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#7C90A0",
    borderBottomStyle: "solid",
    paddingBottom: 2,
    marginBottom: 2.5,
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

  // ── Section 0 — Réservé administration ───────────────────────────────────
  adminBox: {
    borderWidth: 1,
    borderColor: "#7C90A0",
    borderStyle: "dashed",
    borderRadius: 3,
    paddingTop: 6,
    paddingBottom: 6,
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

  // ── Encadré cotisation (compact) ──────────────────────────────────────────
  cotisationBox: {
    borderWidth: 1.5,
    borderColor: "#931510",
    borderStyle: "solid",
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 9,
    paddingRight: 9,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  cotisationMontant: {
    fontFamily: "Barlow Condensed",
    fontWeight: 800,
    fontSize: 17,
    color: "#931510",
    marginRight: 8,
  },
  cotisationCatLabel: {
    fontSize: 7,
    color: "#222222",
    fontFamily: "Barlow", fontWeight: 600,
  },
  cotisationCatSub: {
    fontSize: 6.5,
    color: "#222222",
    marginTop: 1,
  },
  cotisationNote: {
    fontSize: 6.5,
    color: "#222222",
    marginTop: 4,
    lineHeight: 1.3,
  },

  // ── Tableau écheancier ────────────────────────────────────────────────────
  echeancierWrap: {
    marginTop: 4,
    marginBottom: 2,
  },
  echeancierHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#7C90A0",
    borderTopStyle: "solid",
    borderBottomWidth: 1,
    borderBottomColor: "#7C90A0",
    borderBottomStyle: "solid",
    paddingTop: 2,
    paddingBottom: 2,
  },
  echeancierRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#7C90A0",
    borderBottomStyle: "solid",
    paddingTop: 2,
    paddingBottom: 2,
  },
  echeancierCellDate: {
    width: "30%",
    fontSize: 7,
    paddingLeft: 4,
    color: "#222222",
  },
  echeancierCellPeriode: {
    flex: 1,
    fontSize: 7,
    paddingLeft: 4,
    color: "#222222",
  },
  echeancierCellMontant: {
    width: "18%",
    fontSize: 7,
    fontFamily: "Barlow", fontWeight: 600,
    color: "#222222",
    textAlign: "right",
    paddingRight: 4,
  },
  echeancierHeaderText: {
    fontSize: 6.5,
    fontFamily: "Barlow", fontWeight: 600,
    color: "#222222",
    paddingLeft: 4,
  },

  // ── Encadré info paiement ─────────────────────────────────────────────────
  infoBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#7C90A0",
    borderStyle: "solid",
    borderRadius: 3,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
    marginTop: 4,
  },
  // Encadré paiement immédiat 2025 — bandeau amber à gauche
  paiement2025Box: {
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
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  // Encadré SEPA stylisé — bandeau rouge à gauche
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
    paddingTop: 6,
    paddingBottom: 6,
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

  // ── Mentions légales ──────────────────────────────────────────────────────
  mentionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2.5,
  },
  mentionBadgeOk: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#931510",
    borderStyle: "solid",
    borderRadius: 2,
    paddingTop: 1,
    paddingBottom: 1,
    paddingLeft: 3,
    paddingRight: 3,
    marginRight: 5,
    marginTop: 1,
  },
  mentionBadgeOkText: {
    fontSize: 6,
    color: "#931510",
    fontFamily: "Barlow", fontWeight: 600,
  },
  mentionContent: { flex: 1 },
  mentionLabel: {
    fontSize: 7.5,
    fontFamily: "Barlow", fontWeight: 600,
    color: "#222222",
  },
  mentionDesc: {
    fontSize: 6.5,
    color: "#222222",
    marginTop: 1,
    lineHeight: 1.3,
  },

  // ── Zone signature ────────────────────────────────────────────────────────
  signatureBox: {
    borderWidth: 1,
    borderColor: "#7C90A0",
    borderStyle: "solid",
    borderRadius: 3,
    paddingTop: 8,
    paddingBottom: 8,
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
    marginTop: 6,
    lineHeight: 1.5,
    borderTopWidth: 1,
    borderTopColor: "#7C90A0",
    borderTopStyle: "solid",
    paddingTop: 5,
    textAlign: "center",
  },

  // ── Pied de page ──────────────────────────────────────────────────────────
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

/** Ligne label + valeur dans le PDF */
function PdfRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={pdfStyles.row}>
      <PDFText style={pdfStyles.label}>{label}</PDFText>
      <PDFText style={pdfStyles.value}>{value}</PDFText>
    </View>
  );
}

/**
 * AffiliationDocument — Formulaire PDF complet, 2 pages A4 maximum.
 * Sections : 0. Admin  1. Identité  2. Adresse  3. Situation pro
 *            4. Transfert  5. Cotisation  6. SEPA + Échéancier
 *            7. Mentions légales  8. Signature
 *
 * Les échéanciers sont pré-calculés côté React (pas dans le worker PDF).
 */
export function AffiliationDocument({
  data,
  mentions,
  logoBase64,
  echeancesDom,
  echeancesVir,
  paiement2025,
  userIp,
  dateDocument,
}: {
  data: FormData;
  mentions: PdfMentions;
  logoBase64: string | null;
  echeancesDom: EcheanceDom[];
  echeancesVir: Echeance[];
  paiement2025: Paiement2025 | null;
  userIp: string;
  /** Date de la demande (back-office) ; par défaut, maintenant. */
  dateDocument?: Date;
}) {
  const now          = dateDocument ?? new Date();
  const dateDoc      = now.toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const heureDoc     = now.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });

  const cotisation     = calculerCotisation(data);
  const montantMensuel = cotisation ? cotisation.montant.toFixed(2) : null;

  const genreLabel =
    data.genre === "M" ? "Homme" : data.genre === "F" ? "Femme" : "Autre / Non-binaire";

  const situationProLabel = data.situationPro === "actif" ? "Actif(ve)" : "Inactif(ve)";

  const statutLabel: Record<string, string> = {
    ouvrier: "Ouvrier", employe: "Employé(e)", interimaire: "Intérimaire",
    etudiant: "Étudiant(e)", apprenti: "Apprenti(e)", cefa: "CEFA / IFAPME",
    pfi: "Contrat PFI", mutuelle: "A la mutuelle",
  };
  const typeInactifLabel: Record<string, string> = {
    "pensionné": "Pensionné(e)", "prepensionné": "Prépensionné(e)",
    "sans_emploi": "Sans emploi", "autre": data.autreInactifPrecision || "Autre",
  };
  const regimeLabel = (() => {
    if (data.regimeTravail === "temps-plein") return "Temps plein";
    if (data.regimeTravail === "flexi")       return "Flexi-job";
    if (data.regimeTravail === "temps-partiel") {
      const d = data.regimeTravailDetail === "plus20h"  ? " (>= 20h/sem.)"
              : data.regimeTravailDetail === "moins20h" ? " (< 20h/sem.)"
              : "";
      return `Temps partiel${d}`;
    }
    return "—";
  })();

  const _moisNum = data.affiliationMois ? parseInt(data.affiliationMois, 10) : 0;
  const affiliationDebut = _moisNum && data.affiliationAnnee
    ? `${MONTHS_FR[_moisNum - 1]} ${data.affiliationAnnee}` : "—";
  const modePaiementLabel =
    data.modePaiement === "domiciliation" ? "Domiciliation automatique" : "Virement trimestriel";

  const mentionsList: Array<{ key: keyof PdfMentions; label: string; desc: string }> = [
    { key: "assistance",  label: "Assistance juridique",     desc: "Intervention de la CG FGTB Namur-Luxembourg uniquement pour les dossiers liés au droit du travail belge." },
    { key: "continuite",  label: "Continuité d'affiliation", desc: "Autorisation de prélèvement des cotisations en retard sur tout avantage sectoriel confié pour paiement." },
    { key: "information", label: "Obligation d'information", desc: "Engagement de signaler tout changement de coordonnées ou de situation professionnelle par écrit." },
    { key: "accord",      label: "Accord général",           desc: "Prise de connaissance des statuts de la CG FGTB Namur-Luxembourg (version en vigueur à la date de la demande, consultables sur www.accg-nalux.be/statuts), acceptation sans réserve et engagement à respecter les statuts, règlements et décisions des congrès." },
    { key: "rgpd",        label: "RGPD",                     desc: "Accord sur le traitement des données personnelles conformément à la politique de confidentialité." },
  ];

  return (
    <Document
      title={`FGTB Affiliation — ${data.nom} ${data.prenom}`}
      author="Centrale Générale FGTB Namur-Luxembourg"
      subject="Formulaire d'affiliation"
    >
      <Page size="A4" style={pdfStyles.page}>

        {/* ══ BANDEAU ═══════════════════════════════════════════════════════ */}
        <View style={pdfStyles.header}>
          {logoBase64 ? (
            <PDFImage src={logoBase64} style={pdfStyles.logoImage} />
          ) : (
            // Logo pas encore préchargé : react-pdf le télécharge lui-même depuis le site (jamais de nom en texte).
            <PDFImage src={`${typeof window !== "undefined" ? window.location.origin : ""}/logo-cg-rouge.png`} style={pdfStyles.logoImage} />
          )}
          <View style={pdfStyles.headerRight}>
            <PDFText style={pdfStyles.headerTitle}>Formulaire d&apos;affiliation</PDFText>
            <PDFText style={pdfStyles.headerDateLabel}>
              Document du <PDFText style={pdfStyles.headerDateValue}>{dateDoc}</PDFText>
            </PDFText>
            <PDFText style={pdfStyles.headerMember}>{data.prenom} {data.nom}</PDFText>
          </View>
        </View>

        <View style={pdfStyles.body}>

          {/* ══ 0. RÉSERVÉ À L'ADMINISTRATION ════════════════════════════════ */}
          <View style={pdfStyles.section}>
            <PDFText style={pdfStyles.sectionTitle}><PDFText style={{ color: "#E32119" }}>0</PDFText>  Réservé à l'administration</PDFText>
            <View style={pdfStyles.adminBox}>
              <View style={pdfStyles.adminFieldWrap}>
                <PDFText style={pdfStyles.adminFieldLabel}>N° de Mandat :</PDFText>
                <View style={pdfStyles.adminFieldLine} />
              </View>
              <View style={[pdfStyles.adminFieldWrap, { marginRight: 0 }]}>
                <PDFText style={pdfStyles.adminFieldLabel}>Date d'encodage :</PDFText>
                <View style={pdfStyles.adminFieldLine} />
              </View>
            </View>
          </View>

          {/* ══ 1. IDENTITÉ ═══════════════════════════════════════════════════ */}
          <View style={pdfStyles.section}>
            <PDFText style={pdfStyles.sectionTitle}><PDFText style={{ color: "#E32119" }}>1</PDFText>  Identité</PDFText>
            <View style={pdfStyles.twoCol}>
              <View style={pdfStyles.colLeft}>
                <PdfRow label="Nom :"               value={v(data.nom)} />
                <PdfRow label="Prénom :"            value={v(data.prenom)} />
                <PdfRow label="NISS :"              value={v(data.niss)} />
                <PdfRow label="Date de naissance :" value={v(data.dateNaissance)} />
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="Nationalité :" value={v(data.nationalite)} />
                <PdfRow label="Genre :"       value={genreLabel} />
                <PdfRow label="Email :"       value={v(data.email)} />
                <PdfRow label="Téléphone :"   value={v(data.tel)} />
              </View>
            </View>
          </View>

          {/* ══ 2. ADRESSE ════════════════════════════════════════════════════ */}
          <View style={pdfStyles.section}>
            <PDFText style={pdfStyles.sectionTitle}><PDFText style={{ color: "#E32119" }}>2</PDFText>  Adresse</PDFText>
            <View style={pdfStyles.twoCol}>
              <View style={pdfStyles.colLeft}>
                <PdfRow label="Rue :"         value={v(data.rue)} />
                <PdfRow label="Code postal :" value={v(data.codePostal)} />
                <PdfRow label="Pays :"        value={v(data.pays)} />
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="N° / Boite :"  value={`${v(data.numero)}${data.boite ? ` bte ${data.boite}` : ""}`} />
                <PdfRow label="Localité :"    value={v(data.localite)} />
              </View>
            </View>
          </View>

          {/* ══ 3. SITUATION PROFESSIONNELLE ══════════════════════════════════ */}
          <View style={pdfStyles.section}>
            <PDFText style={pdfStyles.sectionTitle}><PDFText style={{ color: "#E32119" }}>3</PDFText>  Situation professionnelle</PDFText>
            {data.situationPro === "actif" && (
              <View style={pdfStyles.twoCol}>
                <View style={pdfStyles.colLeft}>
                  {/* "Situation" aligné sur la même grille que les lignes dessous */}
                  <PdfRow label="Situation :"   value={situationProLabel} />
                  <PdfRow label="Statut :"      value={statutLabel[data.statut] ?? v(data.statut)} />
                  <PdfRow label="Entreprise :"  value={v(data.entreprise)} />
                  <PdfRow label="N° ONSS :"     value={v(data.matriculeONSS)} />
                </View>
                <View style={pdfStyles.colRight}>
                  <PdfRow label="Date d'entrée :" value={v(data.dateEntree)} />
                  <PdfRow label="Régime :"        value={regimeLabel} />
                  <PdfRow
                    label="Commission paritaire :"
                    value={
                      data.secteur === "000" && data.secteurAutre
                        ? `Autre — ${data.secteurAutre}`
                        : commissionsParitaires.find((c) => c.id === data.secteur)?.label ?? v(data.secteur)
                    }
                  />
                </View>
              </View>
            )}
            {data.situationPro === "inactif" && (
              <View style={pdfStyles.twoCol}>
                <View style={pdfStyles.colLeft}>
                  <PdfRow label="Situation :" value={situationProLabel} />
                  <PdfRow label="Type :" value={typeInactifLabel[data.typeInactif] ?? v(data.typeInactif)} />
                  {data.typeInactif === "sans_emploi" && data.allocationsChomage && (
                    <PdfRow label="Allocations chômage :" value={data.allocationsChomage === "oui" ? "Oui" : "Non"} />
                  )}
                </View>
                <View style={pdfStyles.colRight} />
              </View>
            )}
          </View>

          {/* ══ 4. TRANSFERT SYNDICAL (conditionnel) ══════════════════════════ */}
          {(data.autresCentraleFGTB || data.affilieAutreSyndicat || data.dossierJuridique) && (
            <View style={pdfStyles.section}>
              <PDFText style={pdfStyles.sectionTitle}><PDFText style={{ color: "#E32119" }}>4</PDFText>  Transfert syndical</PDFText>
              {(() => {
                // Lignes présentes seulement, réparties à gauche puis à droite (pas de colonne vide).
                const lignes: [string, string][] = [];
                if (data.autresCentraleFGTB) lignes.push(["Autre centrale FGTB :", data.autresCentraleFGTB === "oui" ? "Oui" : "Non"]);
                if (data.autresCentraleFGTB === "oui" && data.centralesFGTBChoisie) lignes.push(["Centrale :", data.centralesFGTBChoisie.replace(/_/g, " ")]);
                if (data.autresCentraleFGTB === "oui" && data.provinceCentraleFGTB) lignes.push(["Province :", data.provinceCentraleFGTB]);
                if (data.affilieAutreSyndicat) lignes.push(["Autre syndicat :", data.affilieAutreSyndicat === "oui" ? "Oui" : "Non"]);
                if (data.affilieAutreSyndicat === "oui" && data.autreSyndicatChoix) {
                  lignes.push([
                    "Syndicat :",
                    data.autreSyndicatChoix === "csc" ? "CSC / ACV"
                      : data.autreSyndicatChoix === "cgslb" ? "CGSLB / ACLVB"
                      : data.autreSyndicatAutreDetail || "Autre",
                  ]);
                }
                if (data.dossierJuridique) lignes.push(["Dossier juridique :", data.dossierJuridique === "oui" ? "Oui" : "Non"]);
                const moitie = Math.ceil(lignes.length / 2);
                return (
                  <View style={pdfStyles.twoCol}>
                    <View style={pdfStyles.colLeft}>
                      {lignes.slice(0, moitie).map(([l, val]) => <PdfRow key={l} label={l} value={val} />)}
                    </View>
                    <View style={pdfStyles.colRight}>
                      {lignes.slice(moitie).map(([l, val]) => <PdfRow key={l} label={l} value={val} />)}
                    </View>
                  </View>
                );
              })()}
            </View>
          )}

          {/* ══ 5. COTISATION ═════════════════════════════════════════════════ */}
          <View style={pdfStyles.section}>
            <PDFText style={pdfStyles.sectionTitle}><PDFText style={{ color: "#E32119" }}>5</PDFText>  Cotisation</PDFText>
            <View style={pdfStyles.twoCol}>
              <View style={pdfStyles.colLeft}>
                <PdfRow label="Début d'affiliation :" value={affiliationDebut} />
                <PdfRow label="Mode de paiement :"    value={modePaiementLabel} />
              </View>
              <View style={pdfStyles.colRight}>
                {cotisation && (
                  <PdfRow label="Catégorie :" value={`${cotisation.categorie} — ${cotisation.label}`} />
                )}
              </View>
            </View>
            {cotisation && montantMensuel && (
              <View>
                <View style={pdfStyles.cotisationBox}>
                  <PDFText style={pdfStyles.cotisationMontant}>{montantMensuel} €</PDFText>
                  <View>
                    <PDFText style={pdfStyles.cotisationCatLabel}>/ mois · {cotisation.categorie}</PDFText>
                    <PDFText style={pdfStyles.cotisationCatSub}>Barème {now.getFullYear()}</PDFText>
                  </View>
                </View>
                <PDFText style={pdfStyles.cotisationNote}>
                  Le montant de cette cotisation est calculé à titre indicatif sur base de vos déclarations. La Centrale Générale FGTB Namur Luxembourg se réserve le droit de l'adapter en cas d'erreur ou de modification de votre situation professionnelle constatée par nos services.
                </PDFText>
              </View>
            )}
          </View>

          {/* ══ 6. PAIEMENT DE LA COTISATION ══════════════════════════════════ */}
          <View style={pdfStyles.section} break>
            <PDFText style={pdfStyles.sectionTitle}><PDFText style={{ color: "#E32119" }}>6</PDFText>  Paiement de la cotisation</PDFText>

            {/* Coordonnées bancaires */}
            <View style={pdfStyles.twoCol}>
              <View style={pdfStyles.colLeft}>
                <PdfRow label="IBAN :"          value={v(data.iban)} />
                <PdfRow label="Mode :"          value={modePaiementLabel} />
              </View>
              <View style={pdfStyles.colRight}>
                <PdfRow label="BIC / SWIFT :"   value={v(data.bic)} />
                {data.modePaiement === "domiciliation" && (
                  <PdfRow
                    label="Titulaire :"
                    value={data.titulaireDuCompte === "oui" ? "Le/la souscripteur(trice)" : "Un tiers"}
                  />
                )}
              </View>
            </View>
            {data.modePaiement === "domiciliation" && data.titulaireDuCompte === "non" && data.titulaireNomPrenom && (
              <PdfRow label="Identité du titulaire :" value={data.titulaireNomPrenom} />
            )}

            {/* ── Domiciliation : informations créancier + échéancier ── */}
            {data.modePaiement === "domiciliation" && (
              <View style={pdfStyles.sepaBox}>
                <PDFText style={[pdfStyles.infoBoxTitle, { color: "#931510", fontSize: 7.5 }]}>
                  Informations créancier SEPA
                </PDFText>
                <PdfRow label="Créancier :"                   value="Centrale Générale FGTB Namur-Luxembourg" />
                <PdfRow label="Identifiant Créancier (ICS) :" value="BE00000647821" />
                <PdfRow label="Type de prélèvement :"         value="Paiement récurrent mensuel" />
                <PdfRow label="Référence mandat :"            value="[à compléter par l'administration]" />
              </View>
            )}

            {/* ── Virement : compte bénéficiaire ── */}
            {data.modePaiement === "virement" && (
              <View style={pdfStyles.infoBox}>
                <PDFText style={pdfStyles.infoBoxTitle}>Modalités de virement</PDFText>
                <PdfRow label="Bénéficiaire :" value="Centrale Générale FGTB Namur-Luxembourg" />
                <PdfRow label="Compte :"       value="BE94 8791 5049 0114" />
                <PdfRow label="Communication :" value={`Votre NISS : ${v(data.niss)}`} />
              </View>
            )}

            {/* ── Tableau d'échéances domiciliation ── */}
            {echeancesDom.length > 0 && (
              <View style={pdfStyles.echeancierWrap}>
                <PDFText style={{ fontSize: 7, fontFamily: "Barlow", fontWeight: 600, color: "#222222", marginBottom: 2 }}>
                  Échéancier des prélèvements
                </PDFText>
                <View style={pdfStyles.echeancierHeaderRow}>
                  <PDFText style={[pdfStyles.echeancierHeaderText, { width: "32%" }]}>Date prélèvement</PDFText>
                  <PDFText style={[pdfStyles.echeancierHeaderText, { flex: 1 }]}>Mois couverts</PDFText>
                  <PDFText style={[pdfStyles.echeancierHeaderText, { width: "18%", textAlign: "right", paddingRight: 4 }]}>Montant</PDFText>
                </View>
                {echeancesDom.map((e, i) => (
                  <View key={i} style={pdfStyles.echeancierRow}>
                    <PDFText style={pdfStyles.echeancierCellDate}>{e.datePrelevement}</PDFText>
                    <PDFText style={pdfStyles.echeancierCellPeriode}>{e.moisCouverts.join(" · ")}</PDFText>
                    <PDFText style={pdfStyles.echeancierCellMontant}>{e.montant.toFixed(2)} €</PDFText>
                  </View>
                ))}
              </View>
            )}

            {/* ── Paiement immédiat 2025 (1 seul virement) ── */}
            {paiement2025 && (
              <View style={pdfStyles.paiement2025Box}>
                <PDFText style={{ fontSize: 7.5, fontFamily: "Barlow", fontWeight: 600, color: "#222222", marginBottom: 3 }}>
                  Paiement immédiat 2025 — à régler en 1 seul virement
                </PDFText>
                <View style={{ flexDirection: "row", marginBottom: 2 }}>
                  <PDFText style={{ fontSize: 7, color: "#222222", fontFamily: "Barlow", fontWeight: 600, width: "35%" }}>
                    Mois couverts :
                  </PDFText>
                  <PDFText style={{ fontSize: 7, color: "#222222", flex: 1 }}>
                    {paiement2025.moisCouverts[0]} à {paiement2025.moisCouverts[paiement2025.moisCouverts.length - 1]}
                  </PDFText>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <PDFText style={{ fontSize: 7, color: "#222222", fontFamily: "Barlow", fontWeight: 600, width: "35%" }}>
                    Total à payer :
                  </PDFText>
                  <PDFText style={{ fontSize: 11, fontFamily: "Barlow", fontWeight: 600, color: "#931510" }}>
                    {paiement2025.montant.toFixed(2)} €
                  </PDFText>
                  <PDFText style={{ fontSize: 6.5, color: "#222222", marginLeft: 4, marginTop: 2 }}>
                    (barème 2025)
                  </PDFText>
                </View>
              </View>
            )}

            {/* ── Tableau d'échéances virement 2026 ── */}
            {echeancesVir.length > 0 && (
              <View style={pdfStyles.echeancierWrap}>
                <PDFText style={{ fontSize: 7, fontFamily: "Barlow", fontWeight: 600, color: "#222222", marginBottom: 2 }}>
                  {paiement2025 ? "Échéancier trimestriel 2026 (barème 2026)" : "Échéancier des virements"}
                </PDFText>
                <View style={pdfStyles.echeancierHeaderRow}>
                  <PDFText style={[pdfStyles.echeancierHeaderText, { width: "28%" }]}>Trimestre</PDFText>
                  <PDFText style={[pdfStyles.echeancierHeaderText, { width: "30%" }]}>Date d'échéance</PDFText>
                  <PDFText style={[pdfStyles.echeancierHeaderText, { flex: 1 }]}>Période</PDFText>
                  <PDFText style={[pdfStyles.echeancierHeaderText, { width: "18%", textAlign: "right", paddingRight: 4 }]}>Montant</PDFText>
                </View>
                {echeancesVir.map((e, i) => (
                  <View key={i} style={pdfStyles.echeancierRow}>
                    <PDFText style={[pdfStyles.echeancierCellDate, { width: "28%" }]}>{e.nom}</PDFText>
                    <PDFText style={[pdfStyles.echeancierCellDate, { width: "30%" }]}>{e.dateEcheance}</PDFText>
                    <PDFText style={pdfStyles.echeancierCellPeriode}>{e.periode}</PDFText>
                    <PDFText style={pdfStyles.echeancierCellMontant}>{e.montant.toFixed(2)} €</PDFText>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ══ 7. MENTIONS LÉGALES ═══════════════════════════════════════════ */}
          <View style={pdfStyles.section}>
            <PDFText style={pdfStyles.sectionTitle}><PDFText style={{ color: "#E32119" }}>7</PDFText>  Mentions légales — Acceptées le {dateDoc}</PDFText>
            {mentionsList.map(({ key, label, desc }) => (
              <View key={key} style={pdfStyles.mentionRow}>
                <View style={pdfStyles.mentionBadgeOk}>
                  <PDFText style={pdfStyles.mentionBadgeOkText}>{mentions[key] ? "OUI" : "NON"}</PDFText>
                </View>
                <View style={pdfStyles.mentionContent}>
                  <PDFText style={pdfStyles.mentionLabel}>{label}</PDFText>
                  <PDFText style={pdfStyles.mentionDesc}>{desc}</PDFText>
                </View>
              </View>
            ))}
          </View>

          {/* ══ 8. SIGNATURE ═════════════════════════════════════════════════ */}
          <View style={pdfStyles.section}>
            <PDFText style={pdfStyles.sectionTitle}><PDFText style={{ color: "#E32119" }}>8</PDFText>  Signature du membre</PDFText>
            <View style={pdfStyles.signatureBox}>
              {data.signature ? (
                <PDFImage src={data.signature} style={pdfStyles.signatureImage} />
              ) : (
                <PDFText style={{ fontSize: 8, color: "#222222", alignSelf: "center" }}>
                  (aucune signature fournie)
                </PDFText>
              )}
              <PDFText style={[pdfStyles.signatureDate, { textAlign: "center" }]}>
                Signé électroniquement le {dateDoc}
              </PDFText>
              <PDFText style={pdfStyles.luApprouve}>
                Lu et approuvé. Formulaire complété en ligne le {dateDoc} à {heureDoc} via accg-nalux.be.{"\n"}
                Certifié conforme par signature électronique.
              </PDFText>
            </View>
          </View>

        </View>

        {/* ══ NOS BUREAUX (page 2, au-dessus du pied de page) ═══════════════════ */}
        <BureauxPdf page={2} />

        {/* ══ PIED DE PAGE ════════════════════════════════════════════════════ */}
        <PDFText style={pdfStyles.footer} fixed>
          Centrale Générale FGTB Namur-Luxembourg · admin.nalux@accg.be · Données traitées conformément au RGPD
        </PDFText>

      </Page>
    </Document>
  );
}

/** Polices de la charte puis rendu du PDF (formulaire, écran de confirmation, back-office). */
export async function produirePdfAffiliation(props: Parameters<typeof AffiliationDocument>[0]): Promise<Blob> {
  enregistrerPolicesPdf(window.location.origin);
  return pdf(<AffiliationDocument {...props} />).toBlob();
}
