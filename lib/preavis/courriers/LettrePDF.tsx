import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/** Adresse structurée (module Bpost), partagée entre le formulaire et le rendu PDF. */
export interface Adresse {
  rue: string;
  numero: string;
  codePostal: string;
  ville: string;
  pays: string;
}

export const ADRESSE_VIDE: Adresse = { rue: "", numero: "", codePostal: "", ville: "", pays: "Belgique" };

export function adresseVide(a: Adresse): boolean {
  return !a.rue && !a.codePostal && !a.ville;
}

export function adresseComplete(a: Adresse): string {
  const ligne1 = [a.rue, a.numero].filter(Boolean).join(" ");
  const ligne2 = [a.codePostal, a.ville].filter(Boolean).join(" ");
  return [ligne1, ligne2, a.pays && a.pays !== "Belgique" ? a.pays : ""].filter(Boolean).join(", ");
}

/**
 * Mise en forme d'un courrier belge, réglée sur les annotations manuscrites
 * de l'utilisateur (FGTB) sur un exemplaire imprimé, 2026-08-27 :
 * - blocs expéditeur/destinataire sans interligne superflu entre les lignes ;
 * - le bloc destinataire est empilé sous le bloc expéditeur (pas côte à
 *   côte) et aligné à droite ;
 * - la ligne "Lieu, le Date" est alignée à droite, juste sous le bloc
 *   destinataire ;
 * - les paragraphes du corps ont un interligne plus large (meilleure
 *   lisibilité) ;
 * - la note sur la remise en mains propres est repoussée en bas de page.
 */
const stylesPdf = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 48, paddingHorizontal: 56, fontSize: 10.5, fontFamily: "Helvetica", color: "#111827" },
  entetes: { marginBottom: 6 },
  blocExpediteur: {},
  blocDestinataire: { alignItems: "flex-end", marginTop: 12 },
  ligne: { lineHeight: 1.15 },
  ligneGrasse: { lineHeight: 1.15, fontFamily: "Helvetica-Bold" },
  blocIdentite: { marginBottom: 14 },
  paragraphe: { marginBottom: 14, lineHeight: 1.4 },
  paragrapheGras: { marginBottom: 14, lineHeight: 1.4, fontFamily: "Helvetica-Bold" },
  paragrapheDroite: { marginBottom: 14, lineHeight: 1.4, textAlign: "right" },
  paragrapheCentreGras: { marginBottom: 14, lineHeight: 1.4, textAlign: "center", fontFamily: "Helvetica-Bold" },
  pied: { position: "absolute", bottom: 48, left: 56, right: 56, lineHeight: 1.4 },
});

export interface DonneesLettrePDF {
  /**
   * Blocs d'adresse expéditeur/destinataire façon courrier classique.
   * Absents pour l'Annexe B (convention de commun accord), dont les
   * identités des deux parties font partie intégrante du corps du document.
   */
  entetes: {
    expediteurNom: string;
    expediteurAdresse: Adresse;
    expediteurEmail?: string;
    expediteurTelephone?: string;
    destinataireNom: string;
    destinataireAttention: string;
    destinataireAdresse: Adresse;
  } | null;
  corps: string;
}

/**
 * Découpe le corps (déjà mis en forme par fusion.ts, paragraphes séparés
 * par une ou plusieurs lignes vides) en paragraphes indépendants, pour
 * pouvoir appliquer une mise en forme ciblée (gras, alignement, position) à
 * certaines lignes-clés (date, objet, titre, signature, note de bas de
 * page) sans jamais modifier le texte légal lui-même.
 */
function paragraphes(corps: string): string[] {
  return corps.split(/\n{2,}/);
}

/** "Namur, le 02/09/2026" ou "Fait à Namur, le 21/08/2026." — toute ligne de lieu + date. */
function estLigneDate(texte: string): boolean {
  return /,\s*le\s+\d{2}\/\d{2}\/\d{4}\.?$/.test(texte.trim());
}

function styleParagraphe(texte: string) {
  const t = texte.trim();
  if (estLigneDate(t)) return stylesPdf.paragrapheDroite;
  if (t.startsWith("Concerne :")) return stylesPdf.paragrapheGras;
  if (t === "Convention de rupture de contrat de commun accord") return stylesPdf.paragrapheCentreGras;
  if (t === "Signature") return stylesPdf.paragrapheDroite;
  return stylesPdf.paragraphe;
}

/**
 * Un paragraphe "nom + adresse sur lignes séparées" précédé de "Entre
 * l'employeur :" ou "Et le travailleur :" (Annexe B) est un bloc d'identité
 * au même titre que les blocs expéditeur/destinataire de l'Annexe A : même
 * traitement (nom en gras, lignes sans interligne superflu), pour une mise
 * en forme cohérente sur tous les courriers du module.
 */
function estEnTeteIdentite(paragraphePrecedent: string | undefined): boolean {
  const t = paragraphePrecedent?.trim();
  return t === "Entre l'employeur :" || t === "Et le travailleur :";
}

function BlocIdentite({ texte }: { texte: string }) {
  const lignes = texte.split("\n");
  return (
    <View style={stylesPdf.blocIdentite}>
      {lignes.map((ligne, i) => (
        <Text key={i} style={i === 0 ? stylesPdf.ligneGrasse : stylesPdf.ligne}>
          {ligne}
        </Text>
      ))}
    </View>
  );
}

export function LettrePDF({ donnees }: { donnees: DonneesLettrePDF }) {
  const tousParagraphes = paragraphes(donnees.corps);
  // Repoussée en bas de page (note sur la remise en mains propres, Annexe A) plutôt
  // qu'affichée dans le flux normal du texte, sur demande explicite de l'utilisateur.
  const piedDePage = tousParagraphes.find((p) => p.trim().startsWith("Si l'employeur accepte"));
  const corpsParagraphes = piedDePage ? tousParagraphes.filter((p) => p !== piedDePage) : tousParagraphes;

  return (
    <Document>
      <Page size="A4" style={stylesPdf.page}>
        {donnees.entetes && (
          <View style={stylesPdf.entetes}>
            <View style={stylesPdf.blocExpediteur}>
              {donnees.entetes.expediteurNom && (
                <Text style={stylesPdf.ligneGrasse}>{donnees.entetes.expediteurNom}</Text>
              )}
              {(donnees.entetes.expediteurAdresse.rue || donnees.entetes.expediteurAdresse.numero) && (
                <Text style={stylesPdf.ligne}>
                  {donnees.entetes.expediteurAdresse.rue} {donnees.entetes.expediteurAdresse.numero}
                </Text>
              )}
              {(donnees.entetes.expediteurAdresse.codePostal || donnees.entetes.expediteurAdresse.ville) && (
                <Text style={stylesPdf.ligne}>
                  {donnees.entetes.expediteurAdresse.codePostal} {donnees.entetes.expediteurAdresse.ville}
                </Text>
              )}
              {donnees.entetes.expediteurAdresse.pays && donnees.entetes.expediteurAdresse.pays !== "Belgique" && (
                <Text style={stylesPdf.ligne}>{donnees.entetes.expediteurAdresse.pays}</Text>
              )}
              {donnees.entetes.expediteurEmail && <Text style={stylesPdf.ligne}>{donnees.entetes.expediteurEmail}</Text>}
              {donnees.entetes.expediteurTelephone && (
                <Text style={stylesPdf.ligne}>{donnees.entetes.expediteurTelephone}</Text>
              )}
            </View>

            <View style={stylesPdf.blocDestinataire}>
              {donnees.entetes.destinataireNom && (
                <Text style={stylesPdf.ligneGrasse}>{donnees.entetes.destinataireNom}</Text>
              )}
              <Text style={stylesPdf.ligne}>{donnees.entetes.destinataireAttention}</Text>
              {(donnees.entetes.destinataireAdresse.rue || donnees.entetes.destinataireAdresse.numero) && (
                <Text style={stylesPdf.ligne}>
                  {donnees.entetes.destinataireAdresse.rue} {donnees.entetes.destinataireAdresse.numero}
                </Text>
              )}
              {(donnees.entetes.destinataireAdresse.codePostal || donnees.entetes.destinataireAdresse.ville) && (
                <Text style={stylesPdf.ligne}>
                  {donnees.entetes.destinataireAdresse.codePostal} {donnees.entetes.destinataireAdresse.ville}
                </Text>
              )}
            </View>
          </View>
        )}

        {corpsParagraphes.map((p, i) =>
          estEnTeteIdentite(corpsParagraphes[i - 1]) ? (
            <BlocIdentite key={i} texte={p} />
          ) : (
            <Text key={i} style={styleParagraphe(p)}>
              {p}
            </Text>
          ),
        )}

        {piedDePage && <Text style={stylesPdf.pied}>{piedDePage}</Text>}
      </Page>
    </Document>
  );
}
