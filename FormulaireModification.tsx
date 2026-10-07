"use client";

import React, { useEffect, useRef, useState } from "react";
import { Document, Image as PDFImage, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle, Clock, FileDown, HeartPulse, Home, Mail, Send } from "lucide-react";
import { IconeChargement } from "./app/Chargement";
import { EnteteFormulaire, EtapesFormulaire } from "./app/formulaires/Charte";
import { COMMISSIONS_PARITAIRES, CP_AUTRE, CP_INCONNUE } from "./lib/commissions-paritaires";
import { formatDateFr } from "./lib/dates";
import { insererDemande } from "./lib/insertion-demande";
import {
  CHANGEMENTS,
  ETAPES,
  FORM_VIDE,
  INFOS_CHANGEMENT,
  LIBELLES_SITUATION,
  MENTION_COTISATION,
  MESSAGES_TRANSFERT,
  depuisLigne,
  formaterNiss,
  nomFichierModification,
  recapitulatif,
  statutTransfert,
  validerEtape,
  versLigne,
  type Changement,
  type ChampModification,
  type Erreurs,
  type FormModification,
  type Situation,
  type Transfert,
} from "./lib/modification";
import { BureauxPdf } from "./lib/pdf/BureauxPdf";
import { PDF_COULEURS, enregistrerPolicesPdf } from "./lib/pdf/charte";
import { postJson } from "./lib/post-json";
import { useOnceSubmit } from "./lib/use-once-submit";

/**
 * Formulaire « Signaler un changement » (/changement-situation) : adresse, e-mail ou téléphone,
 * employeur, régime de travail, situation professionnelle. 4 étapes, PDF signé (charte « Registre »),
 * enregistrement dans web_modifications puis e-mail à l'affilié et à l'administration
 * (/api/send-modification). Règles et libellés : lib/modification.ts.
 */

const ICONES: Record<Changement, React.ReactNode> = {
  adresse: <Home size={22} aria-hidden />,
  contact: <Mail size={22} aria-hidden />,
  employeur: <Briefcase size={22} aria-hidden />,
  regime: <Clock size={22} aria-hidden />,
  situation: <HeartPulse size={22} aria-hidden />,
};

function aujourdhui(): string {
  const p = new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date());
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${v("day")}/${v("month")}/${v("year")}`;
}

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

function blobEnBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
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

async function produirePdf(data: FormModification, dateDocument: Date): Promise<Blob> {
  enregistrerPolicesPdf(window.location.origin);
  const logoBase64 = await fetchLogoBase64().catch(() => "");
  return pdf(<ModificationPDF data={data} logoBase64={logoBase64} dateDocument={dateDocument} />).toBlob();
}

/** Back-office : PDF d'une demande enregistrée dans web_modifications, daté du jour de la demande. */
export async function genererPdfModificationEnregistree(ligne: Record<string, unknown>): Promise<Blob> {
  const creeLe = typeof ligne.created_at === "string" ? new Date(ligne.created_at) : new Date();
  return produirePdf(depuisLigne(ligne), creeLe);
}

// ── Composants de saisie ─────────────────────────────────────────────────────

function Champ({
  id,
  libelle,
  erreur,
  aide,
  facultatif,
  children,
}: {
  id: string;
  libelle: string;
  erreur?: string;
  aide?: string;
  facultatif?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="form-libelle mb-1.5 block">
        {libelle} {facultatif ? <span className="font-normal">(facultatif)</span> : <span aria-hidden>*</span>}
      </label>
      {aide && <p className="form-aide mb-1.5">{aide}</p>}
      {children}
      {erreur && (
        <p id={`${id}-erreur`} role="alert" className="form-erreur mt-1.5">
          {erreur}
        </p>
      )}
    </div>
  );
}

const CHAMP = "w-full rounded-xl border px-4 py-2.5";

type Suggestion = { street: string; housenumber: string; postcode: string; city: string; display: string };

/** Rue avec saisie assistée (adresses belges, /api/address-autocomplete). */
function RueAssistee({
  id,
  valeur,
  invalide,
  onChange,
  onChoix,
}: {
  id: string;
  valeur: string;
  invalide: boolean;
  onChange: (v: string) => void;
  onChoix: (s: Suggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cadre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function dehors(e: MouseEvent) {
      if (cadre.current && !cadre.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, []);

  function saisir(v: string) {
    onChange(v);
    if (minuterie.current) clearTimeout(minuterie.current);
    if (v.trim().length < 3) {
      setSuggestions([]);
      setOuvert(false);
      return;
    }
    minuterie.current = setTimeout(async () => {
      setChargement(true);
      try {
        const res = await fetch(`/api/address-autocomplete?q=${encodeURIComponent(v)}`);
        const json = (await res.json()) as { suggestions?: Suggestion[] };
        const liste = (json.suggestions ?? []).slice(0, 6);
        setSuggestions(liste);
        setOuvert(liste.length > 0);
      } catch {
        setSuggestions([]);
        setOuvert(false);
      } finally {
        setChargement(false);
      }
    }, 300);
  }

  return (
    <div ref={cadre} className="relative">
      <input
        id={id}
        className={CHAMP}
        value={valeur}
        onChange={(e) => saisir(e.target.value)}
        placeholder="Rue de la Station"
        autoComplete="off"
        aria-invalid={invalide || undefined}
        aria-describedby={invalide ? `${id}-erreur` : undefined}
      />
      {chargement && (
        <IconeChargement size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-militant-rouge" />
      )}
      {ouvert && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-militant-ardoise bg-white text-[15px] shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={`${s.display}-${i}`}
              onMouseDown={() => {
                onChoix(s);
                setSuggestions([]);
                setOuvert(false);
              }}
              className="cursor-pointer border-b border-militant-ardoise/40 px-4 py-2.5 last:border-0 hover:bg-militant-bordeaux hover:text-white"
            >
              {s.display}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PadSignature({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const trace = useRef(false);

  function position(e: React.MouseEvent | React.TouchEvent) {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    const y = "touches" in e ? e.touches[0].clientY : e.clientY;
    // Le canvas peut être affiché plus petit que sa taille réelle (mobile).
    return { x: ((x - r.left) * c.width) / r.width, y: ((y - r.top) * c.height) / r.height };
  }

  function debut(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    trace.current = true;
    const ctx = canvas.current!.getContext("2d")!;
    const { x, y } = position(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function dessin(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!trace.current) return;
    const ctx = canvas.current!.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#222222";
    const { x, y } = position(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function fin() {
    if (!trace.current) return;
    trace.current = false;
    onSave(canvas.current!.toDataURL("image/png"));
  }

  function effacer() {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    onSave("");
  }

  return (
    <div>
      <canvas
        ref={canvas}
        width={480}
        height={100}
        aria-label="Cadre de signature : dessinez votre signature à la souris ou au doigt"
        className="w-full max-w-[480px] cursor-crosshair rounded-md border border-militant-ardoise bg-white"
        style={{ touchAction: "none" }}
        onMouseDown={debut}
        onMouseMove={dessin}
        onMouseUp={fin}
        onMouseLeave={fin}
        onTouchStart={debut}
        onTouchMove={dessin}
        onTouchEnd={fin}
      />
      <button type="button" onClick={effacer} className="form-btn-retour mt-1 !min-h-[44px] !px-0 text-[15px]">
        Effacer la signature
      </button>
    </div>
  );
}

function EncartTransfert({ cp }: { cp: string }) {
  if (cp === CP_AUTRE) return <p className="form-encart mt-3">{MESSAGES_TRANSFERT.a_organiser}</p>;
  if (cp === CP_INCONNUE) return <p className="form-encart mt-3">{MESSAGES_TRANSFERT.a_verifier}</p>;
  return null;
}

// ── Formulaire ───────────────────────────────────────────────────────────────

type ChampDate = "adresseDepuis" | "contactDepuis" | "employeurDepuis" | "regimeDepuis" | "situationDepuis" | "dateSig";

type Resultat = { pdf: Blob; emailEnvoye: boolean; transfert: Transfert; email: string; nouvelEmail: string; nomFichier: string };

export default function FormulaireModification() {
  const [form, setForm] = useState<FormModification>(FORM_VIDE);
  const [etape, setEtape] = useState(0);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState("");
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const haut = useRef<HTMLDivElement>(null);
  const { acquire, release } = useOnceSubmit();

  // Dates « à partir du » et date de signature pré-remplies au jour (modifiables), dans le navigateur
  // seulement : pas d'écart avec le rendu serveur.
  useEffect(() => {
    const jour = aujourdhui();
    setForm((f) => ({
      ...f,
      adresseDepuis: f.adresseDepuis || jour,
      contactDepuis: f.contactDepuis || jour,
      employeurDepuis: f.employeurDepuis || jour,
      regimeDepuis: f.regimeDepuis || jour,
      situationDepuis: f.situationDepuis || jour,
      dateSig: f.dateSig || jour,
    }));
  }, []);

  function set<K extends ChampModification>(champ: K, valeur: FormModification[K]) {
    setForm((f) => ({ ...f, [champ]: valeur }));
    setErreurs((e) => (e[champ] ? { ...e, [champ]: undefined } : e));
  }

  function basculer(c: Changement) {
    setForm((f) => ({
      ...f,
      changements: f.changements.includes(c) ? f.changements.filter((x) => x !== c) : CHANGEMENTS.filter((x) => x === c || f.changements.includes(x)),
    }));
    setErreurs((e) => ({ ...e, changements: undefined }));
  }

  function remonter() {
    haut.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  /** Erreurs de l'étape ; si elles existent, focus sur le premier champ en erreur. */
  function controler(n: number): boolean {
    const e = validerEtape(n, form);
    setErreurs(e);
    const premier = Object.keys(e)[0];
    if (premier) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`chg-${premier}`);
        el?.focus();
        el?.scrollIntoView({ block: "center" });
      });
      return false;
    }
    return true;
  }

  function suivant() {
    if (!controler(etape)) return;
    setEtape((n) => n + 1);
    remonter();
  }

  function revenir(n: number) {
    setErreurs({});
    setEtape(n);
    remonter();
  }

  async function envoyer() {
    if (!acquire() || envoi) return;
    if (!controler(3)) {
      release();
      return;
    }
    setEnvoi(true);
    setErreurEnvoi("");
    try {
      const blob = await produirePdf(form, new Date());
      const ligne = versLigne(form);
      const { id: demandeId, error } = await insererDemande("web_modifications", ligne);
      if (error) {
        console.error("[changement-situation] enregistrement refusé :", error.code ?? "", error.message);
        throw new Error("Votre demande n'a pas pu être enregistrée. Réessayez dans quelques minutes ; si le problème persiste, appelez l'un de nos bureaux.");
      }

      const nomFichier = nomFichierModification(form.nom, form.prenom);
      let emailEnvoye = true;
      try {
        // La signature n'est pas renvoyée : elle est déjà dans le PDF joint.
        const donnees = { ...ligne, signature: undefined };
        await postJson("/api/send-modification", { donnees, demandeId, pdfBase64: await blobEnBase64(blob), fileName: nomFichier });
      } catch (err) {
        // La demande est enregistrée : on laisse télécharger le PDF même si l'e-mail échoue.
        console.error("[changement-situation] e-mail :", err instanceof Error ? err.message : "erreur");
        emailEnvoye = false;
      }

      setResultat({
        pdf: blob,
        emailEnvoye,
        transfert: statutTransfert(form),
        email: String(ligne.email),
        nouvelEmail: typeof ligne.nouvel_email === "string" ? ligne.nouvel_email : "",
        nomFichier,
      });
      remonter();
    } catch (err) {
      release();
      setErreurEnvoi(err instanceof Error ? err.message : "Une erreur est survenue. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  function telecharger() {
    if (!resultat) return;
    const url = URL.createObjectURL(resultat.pdf);
    const a = document.createElement("a");
    a.href = url;
    a.download = resultat.nomFichier;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Confirmation ──
  if (resultat) {
    return (
      <div ref={haut} className="form-cadre scroll-mt-6">
        <EnteteFormulaire
          icone={<CheckCircle className="h-6 w-6 text-white" />}
          titre="Changement envoyé"
          sousTitre="Merci. Nos services vont mettre votre dossier à jour."
        />
        <div className="form-carte etape-entree space-y-5">
          {resultat.emailEnvoye ? (
            <p className="text-[16px]">
              Une confirmation avec votre document signé a été envoyée à <strong>{resultat.email}</strong>
              {resultat.nouvelEmail && resultat.nouvelEmail !== resultat.email ? (
                <>
                  {" "}et à <strong>{resultat.nouvelEmail}</strong>
                </>
              ) : null}
              .
            </p>
          ) : (
            <p className="form-encart">
              Votre demande est bien enregistrée, mais l&apos;e-mail de confirmation n&apos;a pas pu être envoyé. Téléchargez
              votre document ci-dessous et gardez-le.
            </p>
          )}
          {resultat.transfert !== "non" && (
            <div className="rounded-2xl bg-militant-bordeaux p-5 text-white">
              <p className="font-condensed text-2xl font-extrabold uppercase leading-none">
                {resultat.transfert === "a_organiser" ? "Nous organisons votre transfert" : "Nous vérifions votre secteur"}
              </p>
              <p className="mt-2 text-[16px] leading-relaxed">{MESSAGES_TRANSFERT[resultat.transfert]}</p>
            </div>
          )}
          <button type="button" onClick={telecharger} className="form-btn-principal">
            <FileDown size={18} aria-hidden /> Télécharger mon document (PDF)
          </button>
        </div>
      </div>
    );
  }

  const e = erreurs;
  const attrs = (champ: ChampModification) => ({
    id: `chg-${champ}`,
    "aria-invalid": e[champ] ? true : undefined,
    "aria-describedby": e[champ] ? `chg-${champ}-erreur` : undefined,
  });
  const coche = (c: Changement) => form.changements.includes(c);
  const champDate = (champ: ChampDate, libelle: string) => (
    <Champ id={`chg-${champ}`} libelle={libelle} erreur={e[champ]}>
      <input
        {...attrs(champ)}
        className={`${CHAMP} sm:max-w-[220px]`}
        inputMode="numeric"
        placeholder="jj/mm/aaaa"
        maxLength={10}
        value={form[champ]}
        onChange={(ev) => set(champ, formatDateFr(ev.target.value))}
      />
    </Champ>
  );
  const listeCp = (champ: "employeurCp" | "professionCp") => (
    <>
      <select {...attrs(champ)} className={CHAMP} value={form[champ]} onChange={(ev) => set(champ, ev.target.value)}>
        {[...COMMISSIONS_PARITAIRES]
          .sort((a, b) => (a.id === CP_INCONNUE ? -1 : b.id === CP_INCONNUE ? 1 : 0))
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
      </select>
      <EncartTransfert cp={form[champ]} />
    </>
  );
  const recap = etape === 3 ? recapitulatif(form) : [];
  const transfert = etape === 3 ? statutTransfert(form) : "non";

  return (
    <div ref={haut} className="form-cadre scroll-mt-6">
      <EnteteFormulaire
        titre="Signaler un changement"
        sousTitre="Adresse, contact, employeur, régime de travail ou situation professionnelle : prévenez-nous en quelques minutes."
      />
      <EtapesFormulaire libelles={[...ETAPES]} courant={etape} onRevenir={revenir} />

      <form
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          if (etape < 3) suivant();
          else void envoyer();
        }}
        className="form-carte"
      >
        <div key={etape} className="etape-entree space-y-5">
          {/* ── Étape 1 : Vous ── */}
          {etape === 0 && (
            <>
              <h2 className="form-section !mt-0">Vous</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Champ id="chg-nom" libelle="Nom" erreur={e.nom}>
                  <input {...attrs("nom")} className={CHAMP} autoComplete="family-name" value={form.nom} onChange={(ev) => set("nom", ev.target.value)} />
                </Champ>
                <Champ id="chg-prenom" libelle="Prénom" erreur={e.prenom}>
                  <input {...attrs("prenom")} className={CHAMP} autoComplete="given-name" value={form.prenom} onChange={(ev) => set("prenom", ev.target.value)} />
                </Champ>
              </div>
              <Champ id="chg-niss" libelle="N° de registre national" erreur={e.niss} aide="Au dos de votre carte d'identité : 11 chiffres.">
                <input
                  {...attrs("niss")}
                  className={CHAMP}
                  inputMode="numeric"
                  placeholder="85.04.12-123.45"
                  maxLength={15}
                  value={form.niss}
                  onChange={(ev) => set("niss", formaterNiss(ev.target.value))}
                />
              </Champ>
              <Champ id="chg-email" libelle="E-mail" erreur={e.email} aide="Votre adresse actuelle : vous y recevrez la confirmation.">
                <input {...attrs("email")} type="email" className={CHAMP} autoComplete="email" value={form.email} onChange={(ev) => set("email", ev.target.value)} />
              </Champ>
            </>
          )}

          {/* ── Étape 2 : Ce qui change ── */}
          {etape === 1 && (
            <fieldset aria-describedby={e.changements ? "chg-changements-erreur" : undefined}>
              <legend className="form-section !mt-0">Ce qui change</legend>
              <p className="form-aide mb-4">Cochez tout ce qui vous concerne. Plusieurs choix possibles.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {CHANGEMENTS.map((c, i) => (
                  <label
                    key={c}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
                      coche(c) ? "border-militant-bordeaux" : "border-militant-ardoise/60 hover:border-militant-charbon"
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={i === 0 ? "chg-changements" : undefined}
                      checked={coche(c)}
                      onChange={() => basculer(c)}
                      className="mt-1"
                    />
                    <span className={coche(c) ? "text-militant-bordeaux" : ""}>{ICONES[c]}</span>
                    <span>
                      <span className="block text-[16px] font-bold">{INFOS_CHANGEMENT[c].titre}</span>
                      <span className="mt-0.5 block text-[14px] leading-snug">{INFOS_CHANGEMENT[c].description}</span>
                    </span>
                  </label>
                ))}
              </div>
              {e.changements && (
                <p id="chg-changements-erreur" role="alert" className="form-erreur mt-3">
                  {e.changements}
                </p>
              )}
              <p className="form-aide mt-5">
                Changement de compte bancaire ?{" "}
                <a href="/mandat-sepa" className="font-semibold text-militant-bordeaux underline decoration-militant-rouge underline-offset-2">
                  Utilisez le formulaire Mandat SEPA
                </a>
                .
              </p>
            </fieldset>
          )}

          {/* ── Étape 3 : Le détail ── */}
          {etape === 2 && (
            <>
              {coche("adresse") && (
                <section className="space-y-4" aria-labelledby="titre-adresse">
                  <h2 id="titre-adresse" className="form-section !mt-0">Nouvelle adresse</h2>
                  <div className="grid gap-4 sm:grid-cols-[1fr_110px_110px]">
                    <Champ id="chg-adresseRue" libelle="Rue" erreur={e.adresseRue}>
                      <RueAssistee
                        id="chg-adresseRue"
                        valeur={form.adresseRue}
                        invalide={Boolean(e.adresseRue)}
                        onChange={(v) => set("adresseRue", v)}
                        onChoix={(s) => {
                          setForm((f) => ({
                            ...f,
                            adresseRue: s.street,
                            adresseNumero: s.housenumber || f.adresseNumero,
                            adresseCodePostal: s.postcode || f.adresseCodePostal,
                            adresseLocalite: s.city || f.adresseLocalite,
                          }));
                          setErreurs((x) => ({ ...x, adresseRue: undefined, adresseNumero: undefined, adresseCodePostal: undefined, adresseLocalite: undefined }));
                        }}
                      />
                    </Champ>
                    <Champ id="chg-adresseNumero" libelle="N°" erreur={e.adresseNumero}>
                      <input {...attrs("adresseNumero")} className={CHAMP} value={form.adresseNumero} onChange={(ev) => set("adresseNumero", ev.target.value)} />
                    </Champ>
                    <Champ id="chg-adresseBoite" libelle="Boîte" erreur={e.adresseBoite} facultatif>
                      <input {...attrs("adresseBoite")} className={CHAMP} value={form.adresseBoite} onChange={(ev) => set("adresseBoite", ev.target.value)} />
                    </Champ>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                    <Champ id="chg-adresseCodePostal" libelle="Code postal" erreur={e.adresseCodePostal}>
                      <input
                        {...attrs("adresseCodePostal")}
                        className={CHAMP}
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="6800"
                        value={form.adresseCodePostal}
                        onChange={(ev) => set("adresseCodePostal", ev.target.value.replace(/\D/g, ""))}
                      />
                    </Champ>
                    <Champ id="chg-adresseLocalite" libelle="Localité" erreur={e.adresseLocalite}>
                      <input {...attrs("adresseLocalite")} className={CHAMP} value={form.adresseLocalite} onChange={(ev) => set("adresseLocalite", ev.target.value)} />
                    </Champ>
                  </div>
                  {champDate("adresseDepuis", "À partir du")}
                </section>
              )}

              {coche("contact") && (
                <section className="space-y-4" aria-labelledby="titre-contact">
                  <h2 id="titre-contact" className="form-section">E-mail ou téléphone</h2>
                  <p className="form-aide">Remplissez ce qui change : l&apos;un, l&apos;autre ou les deux.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Champ id="chg-nouvelEmail" libelle="Nouvel e-mail" erreur={e.nouvelEmail} facultatif>
                      <input {...attrs("nouvelEmail")} type="email" className={CHAMP} autoComplete="email" value={form.nouvelEmail} onChange={(ev) => set("nouvelEmail", ev.target.value)} />
                    </Champ>
                    <Champ id="chg-nouveauTelephone" libelle="Nouveau téléphone" erreur={e.nouveauTelephone} facultatif>
                      <input
                        {...attrs("nouveauTelephone")}
                        type="tel"
                        className={CHAMP}
                        autoComplete="tel"
                        placeholder="0470 12 34 56"
                        value={form.nouveauTelephone}
                        onChange={(ev) => set("nouveauTelephone", ev.target.value)}
                      />
                    </Champ>
                  </div>
                  {champDate("contactDepuis", "À partir du")}
                </section>
              )}

              {coche("employeur") && (
                <section className="space-y-4" aria-labelledby="titre-employeur">
                  <h2 id="titre-employeur" className="form-section">Nouvel employeur</h2>
                  <Champ id="chg-employeurNom" libelle="Nom de l'employeur" erreur={e.employeurNom}>
                    <input {...attrs("employeurNom")} className={CHAMP} autoComplete="organization" value={form.employeurNom} onChange={(ev) => set("employeurNom", ev.target.value)} />
                  </Champ>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Champ
                      id="chg-employeurOnssTva"
                      libelle="N° ONSS ou n° d'entreprise (TVA)"
                      erreur={e.employeurOnssTva}
                      aide="Si possible : sur votre fiche de paie ou votre contrat."
                      facultatif
                    >
                      <input {...attrs("employeurOnssTva")} className={CHAMP} maxLength={30} value={form.employeurOnssTva} onChange={(ev) => set("employeurOnssTva", ev.target.value)} />
                    </Champ>
                    <Champ id="chg-employeurLocalite" libelle="Localité" erreur={e.employeurLocalite} aide="Où se trouve votre lieu de travail." facultatif>
                      <input {...attrs("employeurLocalite")} className={CHAMP} value={form.employeurLocalite} onChange={(ev) => set("employeurLocalite", ev.target.value)} />
                    </Champ>
                  </div>
                  <Champ
                    id="chg-employeurCp"
                    libelle="Commission paritaire"
                    erreur={e.employeurCp}
                    aide="Si vous la connaissez : elle figure sur votre fiche de paie."
                    facultatif
                  >
                    {listeCp("employeurCp")}
                  </Champ>
                  {champDate("employeurDepuis", "Date d'entrée")}
                </section>
              )}

              {coche("regime") && (
                <section className="space-y-4" aria-labelledby="titre-regime">
                  <h2 id="titre-regime" className="form-section">Régime de travail</h2>
                  <fieldset aria-describedby={e.regime ? "chg-regime-erreur" : undefined}>
                    <legend className="form-libelle mb-2">
                      Vous travaillez désormais à <span aria-hidden>*</span>
                    </legend>
                    <div className="flex flex-wrap gap-x-8 gap-y-1">
                      {(["temps_plein", "temps_partiel"] as const).map((r, i) => (
                        <label key={r} className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[16px]">
                          <input
                            type="radio"
                            name="regime"
                            id={i === 0 ? "chg-regime" : undefined}
                            checked={form.regime === r}
                            onChange={() => set("regime", r)}
                          />
                          {r === "temps_plein" ? "Temps plein" : "Temps partiel"}
                        </label>
                      ))}
                    </div>
                    {e.regime && (
                      <p id="chg-regime-erreur" role="alert" className="form-erreur mt-1.5">
                        {e.regime}
                      </p>
                    )}
                  </fieldset>
                  {form.regime === "temps_partiel" && (
                    <Champ id="chg-regimeHeures" libelle="Nombre d'heures par semaine, en moyenne" erreur={e.regimeHeures} aide="Par exemple 19 pour un mi-temps, ou 30,4 pour un 4/5.">
                      <div className="flex items-center gap-3">
                        <input
                          {...attrs("regimeHeures")}
                          className={`${CHAMP} max-w-[120px]`}
                          inputMode="decimal"
                          maxLength={4}
                          value={form.regimeHeures}
                          onChange={(ev) => set("regimeHeures", ev.target.value.replace(/[^\d.,]/g, ""))}
                        />
                        <span className="text-[16px]">heures / semaine</span>
                      </div>
                    </Champ>
                  )}
                  {champDate("regimeDepuis", "À partir du")}
                  <p className="form-aide">{MENTION_COTISATION}</p>
                </section>
              )}

              {coche("situation") && (
                <section className="space-y-4" aria-labelledby="titre-situation">
                  <h2 id="titre-situation" className="form-section">Situation professionnelle</h2>
                  <fieldset aria-describedby={e.situation ? "chg-situation-erreur" : undefined}>
                    <legend className="form-libelle mb-2">
                      Votre nouvelle situation <span aria-hidden>*</span>
                    </legend>
                    <div className="space-y-1">
                      {(Object.keys(LIBELLES_SITUATION) as Exclude<Situation, "">[]).map((s, i) => (
                        <label key={s} className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[16px]">
                          <input
                            type="radio"
                            name="situation"
                            id={i === 0 ? "chg-situation" : undefined}
                            checked={form.situation === s}
                            onChange={() => set("situation", s)}
                          />
                          {LIBELLES_SITUATION[s]}
                        </label>
                      ))}
                    </div>
                    {e.situation && (
                      <p id="chg-situation-erreur" role="alert" className="form-erreur mt-1.5">
                        {e.situation}
                      </p>
                    )}
                  </fieldset>
                  {form.situation === "profession" && (
                    <>
                      <Champ id="chg-profession" libelle="Votre nouvelle profession" erreur={e.profession}>
                        <input
                          {...attrs("profession")}
                          className={CHAMP}
                          placeholder="Ex. : maçon, aide-soignante, magasinier…"
                          value={form.profession}
                          onChange={(ev) => set("profession", ev.target.value)}
                        />
                      </Champ>
                      <Champ
                        id="chg-professionCp"
                        libelle="Commission paritaire"
                        erreur={e.professionCp}
                        aide="Si vous la connaissez : elle figure sur votre fiche de paie. Choisissez « 000 - Autre » si elle n'est pas dans la liste."
                        facultatif
                      >
                        {listeCp("professionCp")}
                      </Champ>
                    </>
                  )}
                  {champDate("situationDepuis", "À partir du")}
                </section>
              )}
            </>
          )}

          {/* ── Étape 4 : Signature ── */}
          {etape === 3 && (
            <>
              <h2 className="form-section !mt-0">Vérifiez puis signez</h2>
              <div className="divide-y divide-militant-ardoise/50 rounded-xl border border-militant-ardoise">
                <div className="px-4 py-3">
                  <p className="font-condensed text-lg font-extrabold uppercase">Vous</p>
                  <p className="text-[15px]">
                    {form.prenom} {form.nom} · {formaterNiss(form.niss)} · {form.email}
                  </p>
                </div>
                {recap.map((b) => (
                  <div key={b.changement} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-condensed text-lg font-extrabold uppercase">{b.titre}</p>
                      <button type="button" onClick={() => revenir(2)} className="text-[14px] font-semibold underline decoration-militant-rouge underline-offset-2">
                        Modifier
                      </button>
                    </div>
                    <dl className="mt-1 space-y-0.5 text-[15px]">
                      {b.lignes.map(([l, v]) => (
                        <div key={l} className="flex flex-wrap gap-x-2">
                          <dt className="font-semibold">{l} :</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
              {transfert !== "non" && <p className="form-encart">{MESSAGES_TRANSFERT[transfert]}</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                {champDate("dateSig", "Date")}
                <Champ id="chg-lieu" libelle="Lieu" erreur={e.lieu}>
                  <input {...attrs("lieu")} className={CHAMP} placeholder="Namur" value={form.lieu} onChange={(ev) => set("lieu", ev.target.value)} />
                </Champ>
              </div>
              <div>
                <p id="chg-signature" tabIndex={-1} className="form-libelle mb-1.5">
                  Signature <span aria-hidden>*</span>
                </p>
                <p className="form-aide mb-2">Dessinez votre signature dans le cadre, à la souris ou au doigt.</p>
                <PadSignature onSave={(url) => set("signature", url)} />
                {e.signature && (
                  <p role="alert" className="form-erreur mt-1.5">
                    {e.signature}
                  </p>
                )}
              </div>
              <p className="border-t border-militant-ardoise pt-5 text-[14px] leading-relaxed">
                Vos données personnelles sont traitées conformément au règlement européen RGPD.{" "}
                <a
                  href="https://www.accg.be/fr/protection-de-la-vie-privee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-militant-bordeaux underline decoration-militant-rouge underline-offset-2"
                >
                  Politique de confidentialité
                </a>
              </p>
              {erreurEnvoi && (
                <p role="alert" className="form-encart">
                  {erreurEnvoi}
                </p>
              )}
            </>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="form-btn-retour" disabled={etape === 0 || envoi} onClick={() => revenir(etape - 1)}>
            <ArrowLeft size={18} aria-hidden /> Retour
          </button>
          {etape < 3 ? (
            <button type="submit" className="form-btn-principal">
              Continuer <ArrowRight size={18} aria-hidden />
            </button>
          ) : (
            <button type="submit" className="form-btn-principal" disabled={envoi}>
              {envoi ? (
                <>
                  <IconeChargement size={18} /> Envoi en cours…
                </>
              ) : (
                <>
                  <Send size={18} aria-hidden /> Envoyer mon changement
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
