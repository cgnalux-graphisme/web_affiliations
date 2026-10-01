import React from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { BUREAUX } from "../bureaux";
import { PDF_COULEURS } from "./charte";

/**
 * Bloc « Nos bureaux » des PDF (affiliation, mandat SEPA) : adresse et téléphone des 4 bureaux, posé
 * juste au-dessus du pied de page, sur une seule page (`page`, la 2 par défaut). Charte « Registre » :
 * titre condensé sur filet charbon, colonnes séparées par des filets ardoise.
 * Données : lib/bureaux.ts (à tenir à jour à chaque changement d'adresse ou de numéro).
 *
 * `fixed` + `render` : le bloc n'est dessiné que sur la page voulue. Positionné depuis le haut
 * (A4 = 842 pt ; le pied de page est à 808 pt) : avec react-pdf, « bottom » peut sortir de la page.
 */
const HAUT = 736;

const styles = StyleSheet.create({
  bloc: {
    position: "absolute",
    top: HAUT,
    left: 40,
    right: 40,
  },
  titre: {
    fontFamily: "Barlow Condensed",
    fontWeight: 800,
    fontSize: 9,
    textTransform: "uppercase",
    color: PDF_COULEURS.charbon,
    borderBottomWidth: 1.5,
    borderBottomColor: PDF_COULEURS.charbon,
    borderBottomStyle: "solid",
    paddingBottom: 2,
    marginBottom: 5,
  },
  colonnes: { flexDirection: "row" },
  colonne: {
    flex: 1,
    paddingLeft: 7,
    borderLeftWidth: 0.75,
    borderLeftColor: PDF_COULEURS.ardoise,
    borderLeftStyle: "solid",
  },
  premiere: { paddingLeft: 0, borderLeftWidth: 0 },
  ville: {
    fontFamily: "Barlow Condensed",
    fontWeight: 800,
    fontSize: 9,
    color: PDF_COULEURS.charbon,
    marginBottom: 1.5,
  },
  siege: { color: PDF_COULEURS.rouge },
  ligne: { fontFamily: "Barlow", fontSize: 7, color: PDF_COULEURS.charbon, lineHeight: 1.35 },
  tel: { fontFamily: "Barlow", fontWeight: 600, fontSize: 7, color: PDF_COULEURS.charbon, marginTop: 1.5 },
});

/** `haut` : position du bloc (pt depuis le haut), à ajuster si la page est très remplie. */
export function BureauxPdf({ page = 2, haut = HAUT }: { page?: number; haut?: number }) {
  return (
    <View
      fixed
      style={[styles.bloc, { top: haut }]}
      render={({ pageNumber }) =>
        pageNumber === page ? (
          <View>
            <Text style={styles.titre}>
              Nos bureaux
            </Text>
            <View style={styles.colonnes}>
              {BUREAUX.map((b, i) => (
                <View key={b.ville} style={i === 0 ? [styles.colonne, styles.premiere] : styles.colonne}>
                  <Text style={styles.ville}>
                    {b.ville}
                    {b.siege ? <Text style={styles.siege}> · siège</Text> : null}
                  </Text>
                  <Text style={styles.ligne}>{b.adresse[0]}</Text>
                  <Text style={styles.ligne}>{b.adresse[1]}</Text>
                  <Text style={styles.tel}>Tél. {b.telephone}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null
      }
    />
  );
}
