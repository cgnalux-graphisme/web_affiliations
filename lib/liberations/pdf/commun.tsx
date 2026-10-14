import fs from "node:fs";
import path from "node:path";
import React from "react";
import { Font, Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import { PDF_COULEURS } from "../../pdf/charte";
import { BUREAUX, EMAIL_GENERAL } from "../../bureaux";

/**
 * Briques communes des PDF des libérations, fabriqués CÔTÉ SERVEUR (pour être joints aux e-mails) :
 * polices Barlow et logo lus dans public/ (inclus dans la fonction Vercel par outputFileTracingIncludes,
 * next.config.ts). SERVEUR UNIQUEMENT. Charte « Registre » (docs/contexte/design.md).
 */

let polices = false;

export function enregistrerPolicesServeur() {
  if (polices) return;
  const dossier = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Barlow",
    fonts: [
      { src: path.join(dossier, "barlow-400.woff"), fontWeight: 400 },
      { src: path.join(dossier, "barlow-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
      { src: path.join(dossier, "barlow-600.woff"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Barlow Condensed",
    fonts: [
      { src: path.join(dossier, "barlow-condensed-600.woff"), fontWeight: 600 },
      { src: path.join(dossier, "barlow-condensed-800.woff"), fontWeight: 800 },
    ],
  });
  Font.registerHyphenationCallback((mot) => [mot]);
  polices = true;
}

let logo: Buffer | null = null;
export function logoRouge(): Buffer {
  logo ??= fs.readFileSync(path.join(process.cwd(), "public", "logo-cg-rouge.png"));
  return logo;
}

/** A4 = 842 pt de haut : le pied de page est placé depuis le haut (avec « bottom », react-pdf le sort de la page). */
export const HAUT_PIED = 800;

export const s = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 64, paddingHorizontal: 56, fontFamily: "Barlow", fontSize: 10.5, color: PDF_COULEURS.charbon },
  logo: { width: 120, height: 42, objectFit: "contain", objectPosition: "left" },
  petit: { fontSize: 8.5, lineHeight: 1.35 },
  doux: { color: "#56646F" },
  gras: { fontWeight: 600 },
  titre: {
    fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.4,
    borderBottomWidth: 2, borderBottomColor: PDF_COULEURS.charbon, paddingBottom: 4, marginTop: 18, marginBottom: 12,
  },
  section: {
    fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 11, textTransform: "uppercase", color: PDF_COULEURS.rouge,
    borderBottomWidth: 1, borderBottomColor: PDF_COULEURS.rouge, paddingBottom: 2, marginTop: 12, marginBottom: 6,
  },
  ligne: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: PDF_COULEURS.ardoise, paddingVertical: 4 },
  libelle: { width: 150, fontWeight: 600 },
  valeur: { flex: 1 },
  encadre: { borderWidth: 1, borderColor: PDF_COULEURS.bordeaux, padding: 8, marginTop: 6 },
  pied: { position: "absolute", top: HAUT_PIED, left: 56, right: 56, borderTopWidth: 1.5, borderTopColor: PDF_COULEURS.rouge, paddingTop: 4,
    flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#56646F" },
  case: { width: 9, height: 9, borderWidth: 1, borderColor: PDF_COULEURS.charbon, marginRight: 4 },
  choix: { flexDirection: "row", alignItems: "center", marginRight: 14 },
});

/** Pied de page : la centrale, le bureau expéditeur, la pagination. */
export function Pied({ ville = "Namur" }: { ville?: string }) {
  const b = BUREAUX.find((x) => x.ville === ville) ?? BUREAUX.find((x) => x.ville === "Namur")!;
  return (
    <View style={s.pied} fixed>
      <Text>Centrale Générale FGTB Namur-Luxembourg · {b.adresse.join(", ")} · {b.telephone} · {EMAIL_GENERAL}</Text>
      <Text render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")} />
    </View>
  );
}

/** Case à cocher dessinée (les symboles ☐ sont absents des polices). */
export function Case({ libelle }: { libelle: string }) {
  return (
    <View style={s.choix}>
      <View style={s.case} />
      <Text>{libelle}</Text>
    </View>
  );
}

export function Ligne({ libelle, valeur, largeur = 150 }: { libelle: string; valeur?: string | null; largeur?: number }) {
  return (
    <View style={s.ligne} wrap={false}>
      <Text style={[s.libelle, { width: largeur }]}>{libelle}</Text>
      <Text style={s.valeur}>{valeur?.trim() || " "}</Text>
    </View>
  );
}

export function EnTete({ titre }: { titre: string }) {
  return (
    <View>
      <Image src={{ data: logoRouge(), format: "png" }} style={s.logo} />
      <Text style={s.titre}>{titre}</Text>
    </View>
  );
}
