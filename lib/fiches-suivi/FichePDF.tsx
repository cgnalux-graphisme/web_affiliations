import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { PDF_COULEURS as C, enregistrerPolicesPdf } from "../pdf/charte";

/**
 * PDF d'une fiche de suivi (navigateur, @react-pdf/renderer), même charte que le rapport d'activité :
 * Barlow / Barlow Condensed, palette stricte, aplat bordeaux (jamais de fond noir), filet rouge sous les titres.
 * Exporte aussi BlocFicheRapport, la version réduite utilisée dans le rapport de congrès.
 */

export const enregistrerPolices = enregistrerPolicesPdf;

/** Données prêtes à mettre en page (photos déjà converties en data URL). */
export type FichePdf = {
  titre: string;
  type: string;
  date: string;
  /** Entreprise (et site) pour un événement en usine, secteur pour un événement sectoriel. */
  lieu: string;
  libelleLieu: "Entreprise" | "Secteur";
  secteur: string | null;
  auteur: string | null;
  brouillon: boolean;
  paragraphes: string[];
  reponses: { libelle: string; reponse: string }[];
  documents: { nom: string; nature: string }[];
  photos: { src: string; legende: string | null }[];
};

const s = StyleSheet.create({
  page: { fontFamily: "Barlow", fontSize: 10, lineHeight: 1.45, color: C.charbon, paddingTop: 58, paddingBottom: 56, paddingHorizontal: 50 },
  // Positionnés depuis le haut : « bottom » place le pied hors page avec react-pdf (A4 = 842 pt).
  entete: { position: "absolute", top: 24, fontSize: 8, color: C.charbon },
  pied: { position: "absolute", top: 808, fontSize: 8 },
  h2: { fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 16, marginTop: 20, marginBottom: 4 },
  filet: { width: 34, height: 4, backgroundColor: C.rouge, marginBottom: 10 },
  libelle: { fontSize: 7.5, fontWeight: 600, color: C.bordeaux, letterSpacing: 0.6, textTransform: "uppercase" },
});

/** Retire les emojis et symboles absents des polices du PDF. */
const propre = (t: string) => t.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, "").trim();

function Titre2({ children }: { children: string }) {
  return (
    <View minPresenceAhead={60}>
      <Text style={s.h2}>{children}</Text>
      <View style={s.filet} />
    </View>
  );
}

export default function FichePDF({ f, genereLe, origine }: { f: FichePdf; genereLe: string; origine: string }) {
  const [principale, ...autres] = f.photos;
  const cartouche = [
    { libelle: "Type", valeur: f.type },
    { libelle: "Date", valeur: f.date || "Non précisée" },
    { libelle: f.libelleLieu, valeur: f.lieu || "Non précisé" },
    { libelle: "Permanent", valeur: f.auteur ?? "" },
  ].filter((c) => c.valeur);

  return (
    <Document title={`Fiche de suivi : ${f.titre}`} author="Centrale Générale FGTB Namur-Luxembourg" language="fr-BE">
      <Page size="A4" style={s.page}>
        {/* Cadre des pages suivantes (la première porte le bandeau). */}
        <Text style={[s.entete, { left: 50 }]} fixed render={({ pageNumber }) => (pageNumber > 1 ? `Fiche de suivi · ${f.titre}` : "")} />
        <Text style={[s.entete, { right: 50, textAlign: "right" }]} fixed
          render={({ pageNumber }) => (pageNumber > 1 ? "Centrale Générale FGTB Namur-Luxembourg" : "")} />
        <Text style={[s.pied, { left: 50 }]} fixed>Document interne · généré le {genereLe}</Text>
        <Text style={[s.pied, { right: 50, textAlign: "right" }]} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />

        {/* ── Bandeau ── */}
        <View style={{ marginTop: -58, marginHorizontal: -50, backgroundColor: C.bordeaux, color: C.blanc }}>
          <View style={{ height: 10, backgroundColor: C.rouge }} />
          <View style={{ paddingHorizontal: 50, paddingTop: 22, paddingBottom: 26 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- composant PDF, pas d'attribut alt */}
              <Image src={`${origine}/logo-cg-blanc.png`} style={{ width: 120 }} />
              <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 11, letterSpacing: 1.5 }}>FICHE DE SUIVI</Text>
            </View>
            <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 30, lineHeight: 1.02, marginTop: 26 }}>{propre(f.titre)}</Text>
            <View style={{ width: 54, height: 5, backgroundColor: C.blanc, marginTop: 12 }} />
          </View>
        </View>

        {/* ── Cartouche ── */}
        <View style={{ flexDirection: "row", borderTopWidth: 2, borderTopColor: C.charbon, borderBottomWidth: 0.75, borderBottomColor: C.ardoise, marginTop: 18 }}>
          {cartouche.map((c, i) => (
            <View key={c.libelle} style={{ flex: i === 2 ? 1.6 : 1, paddingVertical: 8, paddingRight: 8, paddingLeft: i ? 10 : 0,
              borderLeftWidth: i ? 0.75 : 0, borderLeftColor: C.ardoise }}>
              <Text style={s.libelle}>{c.libelle}</Text>
              <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 12.5, lineHeight: 1.15, marginTop: 3 }}>{propre(c.valeur)}</Text>
            </View>
          ))}
        </View>

        {/* ── Photo principale ── */}
        {principale && (
          <View style={{ marginTop: 18 }} wrap={false}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- composant PDF */}
            <Image src={principale.src} style={{ width: "100%", height: 250, objectFit: "cover" }} />
            {principale.legende && <Text style={{ fontSize: 8.5, fontStyle: "italic", marginTop: 4 }}>{propre(principale.legende)}</Text>}
          </View>
        )}

        {/* ── Récit ── */}
        <Titre2>Le suivi</Titre2>
        {f.paragraphes.length ? (
          f.paragraphes.map((p, i) => (
            <Text key={i} style={{ fontSize: 10.5, lineHeight: 1.55, marginBottom: 7 }} orphans={3} widows={3}>{propre(p)}</Text>
          ))
        ) : (
          <Text style={{ fontStyle: "italic", color: C.ardoise }}>Texte de la fiche à rédiger.</Text>
        )}

        {/* ── En bref ── */}
        {f.reponses.length > 0 && (
          <>
            <Titre2>En bref</Titre2>
            <View style={{ borderTopWidth: 1.5, borderTopColor: C.charbon }}>
              {f.reponses.map((r) => (
                <View key={r.libelle} style={{ flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.ardoise, paddingVertical: 5 }} wrap={false}>
                  <Text style={{ width: 128, fontSize: 8.5, fontWeight: 600, paddingRight: 8 }}>{r.libelle}</Text>
                  <Text style={{ flex: 1, fontSize: 9.5 }}>{propre(r.reponse)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Pièces jointes ── */}
        {f.documents.length > 0 && (
          <>
            <Titre2>Pièces jointes</Titre2>
            {f.documents.map((d, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 }} wrap={false}>
                <Text style={{ width: 96, borderWidth: 1, borderColor: C.bordeaux, color: C.bordeaux, fontSize: 7.5, fontWeight: 600,
                  textAlign: "center", paddingTop: 2.5, paddingBottom: 1.5 }}>
                  {d.nature}
                </Text>
                <Text style={{ flex: 1, fontSize: 9.5 }}>{d.nom}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Photos ── */}
        {autres.length > 0 && (
          <>
            <Titre2>Photos</Titre2>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {autres.map((p, i) => (
                <View key={i} style={{ width: 241 }} wrap={false}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- composant PDF */}
                  <Image src={p.src} style={{ width: 241, height: 165, objectFit: "cover" }} />
                  {p.legende && <Text style={{ fontSize: 8, fontStyle: "italic", marginTop: 3 }}>{propre(p.legende)}</Text>}
                </View>
              ))}
            </View>
          </>
        )}
        {/* Filigrane dessiné en dernier : il passe par-dessus les photos, en transparence. */}
        {f.brouillon && (
          <Text fixed style={{ position: "absolute", top: 390, left: 70, fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 110,
            color: C.ardoise, opacity: 0.16, transform: "rotate(-32deg)" }}>
            BROUILLON
          </Text>
        )}
      </Page>
    </Document>
  );
}

/** Une fiche dans le rapport de congrès : titre, ligne d'informations, photo principale et texte. */
export function BlocFicheRapport({ f }: { f: FichePdf }) {
  const photo = f.photos[0];
  const infos = [f.date, f.lieu, f.type, f.auteur && `Permanent : ${f.auteur}`].filter(Boolean).join(" · ");
  return (
    <View style={{ marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: C.charbon }}>
      <View wrap={false}>
        <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 10.5, color: C.bordeaux }}>{infos}</Text>
        <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 18, lineHeight: 1.1, marginTop: 3, marginBottom: 8 }}>{propre(f.titre)}</Text>
        {photo && (
          // eslint-disable-next-line jsx-a11y/alt-text -- composant PDF
          <Image src={photo.src} style={{ width: 230, height: 150, objectFit: "cover", marginBottom: 8 }} />
        )}
      </View>
      {f.paragraphes.map((p, i) => (
        <Text key={i} style={{ fontSize: 9.5, lineHeight: 1.5, marginBottom: 5 }} orphans={3} widows={3}>{propre(p)}</Text>
      ))}
    </View>
  );
}
