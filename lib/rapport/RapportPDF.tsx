import React from "react";
import { Circle, Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { isoToDateFr } from "../dates";
import { partsCamembert, type ActionRapport, type Bilan } from "./bilan";

// ── Palette stricte et typographie ────────────────────────────────────────────
const C = {
  rouge: "#E32119",
  bordeaux: "#AA0F33",
  charbon: "#222222",
  blanc: "#FFFFFF",
  ardoise: "#7C90A0",
};
/** Ordre fixe des parts du camembert (validé : séparation daltonisme et contraste OK). */
const COULEURS_PARTS = [C.charbon, C.rouge, C.ardoise, C.bordeaux];

let policesEnregistrees = false;
/** Barlow / Barlow Condensed servies depuis /public/fonts (licence OFL). */
export function enregistrerPolices(origine: string) {
  if (policesEnregistrees) return;
  Font.register({
    family: "Barlow",
    fonts: [
      { src: `${origine}/fonts/barlow-400.woff`, fontWeight: 400 },
      { src: `${origine}/fonts/barlow-400-italic.woff`, fontWeight: 400, fontStyle: "italic" },
      { src: `${origine}/fonts/barlow-600.woff`, fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Barlow Condensed",
    fonts: [
      { src: `${origine}/fonts/barlow-condensed-600.woff`, fontWeight: 600 },
      { src: `${origine}/fonts/barlow-condensed-800.woff`, fontWeight: 800 },
    ],
  });
  // Pas de césure automatique au milieu des mots.
  Font.registerHyphenationCallback((mot) => [mot]);
  policesEnregistrees = true;
}

const s = StyleSheet.create({
  page: {
    fontFamily: "Barlow",
    fontSize: 10,
    lineHeight: 1.45,
    color: C.charbon,
    paddingTop: 62,
    paddingBottom: 56,
    paddingHorizontal: 50,
  },
  entete: {
    position: "absolute",
    top: 24,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.75,
    borderBottomColor: C.ardoise,
    paddingBottom: 5,
    fontSize: 8,
  },
  // Positionné depuis le haut : "bottom" place le pied hors page avec react-pdf (A4 = 842 pt de haut).
  pied: { position: "absolute", top: 808, fontSize: 8 },
  h1: { fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 30, lineHeight: 1 },
  filetTitre: { width: 44, height: 5, backgroundColor: C.rouge, marginTop: 8, marginBottom: 18 },
  h2: { fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 17, marginBottom: 8, marginTop: 20 },
  petit: { fontSize: 8.5 },
});

// ── Utilitaires ──────────────────────────────────────────────────────────────
const nf = new Intl.NumberFormat("fr-BE");
/** Nombre formaté ; espace fine insécable remplacée par une insécable (présente dans la police). */
const nombre = (n: number) => nf.format(n).replace(/ /g, " ");
const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)} %` : "0 %");
/** Retire les emojis (absents des polices du PDF). */
const sansEmoji = (t: string) =>
  t
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n|\n[ \t]+/g, "\n")
    .trim();

function titreAction(a: ActionRapport): string {
  if (a.nom?.trim()) return a.nom.trim();
  return typeLisible(a);
}
function typeLisible(a: ActionRapport): string {
  const t = a.type_action === "autre" ? a.type_action_autre?.trim() || "autre action" : a.type_action;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function frontCommunLisible(a: ActionRapport): string {
  if (!a.front_commun) return "Non";
  const allies = [a.front_commun_csc && "la CSC", a.front_commun_synova && "Synova"].filter(Boolean);
  return allies.length ? `Oui, avec ${allies.join(" et ")}` : "Oui";
}
function participantsLisible(a: ActionRapport): string | null {
  if (a.participants_total == null && a.participants_centrale == null) return null;
  const total = a.participants_total != null ? nombre(a.participants_total) : "non renseigné";
  return a.participants_centrale != null
    ? `${total} (dont ${nombre(a.participants_centrale)} de la Centrale)`
    : total;
}

// ── Document ─────────────────────────────────────────────────────────────────
export type ParametresRapport = {
  debut: string; // aaaa-mm-jj
  fin: string;
  genereLe: string; // jj/mm/aaaa
  origine: string; // URL du site (logo)
};

export default function RapportPDF({
  actions,
  bilan,
  p,
}: {
  actions: ActionRapport[];
  bilan: Bilan;
  p: ParametresRapport;
}) {
  const periode = `du ${isoToDateFr(p.debut)} au ${isoToDateFr(p.fin)}`;
  const parAnnee = new Map<string, ActionRapport[]>();
  for (const a of actions) {
    const annee = a.date_action.slice(0, 4);
    parAnnee.set(annee, [...(parAnnee.get(annee) ?? []), a]);
  }

  const cadre = (
    <>
      <View style={s.entete} fixed>
        <Text>Rapport d&apos;activité {periode}</Text>
        <Text>Centrale Générale FGTB Namur-Luxembourg</Text>
      </View>
      <Text style={[s.pied, { left: 50 }]} fixed>
        Document généré le {p.genereLe}
      </Text>
      <Text
        style={[s.pied, { right: 50, textAlign: "right" }]}
        fixed
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
    </>
  );

  return (
    <Document
      title={`Rapport d'activité ${periode}`}
      author="Centrale Générale FGTB Namur-Luxembourg"
      language="fr-BE"
    >
      {/* ── Page de garde ── */}
      <Page size="A4" style={{ backgroundColor: C.charbon, color: C.blanc, fontFamily: "Barlow", padding: 0 }}>
        <View style={{ height: 14, backgroundColor: C.rouge }} />
        <View style={{ flexGrow: 1, paddingHorizontal: 56, paddingTop: 64, paddingBottom: 56, justifyContent: "space-between" }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- composant PDF, pas d'attribut alt */}
          <Image src={`${p.origine}/Logo%20CG%20Blanc.png`} style={{ width: 170 }} />
          <View>
            <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 64, lineHeight: 0.95 }}>
              Rapport{"\n"}d&apos;activité
            </Text>
            <View style={{ width: 70, height: 7, backgroundColor: C.rouge, marginTop: 22, marginBottom: 22 }} />
            <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 22 }}>
              Actions syndicales {periode}
            </Text>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: C.ardoise, paddingTop: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>Centrale Générale FGTB Namur-Luxembourg</Text>
            <Text style={{ fontSize: 9.5, color: C.ardoise, marginTop: 4 }}>
              Rapport de congrès. Document généré le {p.genereLe}.
            </Text>
          </View>
        </View>
      </Page>

      {/* ── Bilan en chiffres ── */}
      <Page size="A4" style={s.page}>
        {cadre}
        <Text style={s.h1}>Bilan en chiffres</Text>
        <View style={s.filetTitre} />

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chiffre valeur={nombre(bilan.total)} libelle={bilan.total > 1 ? "actions menées" : "action menée"} />
          <Chiffre valeur={nombre(bilan.participantsTotal)} libelle="participants au total" />
          <Chiffre valeur={nombre(bilan.participantsCentrale)} libelle="participants de la Centrale" />
          <Chiffre
            valeur={nombre(bilan.frontCommun.total)}
            libelle={`en front commun (${pct(bilan.frontCommun.total, bilan.total)})`}
          />
        </View>
        <Text style={[s.petit, { marginTop: 6 }]}>
          Participants : cumul des nombres encodés pour {bilan.actionsAvecParticipants} action
          {bilan.actionsAvecParticipants > 1 ? "s" : ""} sur {bilan.total}.
        </Text>

        <Text style={s.h2}>Front commun</Text>
        <Tableau
          colonnes={["Actions en front commun", "Nombre", "Part des actions"]}
          lignes={[
            ["Au total", nombre(bilan.frontCommun.total), pct(bilan.frontCommun.total, bilan.total)],
            ["Avec la CSC", nombre(bilan.frontCommun.csc), pct(bilan.frontCommun.csc, bilan.total)],
            ["Avec Synova", nombre(bilan.frontCommun.synova), pct(bilan.frontCommun.synova, bilan.total)],
            ["Avec la CSC et Synova", nombre(bilan.frontCommun.lesDeux), pct(bilan.frontCommun.lesDeux, bilan.total)],
          ]}
        />

        <View wrap={false}>
          <Text style={s.h2}>Répartition par type d&apos;action</Text>
          <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
            <Camembert parts={partsCamembert(bilan.parType)} total={bilan.total} />
            <View style={{ flex: 1 }}>
              <Tableau
                colonnes={["Type", "Actions", "Part"]}
                lignes={bilan.parType.map((t) => [t.libelle, nombre(t.nombre), pct(t.nombre, bilan.total)])}
              />
            </View>
          </View>
        </View>
      </Page>

      {/* ── Secteurs et évolution ── */}
      <Page size="A4" style={s.page}>
        {cadre}
        <Text style={s.h1}>Secteurs et évolution</Text>
        <View style={s.filetTitre} />

        <Text style={[s.h2, { marginTop: 0 }]}>Actions par secteur</Text>
        <BarresHorizontales donnees={bilan.parSecteur} total={bilan.total} />

        <View wrap={false}>
          <Text style={s.h2}>Évolution du nombre d&apos;actions par année</Text>
          <BarresVerticales donnees={bilan.parAnnee} />
        </View>
      </Page>

      {/* ── Chronologie détaillée ── */}
      <Page size="A4" style={s.page}>
        {cadre}
        <Text style={s.h1}>Chronologie détaillée</Text>
        <View style={s.filetTitre} />
        {[...parAnnee].map(([annee, liste], i) => (
          <View key={annee} break={i > 0}>
            <View
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 12, marginTop: i > 0 ? 0 : 4 }}
              minPresenceAhead={160}
            >
              <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 34, color: C.rouge, lineHeight: 1 }}>
                {annee}
              </Text>
              <View style={{ flexGrow: 1, height: 2, backgroundColor: C.charbon, marginBottom: 7 }} />
              <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                {liste.length} action{liste.length > 1 ? "s" : ""}
              </Text>
            </View>
            {liste.map((a) => (
              <FicheAction key={a.id} a={a} />
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

// ── Composants ───────────────────────────────────────────────────────────────
function Chiffre({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.charbon, color: C.blanc, padding: 10, paddingBottom: 12 }}>
      <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 28, lineHeight: 1 }}>{valeur}</Text>
      <View style={{ width: 22, height: 3, backgroundColor: C.rouge, marginTop: 6, marginBottom: 5 }} />
      <Text style={{ fontSize: 8.5, lineHeight: 1.3 }}>{libelle}</Text>
    </View>
  );
}

function Tableau({ colonnes, lignes }: { colonnes: string[]; lignes: string[][] }) {
  return (
    <View style={{ borderTopWidth: 2, borderTopColor: C.charbon }}>
      <View style={{ flexDirection: "row", backgroundColor: C.charbon, color: C.blanc }}>
        {colonnes.map((c, i) => (
          <Text
            key={c}
            style={{ flex: i === 0 ? 3 : 1.2, paddingVertical: 4, paddingHorizontal: 6, fontWeight: 600, fontSize: 9, textAlign: i === 0 ? "left" : "right" }}
          >
            {c}
          </Text>
        ))}
      </View>
      {lignes.map((l, k) => (
        <View key={k} style={{ flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: C.ardoise }} wrap={false}>
          {l.map((v, i) => (
            <Text
              key={i}
              style={{ flex: i === 0 ? 3 : 1.2, paddingVertical: 4, paddingHorizontal: 6, fontSize: 9.5, textAlign: i === 0 ? "left" : "right", fontWeight: i === 0 ? 400 : 600 }}
            >
              {v}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Camembert : parts séparées par un liseré blanc, légende avec nombre et pourcentage. */
function Camembert({ parts, total }: { parts: { libelle: string; nombre: number }[]; total: number }) {
  const R = 70;
  const CX = 75;
  let angle = -Math.PI / 2;
  const tranches = parts.map((p, i) => {
    const debut = angle;
    const fin = angle + (p.nombre / total) * Math.PI * 2;
    angle = fin;
    const [x1, y1] = [CX + R * Math.cos(debut), CX + R * Math.sin(debut)];
    const [x2, y2] = [CX + R * Math.cos(fin), CX + R * Math.sin(fin)];
    const grand = fin - debut > Math.PI ? 1 : 0;
    return { ...p, couleur: COULEURS_PARTS[i % COULEURS_PARTS.length], d: `M ${CX} ${CX} L ${x1} ${y1} A ${R} ${R} 0 ${grand} 1 ${x2} ${y2} Z` };
  });

  return (
    <View style={{ width: 150 }}>
      <Svg width={150} height={150} viewBox="0 0 150 150">
        {tranches.length === 1 ? (
          <Circle cx={CX} cy={CX} r={R} fill={tranches[0].couleur} />
        ) : (
          tranches.map((t) => <Path key={t.libelle} d={t.d} fill={t.couleur} stroke={C.blanc} strokeWidth={2} />)
        )}
      </Svg>
      <View style={{ marginTop: 8, gap: 3 }}>
        {tranches.map((t) => (
          <View key={t.libelle} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 9, height: 9, backgroundColor: t.couleur }} />
            <Text style={{ fontSize: 8.5, flex: 1 }}>
              {t.libelle} : {pct(t.nombre, total)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BarresHorizontales({ donnees, total }: { donnees: { libelle: string; nombre: number }[]; total: number }) {
  const max = Math.max(1, ...donnees.map((d) => d.nombre));
  return (
    <View style={{ gap: 5 }}>
      {donnees.map((d) => (
        <View key={d.libelle} style={{ flexDirection: "row", alignItems: "center", gap: 8 }} wrap={false}>
          <Text style={{ width: 150, fontSize: 9.5, textAlign: "right" }}>{d.libelle}</Text>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: `${(d.nombre / max) * 85}%`, height: 13, backgroundColor: C.rouge, borderTopRightRadius: 2, borderBottomRightRadius: 2 }} />
            <Text style={{ fontSize: 9.5, fontWeight: 600 }}>
              {nombre(d.nombre)} ({pct(d.nombre, total)})
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function BarresVerticales({ donnees }: { donnees: { annee: number; nombre: number }[] }) {
  const max = Math.max(1, ...donnees.map((d) => d.nombre));
  const HAUTEUR = 150;
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, height: HAUTEUR + 18, borderBottomWidth: 1.5, borderBottomColor: C.charbon }}>
        {donnees.map((d) => (
          <View key={d.annee} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
            <Text style={{ fontSize: 10, fontWeight: 600, marginBottom: 3 }}>{nombre(d.nombre)}</Text>
            <View
              style={{
                width: "62%",
                height: Math.max((d.nombre / max) * HAUTEUR, d.nombre ? 2 : 0),
                backgroundColor: C.rouge,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        {donnees.map((d) => (
          <Text key={d.annee} style={{ flex: 1, textAlign: "center", fontFamily: "Barlow Condensed", fontWeight: 600, fontSize: 12 }}>
            {d.annee}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string | null }) {
  if (!valeur) return null;
  return (
    <View style={{ flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.ardoise, paddingVertical: 2.5 }}>
      <Text style={{ width: 78, fontSize: 8.5, fontWeight: 600 }}>{libelle}</Text>
      <Text style={{ flex: 1, fontSize: 9.5 }}>{valeur}</Text>
    </View>
  );
}

function FicheAction({ a }: { a: ActionRapport }) {
  const description = a.description ? sansEmoji(a.description) : "";
  return (
    <View style={{ marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: C.charbon }}>
      {/* En-tête + photo + fiche : jamais coupés entre deux pages */}
      <View wrap={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 13, color: C.bordeaux }}>
            {isoToDateFr(a.date_action)}
          </Text>
          {/* Badge du type seulement si l'action a un nom (sinon le titre est déjà le type). */}
          {a.nom?.trim() ? (
            <Text style={{ backgroundColor: C.charbon, color: C.blanc, fontSize: 8, fontWeight: 600, paddingHorizontal: 5, paddingVertical: 1.5 }}>
              {typeLisible(a)}
            </Text>
          ) : null}
        </View>
        <Text style={{ fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 18, lineHeight: 1.1, marginTop: 3, marginBottom: 8 }}>
          {titreAction(a)}
        </Text>
        <View style={{ flexDirection: "row", gap: 14 }}>
          {a.photo && (
            // eslint-disable-next-line jsx-a11y/alt-text -- composant PDF, pas d'attribut alt
            <Image src={a.photo} style={{ width: 190, height: 127, objectFit: "cover" }} />
          )}
          <View style={{ flex: 1 }}>
            <Ligne libelle="Ville" valeur={a.ville} />
            <Ligne libelle="Entreprise" valeur={a.entreprise} />
            <Ligne libelle="Secteur" valeur={a.secteur} />
            <Ligne libelle="Participants" valeur={participantsLisible(a)} />
            <Ligne libelle="Front commun" valeur={frontCommunLisible(a)} />
          </View>
        </View>
      </View>
      {description ? (
        <Text style={{ marginTop: 8, fontSize: 9.5, lineHeight: 1.5 }} orphans={3} widows={3}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}
