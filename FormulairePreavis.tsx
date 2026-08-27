"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, AlertTriangle, RotateCcw, CheckCircle, FileDown } from "lucide-react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { isoToDateFr, formatDateFr, dateFrToIso } from "./lib/dates";
import type { QuiRompt, Statut } from "./lib/preavis/types";
import { calculerPreavisOuvrier } from "./lib/preavis/calcul-preavis";
import { calculerPreavisEmploye } from "./lib/preavis/calcul-preavis-employe";
import { debutPreavisDepuisEnvoi, finPreavisJours, dateLimiteEnvoiRecommande } from "./lib/preavis/dates-preavis";
import { premierLundiApres } from "./lib/preavis/jours-ouvrables";
import {
  genererConventionCommunAccord,
  genererNotificationDemission,
  formaterDureePreavis,
} from "./lib/preavis/courriers/fusion";
import { contenuOnemSanctions } from "./lib/preavis/contenu-onem-sanctions";
import { contenuProceduresEnvoi } from "./lib/preavis/contenu-procedures-envoi";
import type { ContenuInformatif } from "./lib/preavis/types";

/**
 * Les 6 commissions paritaires couvertes par le moteur de calcul (voir
 * lib/preavis/baremes/ouvrier-pre-2014/index.ts). Cette liste doit rester
 * synchronisée avec le registre du moteur.
 */
const COMMISSIONS_PARITAIRES: { code: string; nom: string }[] = [
  { code: "124.00", nom: "Construction (CP 124)" },
  { code: "126.00", nom: "Ameublement et bois (CP 126)" },
  { code: "142.02", nom: "Récupération de métaux (CP 142.02)" },
  { code: "109.00", nom: "Confection et habillement (CP 109)" },
  { code: "128.01", nom: "Tanneries (CP 128.01)" },
  { code: "128.02", nom: "Commerce et industrie du cuir (CP 128.02)" },
];

type RuptureChoix = QuiRompt | "commun-accord";
type ModeEmployeur = "preavis" | "indemnite";
type Etape = "situation" | "complement" | "resultat";

interface DonneesFormulaire {
  statut: Statut;
  dateEntreeService: string; // ISO (AAAA-MM-JJ)
  cp: string; // "" = inconnu / régime général
  ruptureChoix: RuptureChoix;
  modeEmployeur: ModeEmployeur;
  remunerationAnnuelle: string;
  dateRupture: string; // ISO — date de début de préavis souhaitée (démission/licenciement) ou date de fin de contrat (commun accord)
  avecPrestation: "avec" | "sans" | "";
}

const DONNEES_INITIALES: DonneesFormulaire = {
  statut: "ouvrier",
  dateEntreeService: "",
  cp: "",
  ruptureChoix: "travailleur",
  modeEmployeur: "preavis",
  remunerationAnnuelle: "",
  dateRupture: "",
  avecPrestation: "",
};

interface SourceCalcul {
  methode: string;
  lien: string;
}

type Resultat =
  | { type: "commun-accord"; dateFinContratIso: string; avecPrestation: boolean | undefined }
  | { type: "indemnite"; jours: number; montantIndemnite: number | null }
  | {
      type: "preavis";
      quiRompt: QuiRompt;
      jours: number;
      dateDebut: string;
      dateFin: string;
      dateEnvoiLimite: string;
      dateEnvoiDepassee: boolean;
      dateDebutAuPlusTot: string | null;
      avertissement: string | null;
      indemniteCompensatoireJours: number | null;
      source: SourceCalcul;
      contenuProcedures: ContenuInformatif;
      contenuOnem: ContenuInformatif | undefined;
    };

const AVERTISSEMENT_OUVRIER_NON_SOURCE =
  "Ce résultat est incomplet : nous n'avons pas de règle précise pour votre situation avant 2014. Contactez votre secrétariat FGTB pour vérifier votre préavis exact.";

const AVERTISSEMENT_EMPLOYE_INCERTAIN =
  "Ce calcul comporte une estimation non confirmée officiellement (démission, ancienneté avant 2014, rémunération au-dessus du seuil légal). Vérifiez ce point avec votre secrétariat FGTB avant d'envoyer votre lettre.";

const LIEN_SPF_EMPLOYEUR =
  "https://emploi.belgique.be/fr/themes/contrats-de-travail/fin-du-contrat-de-travail/fin-du-contrat-duree-indeterminee-11";
const LIEN_SPF_DEMISSION =
  "https://emploi.belgique.be/fr/themes/contrats-de-travail/fin-du-contrat-de-travail/fin-du-contrat-duree-indeterminee-1";
const LIEN_SPF_EMPLOYE_PRE2014 =
  "https://emploi.belgique.be/fr/themes/contrats-de-travail/fin-du-contrat-de-travail/fin-du-contrat-duree-indeterminee-10";
const LIEN_CCT75 = "https://cnt-nar.be/sites/default/files/documents/CCT-COORD/cct-075.pdf";
const LIEN_ACCG = "https://www.accg.be/fr/secteur/construction/outils/outils-de-calcul/preavis-employeur";

/** Explication courte + lien source, selon le régime effectivement appliqué (design spec §12). */
function determinerSource(
  d: DonneesFormulaire,
  quiRompt: QuiRompt,
  regimeApplique: "cp-specifique" | "cct75-supletif" | "non-source" | null,
): SourceCalcul {
  const lienGeneral = quiRompt === "employeur" ? LIEN_SPF_EMPLOYEUR : LIEN_SPF_DEMISSION;

  if (d.statut === "employe") {
    return {
      methode: "Barème légal général (statut unique) et, pour l'ancienneté avant 2014, règle du seuil de rémunération.",
      lien: d.dateEntreeService < "2014-01-01" ? LIEN_SPF_EMPLOYE_PRE2014 : lienGeneral,
    };
  }
  if (regimeApplique === "cp-specifique") {
    return {
      methode:
        "Barème légal général et régime spécifique de votre commission paritaire pour l'ancienneté avant 2014 (source : Centrale Générale FGTB).",
      lien: LIEN_ACCG,
    };
  }
  if (regimeApplique === "cct75-supletif") {
    return {
      methode: "Barème légal général et régime supplétif (CCT n°75) pour l'ancienneté avant 2014.",
      lien: LIEN_CCT75,
    };
  }
  return { methode: "Barème légal général (statut unique).", lien: lienGeneral };
}

/** Jours de préavis + avertissement + régime appliqué, pour le statut et le mode choisis. */
function calculerJoursEtAvertissement(
  d: DonneesFormulaire,
  quiRompt: QuiRompt,
  dateDebut: string,
  remuneration: number,
): {
  jours: number;
  avertissement: string | null;
  indemniteCompensatoireJours: number | null;
  regimeApplique: "cp-specifique" | "cct75-supletif" | "non-source" | null;
} {
  if (d.statut === "ouvrier") {
    const resultat = calculerPreavisOuvrier({
      cp: d.cp,
      dateEmbauche: d.dateEntreeService,
      dateDebutPreavis: dateDebut,
      quiRompt,
    });
    return {
      jours: resultat.total.jours,
      avertissement: resultat.avertissementNonSource ? AVERTISSEMENT_OUVRIER_NON_SOURCE : null,
      indemniteCompensatoireJours: resultat.indemniteCompensatoire?.jours ?? null,
      regimeApplique: resultat.regimeApplique,
    };
  }

  const resultat = calculerPreavisEmploye({
    dateEmbauche: d.dateEntreeService,
    dateDebutPreavis: dateDebut,
    quiRompt,
    remunerationAnnuelle: remuneration,
  });
  return {
    jours: resultat.total.jours,
    avertissement: resultat.part1DemissionIncertaine ? AVERTISSEMENT_EMPLOYE_INCERTAIN : null,
    indemniteCompensatoireJours: null,
    regimeApplique: null,
  };
}

function calculerResultat(d: DonneesFormulaire): Resultat {
  if (d.ruptureChoix === "commun-accord") {
    const avecPrestation = d.avecPrestation === "" ? undefined : d.avecPrestation === "avec";
    return { type: "commun-accord", dateFinContratIso: d.dateRupture, avecPrestation };
  }

  const quiRompt: QuiRompt = d.ruptureChoix === "employeur" ? "employeur" : "travailleur";
  const remuneration = Number(d.remunerationAnnuelle) || 0;
  // Le préavis démarre toujours un lundi (Art. 37) : on aligne la date souhaitée par
  // l'utilisateur sur le lundi légal correspondant, plutôt que de lui demander de le
  // deviner lui-même.
  const dateDebut = premierLundiApres(d.dateRupture);

  if (quiRompt === "employeur" && d.modeEmployeur === "indemnite") {
    const { jours } = calculerJoursEtAvertissement(d, "employeur", dateDebut, remuneration);
    const semaines = jours / 7;
    const montantIndemnite = remuneration > 0 ? (remuneration / 52) * semaines : null;
    return { type: "indemnite", jours, montantIndemnite };
  }

  const { jours, avertissement, indemniteCompensatoireJours, regimeApplique } = calculerJoursEtAvertissement(
    d,
    quiRompt,
    dateDebut,
    remuneration,
  );
  const dateFin = finPreavisJours(dateDebut, jours);

  // Date limite d'envoi du recommandé pour atteindre ce début de préavis, et
  // vérification que cette date limite n'est pas déjà dépassée par rapport à
  // aujourd'hui (l'utilisateur reste libre de modifier sa date à l'étape précédente).
  const dateEnvoiLimite = dateLimiteEnvoiRecommande(dateDebut);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const dateEnvoiDepassee = dateEnvoiLimite < aujourdHui;
  const dateDebutAuPlusTot = dateEnvoiDepassee ? debutPreavisDepuisEnvoi(aujourdHui) : null;

  return {
    type: "preavis",
    quiRompt,
    jours,
    dateDebut,
    dateFin,
    dateEnvoiLimite,
    dateEnvoiDepassee,
    dateDebutAuPlusTot,
    avertissement,
    indemniteCompensatoireJours,
    source: determinerSource(d, quiRompt, regimeApplique),
    contenuProcedures: contenuProceduresEnvoi(quiRompt),
    contenuOnem: quiRompt === "travailleur" ? contenuOnemSanctions : undefined,
  };
}

const CLASSE_INPUT =
  "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors border-gray-300 focus:ring-red-200";
const CLASSE_LABEL = "block text-sm font-medium text-gray-700 mb-1.5";
const CLASSE_BOUTON_PRIMAIRE =
  "inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const CLASSE_BOUTON_SECONDAIRE =
  "inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

/**
 * Champ date au format JJ/MM/AAAA saisi au clavier (comme dans les autres
 * formulaires de l'application). Préféré au calendrier natif du navigateur,
 * peu pratique pour choisir une date ancienne (ex. une date d'entrée en
 * service remontant à 20 ans).
 */
function ChampDate({
  label,
  valeurIso,
  onChange,
}: {
  label: string;
  valeurIso: string;
  onChange: (iso: string) => void;
}): React.ReactElement {
  const [texte, setTexte] = useState(() => (valeurIso ? isoToDateFr(valeurIso) : ""));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formate = formatDateFr(e.target.value);
    setTexte(formate);
    onChange(dateFrToIso(formate) ?? "");
  }

  return (
    <div>
      <label className={CLASSE_LABEL}>{label}</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="JJ/MM/AAAA"
        className={CLASSE_INPUT}
        value={texte}
        onChange={handleChange}
      />
    </div>
  );
}

function ChampMonnaie({ montant }: { montant: number }): React.ReactElement {
  const formate = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(montant);
  return <>{formate}</>;
}

function BlocInformatif({ contenu }: { contenu: ContenuInformatif }): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      {contenu.sections.map((section) => (
        <div key={section.titre}>
          <h3 className="font-semibold text-gray-900 mb-2">{section.titre}</h3>
          <div className="space-y-1.5">
            {section.phrases.map((phrase, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed">
                {phrase}
              </p>
            ))}
          </div>
        </div>
      ))}
      {contenu.pointsCles.length > 0 && (
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">À retenir</p>
          <ul className="space-y-1">
            {contenu.pointsCles.map((point, i) => (
              <li key={i} className="text-sm text-gray-800 flex gap-2">
                <span className="text-red-600">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-gray-400">Dernière vérification : {isoToDateFr(contenu.derniereVerification)}</p>
    </div>
  );
}

// ─── Adresse (autocomplete Bpost, comme dans les autres formulaires) ──────────

interface AddressSuggestion {
  street: string;
  housenumber: string;
  postcode: string;
  city: string;
  display: string;
}

interface Adresse {
  rue: string;
  numero: string;
  codePostal: string;
  ville: string;
  pays: string;
}

const ADRESSE_VIDE: Adresse = { rue: "", numero: "", codePostal: "", ville: "", pays: "Belgique" };

function adresseVide(a: Adresse): boolean {
  return !a.rue && !a.codePostal && !a.ville;
}

function adresseComplete(a: Adresse): string {
  const ligne1 = [a.rue, a.numero].filter(Boolean).join(" ");
  const ligne2 = [a.codePostal, a.ville].filter(Boolean).join(" ");
  return [ligne1, ligne2, a.pays && a.pays !== "Belgique" ? a.pays : ""].filter(Boolean).join(", ");
}

function ChampAdresse({ valeur, onChange }: { valeur: Adresse; onChange: (a: Adresse) => void }): React.ReactElement {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleRueChange(v: string) {
    onChange({ ...valeur, rue: v });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 3) {
      setSuggestions([]);
      setOuvert(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address-autocomplete?q=${encodeURIComponent(v)}`);
        const json = await res.json();
        const liste = (json.suggestions ?? []) as AddressSuggestion[];
        setSuggestions(liste.slice(0, 6));
        setOuvert(liste.length > 0);
      } catch {
        setSuggestions([]);
        setOuvert(false);
      }
    }, 300);
  }

  function handleSelect(s: AddressSuggestion) {
    onChange({
      rue: s.street || valeur.rue,
      numero: s.housenumber || valeur.numero,
      codePostal: s.postcode || valeur.codePostal,
      ville: s.city || valeur.ville,
      pays: valeur.pays || "Belgique",
    });
    setSuggestions([]);
    setOuvert(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div ref={containerRef} className="relative col-span-2">
          <label className={CLASSE_LABEL}>Rue</label>
          <input
            type="text"
            className={CLASSE_INPUT}
            value={valeur.rue}
            onChange={(e) => handleRueChange(e.target.value)}
            placeholder="Rue de la Loi"
            autoComplete="off"
          />
          {ouvert && suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden text-sm">
              {suggestions.map((s, i) => (
                <li
                  key={`${s.display}-${i}`}
                  onMouseDown={() => handleSelect(s)}
                  className="px-3 py-2 cursor-pointer hover:bg-red-50 border-b border-gray-100 last:border-0"
                >
                  {s.display}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className={CLASSE_LABEL}>Numéro</label>
          <input
            type="text"
            className={CLASSE_INPUT}
            value={valeur.numero}
            onChange={(e) => onChange({ ...valeur, numero: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={CLASSE_LABEL}>Code postal</label>
          <input
            type="text"
            className={CLASSE_INPUT}
            value={valeur.codePostal}
            onChange={(e) => onChange({ ...valeur, codePostal: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <label className={CLASSE_LABEL}>Ville</label>
          <input
            type="text"
            className={CLASSE_INPUT}
            value={valeur.ville}
            onChange={(e) => onChange({ ...valeur, ville: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className={CLASSE_LABEL}>Pays</label>
        <input
          type="text"
          className={CLASSE_INPUT}
          value={valeur.pays}
          onChange={(e) => onChange({ ...valeur, pays: e.target.value })}
        />
      </div>
    </div>
  );
}

// ─── PDF du courrier (mise en forme standard d'un courrier belge) ────────────

const stylesPdf = StyleSheet.create({
  page: { paddingTop: 70, paddingBottom: 60, paddingHorizontal: 60, fontSize: 11, fontFamily: "Helvetica", color: "#111827" },
  bloc: { marginBottom: 26 },
  ligne: { marginBottom: 2, lineHeight: 1.3 },
  corps: { lineHeight: 1.5 },
});

interface DonneesLettrePDF {
  expediteurNom: string;
  expediteurAdresse: Adresse;
  destinataireNom: string;
  destinataireAttention: string;
  destinataireAdresse: Adresse;
  corps: string;
}

function LettrePDF({ donnees }: { donnees: DonneesLettrePDF }) {
  return (
    <Document>
      <Page size="A4" style={stylesPdf.page}>
        <View style={stylesPdf.bloc}>
          {donnees.expediteurNom && <Text style={stylesPdf.ligne}>{donnees.expediteurNom}</Text>}
          {(donnees.expediteurAdresse.rue || donnees.expediteurAdresse.numero) && (
            <Text style={stylesPdf.ligne}>
              {donnees.expediteurAdresse.rue} {donnees.expediteurAdresse.numero}
            </Text>
          )}
          {(donnees.expediteurAdresse.codePostal || donnees.expediteurAdresse.ville) && (
            <Text style={stylesPdf.ligne}>
              {donnees.expediteurAdresse.codePostal} {donnees.expediteurAdresse.ville}
            </Text>
          )}
          {donnees.expediteurAdresse.pays && donnees.expediteurAdresse.pays !== "Belgique" && (
            <Text style={stylesPdf.ligne}>{donnees.expediteurAdresse.pays}</Text>
          )}
        </View>

        <View style={stylesPdf.bloc}>
          {donnees.destinataireNom && <Text style={stylesPdf.ligne}>{donnees.destinataireNom}</Text>}
          <Text style={stylesPdf.ligne}>{donnees.destinataireAttention}</Text>
          {(donnees.destinataireAdresse.rue || donnees.destinataireAdresse.numero) && (
            <Text style={stylesPdf.ligne}>
              {donnees.destinataireAdresse.rue} {donnees.destinataireAdresse.numero}
            </Text>
          )}
          {(donnees.destinataireAdresse.codePostal || donnees.destinataireAdresse.ville) && (
            <Text style={stylesPdf.ligne}>
              {donnees.destinataireAdresse.codePostal} {donnees.destinataireAdresse.ville}
            </Text>
          )}
        </View>

        <Text style={stylesPdf.corps}>{donnees.corps}</Text>
      </Page>
    </Document>
  );
}

// ─── Constructeur de courrier (bloc opt-in à l'étape résultat) ───────────────

type ContexteCourrier =
  | { type: "demission"; dureeJours: number; dateDebut: string; dateFin: string; dateEnvoiLimite: string }
  | { type: "commun-accord"; dateFinContratIso: string; avecPrestation: boolean | undefined };

function ConstructeurCourrier({ contexte }: { contexte: ContexteCourrier }): React.ReactElement {
  const [souhaite, setSouhaite] = useState(false);
  const [typeLettre, setTypeLettre] = useState<"recommande" | "commun-accord">(
    contexte.type === "demission" ? "recommande" : "commun-accord",
  );
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState<Adresse>(ADRESSE_VIDE);
  const [nomEmployeur, setNomEmployeur] = useState("");
  const [responsableEmployeur, setResponsableEmployeur] = useState("");
  const [adresseEmployeur, setAdresseEmployeur] = useState<Adresse>(ADRESSE_VIDE);
  const [lieuSignature, setLieuSignature] = useState("");
  const [dateSignature, setDateSignature] = useState("");
  const [dateFinContratChoisie, setDateFinContratChoisie] = useState(
    contexte.type === "commun-accord" ? contexte.dateFinContratIso : "",
  );
  const [avecPrestationChoisie, setAvecPrestationChoisie] = useState<"avec" | "sans" | "">(
    contexte.type === "commun-accord" && contexte.avecPrestation !== undefined
      ? contexte.avecPrestation
        ? "avec"
        : "sans"
      : "",
  );
  const [copie, setCopie] = useState(false);
  const [telechargementEnCours, setTelechargementEnCours] = useState(false);

  // Date par défaut : la date limite d'envoi du recommandé pour ce type de courrier,
  // ou aujourd'hui pour une convention de commun accord. Se met à jour si l'utilisateur
  // change de type de courrier (mais n'écrase pas une saisie manuelle sur le même type).
  useEffect(() => {
    if (typeLettre === "recommande" && contexte.type === "demission") {
      setDateSignature(contexte.dateEnvoiLimite);
    } else {
      setDateSignature(new Date().toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeLettre]);

  const lieuSignatureEffectif = lieuSignature || adresse.ville;

  function texteCorps(): string {
    const nomComplet = `${prenom} ${nom}`.trim() || undefined;
    const adresseTexte = adresseVide(adresse) ? undefined : adresseComplete(adresse);
    const nomEmployeurTexte = nomEmployeur.trim() || undefined;
    const lieuEffectif = lieuSignatureEffectif || undefined;

    if (typeLettre === "recommande" && contexte.type === "demission") {
      return genererNotificationDemission({
        dureeJours: contexte.dureeJours,
        dateDebutPreavisIso: contexte.dateDebut,
        dateFinPreavisIso: contexte.dateFin,
        nomTravailleur: nomComplet,
        domicileTravailleur: adresseTexte,
        nomEmployeur: nomEmployeurTexte,
        lieuSignature: lieuEffectif,
        dateSignatureIso: dateSignature || undefined,
      });
    }

    const dateFinContrat = contexte.type === "commun-accord" ? contexte.dateFinContratIso : dateFinContratChoisie;
    const avecPrestationValeur =
      contexte.type === "commun-accord"
        ? contexte.avecPrestation
        : avecPrestationChoisie === ""
          ? undefined
          : avecPrestationChoisie === "avec";

    return genererConventionCommunAccord({
      dateFinContratIso: dateFinContrat,
      avecPrestation: avecPrestationValeur,
      nomTravailleur: nomComplet,
      domicileTravailleur: adresseTexte,
      nomEmployeur: nomEmployeurTexte,
      siegeEmployeur: adresseVide(adresseEmployeur) ? undefined : adresseComplete(adresseEmployeur),
      lieuSignature: lieuEffectif,
      dateSignatureIso: dateSignature || undefined,
    });
  }

  const texteApercu = useMemo(() => {
    try {
      return texteCorps();
    } catch {
      return "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    typeLettre,
    prenom,
    nom,
    adresse,
    nomEmployeur,
    adresseEmployeur,
    lieuSignature,
    dateSignature,
    dateFinContratChoisie,
    avecPrestationChoisie,
  ]);

  async function copierTexte() {
    try {
      await navigator.clipboard.writeText(texteApercu);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Copie manuelle si l'API presse-papier n'est pas disponible.
    }
  }

  async function telechargerPdf() {
    setTelechargementEnCours(true);
    try {
      const destinataireAttention = responsableEmployeur.trim()
        ? `À l'attention de ${responsableEmployeur.trim()}`
        : "À l'attention du service des ressources humaines";

      const blob = await pdf(
        <LettrePDF
          donnees={{
            expediteurNom: `${prenom} ${nom}`.trim(),
            expediteurAdresse: adresse,
            destinataireNom: nomEmployeur.trim(),
            destinataireAttention,
            destinataireAdresse: adresseEmployeur,
            corps: texteApercu,
          }}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const prefixe = typeLettre === "recommande" ? "demission" : "rupture-commun-accord";
      a.download = `${prefixe}${nom ? `-${nom.toLowerCase().replace(/\s+/g, "-")}` : ""}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setTelechargementEnCours(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <div>
        <label className={CLASSE_LABEL}>Souhaitez-vous un modèle de lettre ?</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input type="radio" name="souhaiteLettre" checked={souhaite} onChange={() => setSouhaite(true)} />
            Oui
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input type="radio" name="souhaiteLettre" checked={!souhaite} onChange={() => setSouhaite(false)} />
            Non
          </label>
        </div>
      </div>

      {souhaite && (
        <div className="space-y-4 pt-2">
          {contexte.type === "demission" && (
            <div>
              <label className={CLASSE_LABEL}>Quel type de courrier ?</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="typeLettre"
                    checked={typeLettre === "recommande"}
                    onChange={() => setTypeLettre("recommande")}
                  />
                  Démission par courrier recommandé
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="typeLettre"
                    checked={typeLettre === "commun-accord"}
                    onChange={() => setTypeLettre("commun-accord")}
                  />
                  Proposer une rupture de commun accord
                </label>
              </div>
            </div>
          )}

          {typeLettre === "commun-accord" && contexte.type === "demission" && (
            <>
              <ChampDate
                label="Date de fin de contrat proposée"
                valeurIso={dateFinContratChoisie}
                onChange={setDateFinContratChoisie}
              />
              <div>
                <label className={CLASSE_LABEL}>Le dernier jour, y a-t-il prestation ?</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="avecPrestationChoisie"
                      checked={avecPrestationChoisie === "avec"}
                      onChange={() => setAvecPrestationChoisie("avec")}
                    />
                    Oui, prestation ce jour-là
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="avecPrestationChoisie"
                      checked={avecPrestationChoisie === "sans"}
                      onChange={() => setAvecPrestationChoisie("sans")}
                    />
                    Non, sans prestation
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={CLASSE_LABEL}>Prénom</label>
              <input type="text" className={CLASSE_INPUT} value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
            <div>
              <label className={CLASSE_LABEL}>Nom</label>
              <input type="text" className={CLASSE_INPUT} value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 pt-2">Votre adresse</p>
          <ChampAdresse valeur={adresse} onChange={setAdresse} />

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 pt-2">Votre employeur</p>
          <div>
            <label className={CLASSE_LABEL}>Nom de l'employeur / de la société</label>
            <input
              type="text"
              className={CLASSE_INPUT}
              value={nomEmployeur}
              onChange={(e) => setNomEmployeur(e.target.value)}
            />
          </div>
          <div>
            <label className={CLASSE_LABEL}>Responsable (facultatif)</label>
            <input
              type="text"
              className={CLASSE_INPUT}
              value={responsableEmployeur}
              onChange={(e) => setResponsableEmployeur(e.target.value)}
              placeholder="Si vide : « à l'attention du service des ressources humaines »"
            />
          </div>
          <ChampAdresse valeur={adresseEmployeur} onChange={setAdresseEmployeur} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={CLASSE_LABEL}>Lieu de signature</label>
              <input
                type="text"
                className={CLASSE_INPUT}
                value={lieuSignatureEffectif}
                onChange={(e) => setLieuSignature(e.target.value)}
                placeholder="Ex : Namur"
              />
            </div>
            <ChampDate label="Date" valeurIso={dateSignature} onChange={setDateSignature} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 pt-2">
              <p className="text-sm font-semibold text-gray-900">Aperçu</p>
              <button type="button" onClick={copierTexte} className={CLASSE_BOUTON_SECONDAIRE}>
                {copie ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copie ? "Copié" : "Copier le texte"}
              </button>
            </div>
            <textarea
              readOnly
              value={texteApercu}
              rows={14}
              className="w-full border border-gray-200 rounded-xl p-4 text-sm font-mono text-gray-800 bg-gray-50 resize-y"
            />
            <p className="text-xs text-gray-500 mt-2">
              Vous pouvez modifier ce texte avant de l'imprimer ou de l'envoyer. Les champs laissés en pointillés
              ("...") sont à compléter à la main.
            </p>
          </div>

          <button
            type="button"
            onClick={telechargerPdf}
            disabled={telechargementEnCours}
            className={CLASSE_BOUTON_PRIMAIRE}
          >
            <FileDown className="w-4 h-4" />
            Télécharger le courrier en PDF
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Assistant principal ──────────────────────────────────────────────────────

export default function FormulairePreavis() {
  const [etape, setEtape] = useState<Etape>("situation");
  const [donnees, setDonnees] = useState<DonneesFormulaire>(DONNEES_INITIALES);

  function majChamp<K extends keyof DonneesFormulaire>(champ: K, valeur: DonneesFormulaire[K]) {
    setDonnees((precedent) => ({ ...precedent, [champ]: valeur }));
  }

  const dateRuptureValide = donnees.dateRupture !== "";
  const situationValide =
    donnees.dateEntreeService !== "" &&
    dateRuptureValide &&
    (donnees.ruptureChoix !== "commun-accord" || donnees.avecPrestation !== "");

  // La rémunération n'influence le résultat que dans deux cas : le calcul employé
  // pour l'ancienneté acquise avant 2014 (le seuil légal dépend du salaire), et
  // l'estimation d'indemnité en cas de rupture immédiate. On ne la demande donc
  // jamais à l'étape "situation", pour obtenir le délai de préavis le plus vite
  // possible — elle n'est demandée qu'à l'étape suivante, et seulement si nécessaire.
  const remunerationRequise =
    (donnees.statut === "employe" && donnees.dateEntreeService !== "" && donnees.dateEntreeService < "2014-01-01") ||
    (donnees.ruptureChoix === "employeur" && donnees.modeEmployeur === "indemnite");

  const afficheEtapeIntermediaire = remunerationRequise;
  const etapeIntermediaireValide = !remunerationRequise || donnees.remunerationAnnuelle !== "";

  const resultat = useMemo<Resultat | null>(() => {
    if (etape !== "resultat") return null;
    try {
      return calculerResultat(donnees);
    } catch {
      return null;
    }
  }, [etape, donnees]);

  function recommencer() {
    setDonnees(DONNEES_INITIALES);
    setEtape("situation");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="bg-red-700 rounded-2xl px-6 py-5 text-white shadow-lg">
          <h1 className="text-xl font-semibold leading-snug">Calcul de préavis</h1>
          <p className="text-red-100 text-sm mt-1.5">Centrale Générale FGTB Namur – Luxembourg</p>
        </header>

        {etape === "situation" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className={CLASSE_LABEL}>Votre statut</label>
              <select
                className={CLASSE_INPUT}
                value={donnees.statut}
                onChange={(e) => majChamp("statut", e.target.value as Statut)}
              >
                <option value="ouvrier">Ouvrier</option>
                <option value="employe">Employé</option>
              </select>
            </div>

            <ChampDate
              label="Date d'entrée en service"
              valeurIso={donnees.dateEntreeService}
              onChange={(iso) => majChamp("dateEntreeService", iso)}
            />

            {donnees.statut === "ouvrier" && (
              <div>
                <label className={CLASSE_LABEL}>Commission paritaire</label>
                <select className={CLASSE_INPUT} value={donnees.cp} onChange={(e) => majChamp("cp", e.target.value)}>
                  <option value="">Régime général (valable pour la grande majorité des cas)</option>
                  <optgroup label="Secteurs avec des règles particulières avant 2014">
                    {COMMISSIONS_PARITAIRES.map((cp) => (
                      <option key={cp.code} value={cp.code}>
                        {cp.nom}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Les règles sont les mêmes pour presque tout le monde. Seuls certains secteurs ont des règles
                  particulières pour l'ancienneté acquise avant 2014. En cas de doute, laissez « Régime général ».
                </p>
              </div>
            )}

            <div>
              <label className={CLASSE_LABEL}>Qui met fin au contrat ?</label>
              <div className="space-y-2">
                {(
                  [
                    { valeur: "travailleur", texte: "Moi (démission)" },
                    { valeur: "employeur", texte: "Mon employeur (licenciement)" },
                    { valeur: "commun-accord", texte: "Rupture d'un commun accord" },
                  ] as { valeur: RuptureChoix; texte: string }[]
                ).map((option) => (
                  <label key={option.valeur} className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="ruptureChoix"
                      checked={donnees.ruptureChoix === option.valeur}
                      onChange={() => majChamp("ruptureChoix", option.valeur)}
                    />
                    {option.texte}
                  </label>
                ))}
              </div>
            </div>

            {donnees.ruptureChoix === "employeur" && (
              <div>
                <label className={CLASSE_LABEL}>Comment le préavis est-il donné ?</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="modeEmployeur"
                      checked={donnees.modeEmployeur === "preavis"}
                      onChange={() => majChamp("modeEmployeur", "preavis")}
                    />
                    Préavis presté (vous continuez à travailler pendant le préavis)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="modeEmployeur"
                      checked={donnees.modeEmployeur === "indemnite"}
                      onChange={() => majChamp("modeEmployeur", "indemnite")}
                    />
                    Rupture immédiate (indemnité à la place du préavis)
                  </label>
                </div>
              </div>
            )}

            {donnees.ruptureChoix === "commun-accord" ? (
              <>
                <ChampDate
                  label="Date de fin du contrat convenue"
                  valeurIso={donnees.dateRupture}
                  onChange={(iso) => majChamp("dateRupture", iso)}
                />
                <div>
                  <label className={CLASSE_LABEL}>Le dernier jour, travaillez-vous ou non ?</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="radio"
                        name="avecPrestation"
                        checked={donnees.avecPrestation === "avec"}
                        onChange={() => majChamp("avecPrestation", "avec")}
                      />
                      Je travaille ce jour-là
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="radio"
                        name="avecPrestation"
                        checked={donnees.avecPrestation === "sans"}
                        onChange={() => majChamp("avecPrestation", "sans")}
                      />
                      Je ne travaille pas ce jour-là
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <ChampDate
                  label={
                    donnees.ruptureChoix === "travailleur"
                      ? "Date à laquelle vous souhaitez démissionner (1er jour de votre préavis)"
                      : "Date à laquelle vous pensez que votre préavis débutera"
                  }
                  valeurIso={donnees.dateRupture}
                  onChange={(iso) => majChamp("dateRupture", iso)}
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Le préavis démarre toujours un lundi. Nous calculerons la date limite pour envoyer le recommandé et
                  atteindre cette date — vous pourrez toujours ajuster la date choisie après avoir vu le résultat.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!situationValide}
                onClick={() => setEtape(afficheEtapeIntermediaire ? "complement" : "resultat")}
                className={CLASSE_BOUTON_PRIMAIRE}
              >
                Suivant
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {etape === "complement" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className={CLASSE_LABEL}>Rémunération annuelle brute (€)</label>
              <input
                type="number"
                min={0}
                className={CLASSE_INPUT}
                value={donnees.remunerationAnnuelle}
                onChange={(e) => majChamp("remunerationAnnuelle", e.target.value)}
                placeholder="Ex : 35000"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                {donnees.ruptureChoix === "employeur" && donnees.modeEmployeur === "indemnite"
                  ? "Nécessaire pour estimer le montant de l'indemnité."
                  : "Nécessaire car votre ancienneté avant 2014 dépend d'un seuil de rémunération légal."}
              </p>
            </div>

            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setEtape("situation")} className={CLASSE_BOUTON_SECONDAIRE}>
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
              <button
                type="button"
                disabled={!etapeIntermediaireValide}
                onClick={() => setEtape("resultat")}
                className={CLASSE_BOUTON_PRIMAIRE}
              >
                Calculer
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {etape === "resultat" && resultat && (
          <div className="space-y-5">
            {resultat.type === "commun-accord" && (
              <ConstructeurCourrier
                contexte={{
                  type: "commun-accord",
                  dateFinContratIso: resultat.dateFinContratIso,
                  avecPrestation: resultat.avecPrestation,
                }}
              />
            )}

            {resultat.type === "indemnite" && (
              <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
                <h3 className="font-semibold text-gray-900">Durée de préavis équivalente</h3>
                <p className="text-2xl font-bold text-red-700">{formaterDureePreavis(resultat.jours)}</p>
                {resultat.montantIndemnite !== null ? (
                  <p className="text-sm text-gray-700">
                    Indemnité compensatoire estimée :{" "}
                    <span className="font-semibold">
                      <ChampMonnaie montant={resultat.montantIndemnite} />
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Renseignez la rémunération annuelle brute pour obtenir une estimation du montant.
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Estimation indicative, hors avantages en nature et pécule de sortie. Ne remplace pas un calcul
                  officiel par un secrétariat social.
                </p>
              </div>
            )}

            {resultat.type === "preavis" && (
              <>
                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
                  <h3 className="font-semibold text-gray-900">Votre préavis</h3>
                  <p className="text-2xl font-bold text-red-700">{formaterDureePreavis(resultat.jours)}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Début du préavis</p>
                      <p className="font-medium text-gray-900">{isoToDateFr(resultat.dateDebut)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fin du préavis</p>
                      <p className="font-medium text-gray-900">{isoToDateFr(resultat.dateFin)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Date limite pour envoyer le recommandé</p>
                      <p className="font-medium text-gray-900">{isoToDateFr(resultat.dateEnvoiLimite)}</p>
                    </div>
                  </div>
                  {resultat.dateEnvoiDepassee && (
                    <div className="flex gap-2 items-start bg-amber-50 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        Cette date de début n'est plus atteignable : il aurait fallu envoyer le recommandé avant le{" "}
                        {isoToDateFr(resultat.dateEnvoiLimite)}. Si vous l'envoyez aujourd'hui, votre préavis
                        commencera plutôt le{" "}
                        {resultat.dateDebutAuPlusTot ? isoToDateFr(resultat.dateDebutAuPlusTot) : "—"}. Vous pouvez
                        modifier la date choisie en revenant à l'étape précédente.
                      </p>
                    </div>
                  )}
                  {resultat.indemniteCompensatoireJours !== null && (
                    <p className="text-sm text-gray-700 bg-red-50 rounded-lg p-3">
                      Vous avez peut-être droit à une indemnité compensatoire supplémentaire d'environ{" "}
                      {formaterDureePreavis(resultat.indemniteCompensatoireJours)} — vérifiez ce point avec votre
                      secrétariat FGTB.
                    </p>
                  )}
                  {resultat.avertissement && (
                    <div className="flex gap-2 items-start bg-amber-50 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">{resultat.avertissement}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 pt-1">
                    Méthode de calcul : {resultat.source.methode}{" "}
                    <a
                      href={resultat.source.lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-600"
                    >
                      Source
                    </a>
                  </p>
                </div>

                {resultat.quiRompt === "travailleur" && (
                  <ConstructeurCourrier
                    contexte={{
                      type: "demission",
                      dureeJours: resultat.jours,
                      dateDebut: resultat.dateDebut,
                      dateFin: resultat.dateFin,
                      dateEnvoiLimite: resultat.dateEnvoiLimite,
                    }}
                  />
                )}
                {resultat.contenuOnem && <BlocInformatif contenu={resultat.contenuOnem} />}
                <BlocInformatif contenu={resultat.contenuProcedures} />
              </>
            )}

            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-600">
                Cet outil donne une estimation basée sur les informations que vous avez fournies. Il ne remplace pas
                un conseil personnalisé. Pour toute question sur votre situation, contactez votre secrétariat FGTB.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setEtape(afficheEtapeIntermediaire ? "complement" : "situation")}
                className={CLASSE_BOUTON_SECONDAIRE}
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
              <button type="button" onClick={recommencer} className={CLASSE_BOUTON_SECONDAIRE}>
                <RotateCcw className="w-4 h-4" />
                Recommencer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
