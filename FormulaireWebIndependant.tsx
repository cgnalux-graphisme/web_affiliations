"use client";

/**
 * FormulaireWebIndependant.tsx
 * Formulaire d'affiliation FGTB — Standalone, 5 étapes, Tailwind CSS, Supabase
 *
 * Variables d'environnement requises (dans votre .env.local) :
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxx...
 */

import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  User,
  MapPin,
  Briefcase,
  ArrowLeftRight,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  PenLine,
  Loader2,
  RotateCcw,
  Send,
  FileDown,
  Calendar,
  X,
  ChevronDown,
} from "lucide-react";
import {
  Document,
  Page,
  Text as PDFText,
  View,
  StyleSheet as PDFStyleSheet,
  PDFDownloadLink,
  Image as PDFImage,
} from "@react-pdf/renderer";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CLIENT SUPABASE
//    Les identifiants sont lus depuis les variables d'environnement.
//    Ne mettez JAMAIS vos clés directement dans le code.
// ═══════════════════════════════════════════════════════════════════════════════
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. VALIDATION IBAN INTERNATIONALE (algorithme officiel MOD-97)
//    L'IBAN commence par 2 lettres (code pays ISO) + 2 chiffres de contrôle
//    + jusqu'à 30 caractères alphanumériques (le BBAN, numéro de compte local).
//    Longueur max : 34 caractères.
//    On vérifie le checksum : déplacer les 4 premiers chars à la fin,
//    convertir chaque lettre en chiffres (A=10, B=11 … Z=35),
//    puis calculer modulo 97 → doit donner 1.
// ═══════════════════════════════════════════════════════════════════════════════
function isValidIBAN(raw: string): boolean {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(iban) || iban.length > 34) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((c) => (/[A-Z]/.test(c) ? (c.charCodeAt(0) - 55).toString() : c))
    .join("");
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + parseInt(ch, 10)) % 97;
  return rem === 1;
}

/** Extrait le code pays ISO depuis un IBAN (ex: "BE68 5390…" → "BE") */
function ibanCountryCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase().slice(0, 2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2b. VALIDATION BIC / SWIFT
//     Format : 4 lettres (code banque) + 2 lettres (code pays ISO) +
//              2 chars alphanumériques (localisation) + 3 chars optionnels (branche)
//     Exemples valides : GEBABEBB, BNPAFRPP, DEUTDEDB500
// ═══════════════════════════════════════════════════════════════════════════════
function isValidBIC(raw: string): boolean {
  const bic = raw.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. NISS — Numéro national belge (numéro de registre national)
//    Format affiché : AA.MM.JJ-XXX.CC  (11 chiffres au total)
//    Algorithme de validation officiel :
//      - On prend les 9 premiers chiffres (AAMMJJXXX) comme nombre N
//      - Le checksum CC = 97 − (N mod 97)
//      - Pour les personnes nées APRÈS 1999, on préfixe N par "2" avant le calcul
// ═══════════════════════════════════════════════════════════════════════════════

/** Formate un numéro NISS en AA.MM.JJ-XXX.CC au fil de la frappe */
function formatNiss(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  let result = d.slice(0, 2);
  if (d.length > 2) result += "." + d.slice(2, 4);
  if (d.length > 4) result += "." + d.slice(4, 6);
  if (d.length > 6) result += "-" + d.slice(6, 9);
  if (d.length > 9) result += "." + d.slice(9, 11);
  return result;
}

/** Valide un numéro NISS belge (modulo 97, avec gestion du siècle) */
function isValidNISS(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  const base      = parseInt(digits.slice(0, 9), 10);
  const checksum  = parseInt(digits.slice(9, 11), 10);
  // Né avant 2000
  if (97 - (base % 97) === checksum) return true;
  // Né à partir de 2000 (on préfixe "2")
  const base2000 = parseInt("2" + digits.slice(0, 9), 10);
  return 97 - (base2000 % 97) === checksum;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TYPES — Structure des données du formulaire
// ═══════════════════════════════════════════════════════════════════════════════
interface FormData {
  // Étape 1 — Identité
  nom: string;
  prenom: string;
  niss: string;
  email: string;
  tel: string;
  genre: string;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  etatCivil: string;
  // Étape 2 — Adresse
  rue: string;
  numero: string;
  boite: string;
  codePostal: string;
  localite: string;
  pays: string;
  // Étape 3 — Professionnel
  situationPro: string;         // "actif" | "inactif"
  statut: string;               // type actif : ouvrier, employe, interimaire, etudiant, apprenti, cefa, pfi, mutuelle
  typeInactif: string;          // "pensionné" | "prepensionné" | "sans_emploi" | "autre"
  allocationsChomage: string;   // "oui" | "non" (si sans_emploi)
  autreInactifPrecision: string;// précision libre (si autre)
  entreprise: string;
  secteur: string;
  secteurAutre: string;
  matriculeONSS: string;
  dateEntree: string;
  regimeTravail: string;
  regimeTravailDetail: string; // "plus20h" | "moins20h" (si temps-partiel)
  // Étape 4 — Transfert
  autresCentraleFGTB: string;       // "oui" | "non"
  centralesFGTBChoisie: string;     // centrale choisie si oui
  provinceCentraleFGTB: string;     // province (champ libre) si oui
  affilieAutreSyndicat: string;     // "oui" | "non"
  autreSyndicatChoix: string;       // "csc" | "cgslb" | "autre"
  autreSyndicatAutreDetail: string; // précision si "autre"
  dossierJuridique: string;         // "oui" | "non"
  // Étape 5 — Paiement & Signature
  affiliationMois: string;         // "1" à "12"
  affiliationAnnee: string;        // "2026"
  iban: string;
  bic: string;
  modePaiement: string;
  titulaireDuCompte: string;       // "oui" | "non" (domiciliation)
  titulaireNomPrenom: string;      // nom+prénom+lien si titulaire ≠ affilié
  signature: string;
}

type Errors = Partial<Record<keyof FormData, string>>;

const INIT: FormData = {
  nom: "", prenom: "", niss: "", email: "", tel: "",
  genre: "", dateNaissance: "", lieuNaissance: "",
  nationalite: "Belge", etatCivil: "",
  rue: "", numero: "", boite: "", codePostal: "", localite: "", pays: "Belgique",
  situationPro: "", statut: "", typeInactif: "",
  allocationsChomage: "", autreInactifPrecision: "",
  entreprise: "", secteur: "", secteurAutre: "", matriculeONSS: "",
  dateEntree: "", regimeTravail: "", regimeTravailDetail: "",
  autresCentraleFGTB: "", centralesFGTBChoisie: "", provinceCentraleFGTB: "",
  affilieAutreSyndicat: "", autreSyndicatChoix: "", autreSyndicatAutreDetail: "",
  dossierJuridique: "",
  affiliationMois: "", affiliationAnnee: "2026",
  iban: "", bic: "", modePaiement: "domiciliation",
  titulaireDuCompte: "", titulaireNomPrenom: "",
  signature: "",
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CONFIGURATION DES ÉTAPES (label + icône Lucide)
// ═══════════════════════════════════════════════════════════════════════════════
const STEPS = [
  { label: "Identité",      Icon: User },
  { label: "Adresse",       Icon: MapPin },
  { label: "Professionnel", Icon: Briefcase },
  { label: "Transfert",     Icon: ArrowLeftRight },
  { label: "Paiement",      Icon: CreditCard },
  { label: "Validation",    Icon: ShieldCheck },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 5b. COMMISSIONS PARITAIRES (liste officielle)
// ═══════════════════════════════════════════════════════════════════════════════
const commissionsParitaires = [
  { id: "100",    label: "100 - Auxiliaire pour ouvriers" },
  { id: "101",    label: "101 - Mines" },
  { id: "102",    label: "102 - Carrières" },
  { id: "106",    label: "106 - Ciment" },
  { id: "109",    label: "109 - Industrie de l'habillement et de la confection (ouvriers)" },
  { id: "110",    label: "110 - Blanchisserie - Entretien du Textiles" },
  { id: "113",    label: "113 - Industrie de la céramique" },
  { id: "114",    label: "114 - Industrie de la brique" },
  { id: "115",    label: "115 - Verre (ouvriers)" },
  { id: "116",    label: "116 - Chimie (ouvriers)" },
  { id: "117",    label: "117 - Pétrole" },
  { id: "120",    label: "120 - Industrie textile & bonneterie" },
  { id: "121",    label: "121 - Nettoyage et Désinfection" },
  { id: "124",    label: "124 - Construction" },
  { id: "125",    label: "125 - Bois – Industrie" },
  { id: "126",    label: "126 - Ameublement - industrie transformatrice du bois" },
  { id: "129",    label: "129 - Production du papier" },
  { id: "136",    label: "136 - Transformation papier & carton (ouvriers)" },
  { id: "142",    label: "142 - Entreprises de valo. de matières premières de récupération" },
  { id: "146",    label: "146 - Entreprises forestières" },
  { id: "200",    label: "200 - Auxiliaire pour employés" },
  { id: "207",    label: "207 - Chimie (employés)" },
  { id: "214",    label: "214 - Textile (employés)" },
  { id: "215",    label: "215 - Industrie de l'habillement et de la confection (employés)" },
  { id: "222",    label: "222 - Transformation papier & carton (employés)" },
  { id: "314",    label: "314 - Coiffure - Soins de beauté – Fitness" },
  { id: "317",    label: "317 - Gardiennage" },
  { id: "322",    label: "322 - Intérim" },
  { id: "322.01", label: "322.01 - Titres-Services" },
  { id: "327",    label: "327 - ETA (Entreprises de Travail Adapté)" },
  { id: "999",    label: "Je ne sais pas" },
  { id: "000",    label: "000 - Autre" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4b. CALCUL DE COTISATION — Barème 2026
//     Retourne le montant mensuel et la catégorie correspondante.
//     Priorité : ETA (secteur 327) > Statut spécifique > Régime de travail.
// ═══════════════════════════════════════════════════════════════════════════════
interface Cotisation {
  montant: number;   // montant mensuel en euros
  categorie: string; // ex: "Cat. 01"
  label: string;     // description lisible
}

function calculerCotisation(data: {
  situationPro: string;
  statut: string;
  typeInactif: string;
  allocationsChomage: string;
  secteur: string;
  regimeTravail: string;
  regimeTravailDetail: string;
}): Cotisation | null {
  // Cat. 06 — ETA (Entreprise de Travail Adapté) : priorité absolue
  if (data.secteur === "327")
    return { montant: 11.20, categorie: "Cat. 06", label: "ETA" };

  if (data.situationPro === "actif") {
    // Cat. 14 — Apprentissage
    if (["apprenti", "cefa", "etudiant"].includes(data.statut))
      return { montant: 7.00, categorie: "Cat. 14", label: "Apprentissage" };

    // Cat. 11 — Maladie longue durée
    if (data.statut === "mutuelle")
      return { montant: 12.65, categorie: "Cat. 11", label: "Maladie longue durée" };

    // Cat. 01 — Ouv/Emp TPS Plein
    if (data.regimeTravail === "temps-plein")
      return { montant: 19.00, categorie: "Cat. 01", label: "Ouv/Emp TPS Plein" };

    // Cat. 12 — TPS partiel 20h à 37h
    if (data.regimeTravail === "temps-partiel" && data.regimeTravailDetail === "plus20h")
      return { montant: 14.30, categorie: "Cat. 12", label: "TPS partiel 20h à 37h" };

    // Cat. 13 — TPS Partiel <20h
    if (data.regimeTravail === "temps-partiel" && data.regimeTravailDetail === "moins20h")
      return { montant: 13.30, categorie: "Cat. 13", label: "TPS Partiel <20h" };
  }

  if (data.situationPro === "inactif") {
    // Cat. 04 — Pensionnés
    if (data.typeInactif === "pensionné" || data.typeInactif === "prepensionné")
      return { montant: 4.00, categorie: "Cat. 04", label: "Pensionnés" };

    // Cat. 05 — Chômage
    if (data.typeInactif === "sans_emploi")
      return { montant: 12.60, categorie: "Cat. 05", label: "Chômage" };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4b-bis. BARÈMES MENSUELS PAR ANNÉE
//         Clé = catégorie (ex: "Cat. 01"), valeur = montant mensuel en euros.
// ═══════════════════════════════════════════════════════════════════════════════
const BAREME_MENSUEL: Record<string, Record<string, number>> = {
  "2025": {
    "Cat. 01": 18.20,
    "Cat. 03": 13.70,
    "Cat. 04": 3.50,
    "Cat. 05": 11.90,
    "Cat. 06": 10.60,
    "Cat. 11": 11.95,
    "Cat. 12": 13.60,
    "Cat. 13": 12.60,
    "Cat. 14": 5.50,
  },
  "2026": {
    "Cat. 01": 19.00,
    "Cat. 03": 14.50,
    "Cat. 04": 4.00,
    "Cat. 05": 12.60,
    "Cat. 06": 11.20,
    "Cat. 11": 12.65,
    "Cat. 12": 14.30,
    "Cat. 13": 13.30,
    "Cat. 14": 7.00,
  },
};

/** Retourne le montant mensuel pour une catégorie et une année données */
function getMontantParAnnee(categorie: string, annee: string): number | null {
  return BAREME_MENSUEL[annee]?.[categorie] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4c. CALCUL DES ÉCHÉANCES TRIMESTRIELLES
//     À partir du mois de début et du montant mensuel, calcule les virements
//     à effectuer : d'abord les mois restants du trimestre en cours (partiel),
//     puis chaque trimestre complet restant dans l'année.
// ═══════════════════════════════════════════════════════════════════════════════
interface Echeance {
  nom: string;     // ex: "2e Trimestre"
  periode: string; // ex: "Mai – Juin"
  nbMois: number;  // nombre de mois concernés
  montant: number; // montant total à payer pour cette échéance
}

const NOMS_TRIMESTRES = ["1er Trimestre", "2e Trimestre", "3e Trimestre", "4e Trimestre"];
const MOIS_PAR_TRIMESTRE = [
  ["Janvier", "Février", "Mars"],
  ["Avril", "Mai", "Juin"],
  ["Juillet", "Août", "Septembre"],
  ["Octobre", "Novembre", "Décembre"],
];

function calculerEcheancesTrimestrielles(montantMensuel: number, mois: number, annee: string): Echeance[] {
  const qIdx     = Math.floor((mois - 1) / 3); // trimestre de départ (0 à 3)
  const posInQ   = (mois - 1) % 3;             // position dans ce trimestre (0=1er mois)
  const restant  = 3 - posInQ;                  // mois restants dans ce 1er trimestre

  const echeances: Echeance[] = [];

  // 1er paiement : mois restants du trimestre de départ (peut être 1, 2 ou 3 mois)
  echeances.push({
    nom:     `${NOMS_TRIMESTRES[qIdx]} ${annee}`,
    periode: MOIS_PAR_TRIMESTRE[qIdx].slice(posInQ).join(" – "),
    nbMois:  restant,
    montant: montantMensuel * restant,
  });

  // Trimestres complets suivants dans la même année
  for (let q = qIdx + 1; q < 4; q++) {
    echeances.push({
      nom:     `${NOMS_TRIMESTRES[q]} ${annee}`,
      periode: `${MOIS_PAR_TRIMESTRE[q][0]} – ${MOIS_PAR_TRIMESTRE[q][2]}`,
      nbMois:  3,
      montant: montantMensuel * 3,
    });
  }

  return echeances;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4d. CALCUL DES ÉCHÉANCES DE DOMICILIATION
//     Le prélèvement a lieu le 10 du mois suivant l'inscription.
//     Chaque prélèvement couvre les 3 mois les plus anciens non soldés.
//     L'échéancier s'étend jusqu'à décembre 2026.
// ═══════════════════════════════════════════════════════════════════════════════
interface EcheanceDom {
  datePrelevement: string; // ex: "10 Avril 2026"
  moisCouverts: string[];  // ex: ["Mars 2025", "Avril 2025", "Mai 2025"]
  montant: number;
}

function calculerEcheancesDomiciliation(
  affiliationMois: number,
  affiliationAnnee: string,
  categorie: string
): EcheanceDom[] {
  // Premier prélèvement : le 10 du mois suivant aujourd'hui
  const today = new Date();
  let fdM = today.getMonth() + 2; // 0-based → +1 mois courant, +1 mois suivant
  let fdY = today.getFullYear();
  if (fdM > 12) { fdM = 1; fdY++; }

  // Convertir en "mois absolu" (année × 12 + mois) pour simplifier les calculs
  const toAbs = (y: number, m: number) => y * 12 + m;
  const fromAbs = (abs: number) => ({ y: Math.floor((abs - 1) / 12), m: ((abs - 1) % 12) + 1 });

  let curAbs  = toAbs(parseInt(affiliationAnnee, 10), affiliationMois);
  const fdAbs = toAbs(fdY, fdM);
  const endAbs = toAbs(2026, 12); // on ne va pas au-delà de déc. 2026

  const echeances: EcheanceDom[] = [];
  let debitIdx = 0;

  while (curAbs <= endAbs) {
    const debitAbs = fdAbs + debitIdx;
    const diff     = debitAbs - curAbs; // mois d'écart entre start et date de prélèvement

    // Nombre de mois à prendre : jusqu'au mois du prélèvement (inclus), max 3
    const nbMois = Math.min(3, diff + 1);

    // Construire le groupe de mois
    const group: { y: number; m: number }[] = [];
    for (let j = 0; j < nbMois; j++) {
      const { y, m } = fromAbs(curAbs + j);
      group.push({ y, m });
    }

    // Calcul du montant (chaque mois à son propre tarif annuel)
    const montant = group.reduce((sum, { y }) => sum + (getMontantParAnnee(categorie, String(y)) ?? 0), 0);

    // Formatage de la date de prélèvement
    const { y: dY, m: dM } = fromAbs(debitAbs);

    echeances.push({
      datePrelevement: `10 ${MONTHS_FR[dM - 1]} ${dY}`,
      moisCouverts: group.map(({ y, m }) => `${MONTHS_FR[m - 1]} ${y}`),
      montant,
    });

    curAbs += nbMois;
    debitIdx++;

    // Arrêt dès qu'on est en ordre (dernier prélèvement = 1 seul mois courant)
    if (diff === 0) break;
  }

  return echeances;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. COMPOSANTS RÉUTILISABLES — Field, Input, Select
//    Ces petits blocs évitent de répéter le même HTML pour chaque champ.
// ═══════════════════════════════════════════════════════════════════════════════

/** Enveloppe un champ : affiche son libellé et le message d'erreur éventuel */
function Field({
  label, required = false, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-600 ml-1" aria-hidden>*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3 shrink-0" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

/** Champ texte stylisé avec focus rouge FGTB */
function Input({
  value, onChange, placeholder = "", type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm
        bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent
        transition placeholder:text-gray-400"
    />
  );
}

/** Liste déroulante stylisée */
function Select({
  value, onChange, children, placeholder = "Choisir…",
}: {
  value: string; onChange: (v: string) => void;
  children: React.ReactNode; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm
        bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent
        transition"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

/**
 * CommissionSelect — Combobox de recherche pour les commissions paritaires.
 * - Tape un numéro (ex: "121") ou un mot (ex: "nettoyage") pour filtrer.
 * - Clic sur une suggestion pour sélectionner.
 * - Le badge rouge affiche le numéro sélectionné ; croix pour effacer.
 */
function CommissionSelect({
  value, onChange,
}: {
  value: string; onChange: (v: string) => void;
}) {
  const selectedItem = commissionsParitaires.find((c) => c.id === value) ?? null;
  const [query,    setQuery]    = useState("");
  const [open,     setOpen]     = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? commissionsParitaires.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.id.startsWith(query)
      )
    : commissionsParitaires;

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function handleSelect(c: (typeof commissionsParitaires)[0]) {
    onChange(c.id);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    onChange("");
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Libellé court (sans le numéro répété)
  const shortLabel = (c: (typeof commissionsParitaires)[0]) =>
    c.label.split(" - ").slice(1).join(" - ") || c.label;

  return (
    <div ref={containerRef} className="relative">

      {/* ── Affichage de la sélection courante ── */}
      {selectedItem ? (
        <div className="flex items-center gap-2 w-full rounded-xl border border-gray-300
          px-3 py-2.5 bg-white min-h-[42px]">
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5
            rounded-lg shrink-0 tabular-nums">
            {selectedItem.id}
          </span>
          <span className="flex-1 text-sm text-gray-800 leading-tight">
            {shortLabel(selectedItem)}
          </span>
          <button
            type="button"
            onClick={handleClear}
            aria-label="Effacer la sélection"
            className="text-gray-400 hover:text-red-600 transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      ) : (
        /* ── Champ de recherche ── */
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Tapez un numéro ou un mot-clé…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm
              bg-white focus:outline-none focus:ring-2 focus:ring-red-600
              focus:border-transparent transition placeholder:text-gray-400 pr-8"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2
                text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          ) : (
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
          )}
        </div>
      )}

      {/* ── Liste déroulante filtrée ── */}
      {open && !selectedItem && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200
          bg-white shadow-lg overflow-y-auto text-sm max-h-60">
          {filtered.map((c) => (
            <li
              key={c.id}
              onMouseDown={() => handleSelect(c)}
              className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer
                hover:bg-red-50 hover:text-red-700 border-b border-gray-100
                last:border-0 transition-colors"
            >
              <span className="bg-gray-100 text-gray-600 text-xs font-bold
                px-1.5 py-0.5 rounded shrink-0 tabular-nums min-w-[3rem] text-center">
                {c.id}
              </span>
              <span className="leading-tight">{shortLabel(c)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Message si aucun résultat */}
      {open && !selectedItem && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200
          bg-white shadow-lg px-3 py-3 text-sm text-gray-500 text-center">
          Aucune commission trouvée
        </div>
      )}
    </div>
  );
}

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
const DAYS_FR = ["Lu","Ma","Me","Je","Ve","Sa","Di"];

/**
 * Champ date bimodal :
 * - Saisie manuelle en jj/mm/aaaa avec auto-formatage
 * - OU sélection via un calendrier personnalisé (icône calendrier)
 * Stockage interne en aaaa-mm-jj (ISO, compatible Supabase).
 */
function DateInputFR({
  value, onChange,
}: {
  value: string; onChange: (v: string) => void;
}) {
  const toDisplay = (iso: string) => {
    if (!iso || iso.length < 10) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const now = new Date();
  const [display,   setDisplay]   = useState(() => toDisplay(value));
  const [open,      setOpen]      = useState(false);
  const [viewYear,  setViewYear]  = useState(() => value ? parseInt(value.slice(0, 4)) : now.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.slice(5, 7)) - 1 : now.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  // Ferme le calendrier au clic extérieur
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // ── Saisie texte ──────────────────────────────────────────────────────────
  function handleTextChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let fmt = digits;
    if (digits.length > 2) fmt = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) fmt = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
    setDisplay(fmt);
    if (digits.length === 8) {
      const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8);
      const iso = `${y}-${m}-${d}`;
      onChange(iso);
      setViewYear(parseInt(y));
      setViewMonth(parseInt(m) - 1);
    } else {
      onChange("");
    }
  }

  // ── Navigation calendrier ─────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }
  function prevYear() { setViewYear(y => y - 1); }
  function nextYear() { setViewYear(y => y + 1); }

  // ── Sélection d'un jour ───────────────────────────────────────────────────
  function selectDay(day: number) {
    const d = String(day).padStart(2, "0");
    const m = String(viewMonth + 1).padStart(2, "0");
    const y = String(viewYear);
    const iso = `${y}-${m}-${d}`;
    onChange(iso);
    setDisplay(`${d}/${m}/${y}`);
    setOpen(false);
  }

  function selectToday() {
    const t = new Date();
    const d = String(t.getDate()).padStart(2, "0");
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const y = String(t.getFullYear());
    const iso = `${y}-${m}-${d}`;
    onChange(iso);
    setDisplay(`${d}/${m}/${y}`);
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setOpen(false);
  }

  // ── Grille du mois ────────────────────────────────────────────────────────
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Lundi = 0, …, Dimanche = 6 (semaine à l'européenne)
  const firstWeekDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const selDay   = value ? parseInt(value.slice(8, 10)) : -1;
  const selMonth = value ? parseInt(value.slice(5, 7)) - 1 : -1;
  const selYear  = value ? parseInt(value.slice(0, 4))  : -1;
  const isSelected = (d: number) =>
    d === selDay && viewMonth === selMonth && viewYear === selYear;

  const todayD = now.getDate(), todayM = now.getMonth(), todayY = now.getFullYear();
  const isToday = (d: number) => d === todayD && viewMonth === todayM && viewYear === todayY;

  return (
    <div ref={containerRef} className="relative">

      {/* ── Zone de saisie + bouton calendrier ── */}
      <div className="relative">
        <input
          type="text"
          value={display}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="jj/mm/aaaa"
          maxLength={10}
          inputMode="numeric"
          className="w-full rounded-xl border border-gray-300 pl-3 pr-10 py-2.5 text-sm
            bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent
            transition placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Ouvrir le calendrier"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
            hover:text-red-600 transition-colors"
        >
          <Calendar className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {/* ── Calendrier déroulant ── */}
      {open && (
        <div className="absolute z-50 mt-1.5 left-0 bg-white rounded-2xl shadow-xl
          border border-gray-100 p-4 w-72 select-none">

          {/* ── En-tête : navigation mois et année ── */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevYear}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
              aria-label="Année précédente">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
              aria-label="Mois précédent">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">
              {MONTHS_FR[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
              aria-label="Mois suivant">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={nextYear}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
              aria-label="Année suivante">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Entêtes des jours (Lu → Di) ── */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_FR.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* ── Grille des jours ── */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Cellules vides pour aligner le 1er jour */}
            {Array.from({ length: firstWeekDay }, (_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => selectDay(day)}
                className={[
                  "w-full aspect-square rounded-lg text-sm flex items-center justify-center transition-all",
                  isSelected(day)
                    ? "bg-red-700 text-white font-bold shadow-sm"
                    : isToday(day)
                    ? "border-2 border-red-300 text-red-700 font-semibold hover:bg-red-50"
                    : "text-gray-700 hover:bg-red-50 hover:text-red-700",
                ].join(" ")}
              >
                {day}
              </button>
            ))}
          </div>

          {/* ── Bouton Aujourd'hui ── */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={selectToday}
              className="w-full text-xs text-center text-red-600 hover:text-red-800
                font-medium py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              Aujourd&apos;hui
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. AUTOCOMPLÉTION D'ADRESSE — Photon (OpenStreetMap, gratuit, sans clé API)
//    Uniquement activé quand le pays est "Belgique".
//    L'API Photon (photon.komoot.io) est conçue pour la recherche en temps réel
//    (search-as-you-type). La bbox limite les résultats à la Belgique.
//    On déduplique par la combinaison rue + code postal + ville pour éviter
//    les doublons issus de plusieurs POIs sur la même rue.
// ═══════════════════════════════════════════════════════════════════════════════

/** Structure d'une suggestion retournée par Photon */
interface PhotonSuggestion {
  street: string;
  housenumber: string;
  postcode: string;
  city: string;
  display: string;
}

/** Champ "Rue" avec autocomplétion via Photon — affiché uniquement pour la Belgique */
function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: PhotonSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<PhotonSuggestion[]>([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef                  = useRef<HTMLDivElement>(null);

  // Ferme le dropdown quand on clique en dehors du composant
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleChange(v: string) {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Pas assez de caractères → vider les suggestions
    if (v.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    // Attendre 350ms après la dernière frappe avant d'appeler l'API
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // bbox = rectangle englobant la Belgique (lon_min, lat_min, lon_max, lat_max)
        const url =
          `https://photon.komoot.io/api/?q=${encodeURIComponent(v)}` +
          `&lang=fr&limit=10&bbox=2.376,49.496,6.628,51.547`;
        const res  = await fetch(url);
        const json = await res.json();

        const features: unknown[] = json.features ?? [];

        // On ne garde que les résultats belges qui ont un nom de rue
        const raw: PhotonSuggestion[] = (features as Array<{
          properties: {
            countrycode?: string;
            street?: string;
            name?: string;
            housenumber?: string;
            postcode?: string;
            city?: string;
            locality?: string;
            district?: string;
          };
        }>)
          .filter((f) => f.properties?.countrycode === "BE" && f.properties?.street)
          .map((f) => {
            const p           = f.properties;
            const street      = p.street ?? "";
            const housenumber = p.housenumber ?? "";
            const postcode    = p.postcode ?? "";
            const city        = p.city ?? p.locality ?? p.district ?? "";
            const display     = [
              street + (housenumber ? ` ${housenumber}` : ""),
              [postcode, city].filter(Boolean).join(" "),
            ]
              .filter(Boolean)
              .join(", ");
            return { street, housenumber, postcode, city, display };
          });

        // Déduplique : une même rue dans une même ville ne doit apparaître qu'une fois
        const seen  = new Set<string>();
        const unique = raw.filter((r) => {
          const key = `${r.street}|${r.postcode}|${r.city}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setSuggestions(unique.slice(0, 6));
        setOpen(unique.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function handleSelect(s: PhotonSuggestion) {
    onChange(s.street);
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Rue de la Loi"
          autoComplete="off"
          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm
            bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent
            transition placeholder:text-gray-400"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
            text-gray-400 animate-spin pointer-events-none" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200
          bg-white shadow-lg overflow-hidden text-sm">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => handleSelect(s)}
              className="px-3 py-2.5 cursor-pointer hover:bg-red-50 hover:text-red-700
                border-b border-gray-100 last:border-0 flex items-center gap-2"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-red-400" />
              {s.display}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. COMPOSANT CANVAS — Zone de signature manuscrite
//    Fonctionnement :
//    - On écoute les événements souris (desktop) ET tactiles (mobile/tablette).
//    - À chaque tracé terminé, on exporte le canvas en base64 (PNG) et on
//      appelle onChange() pour mettre à jour l'état du formulaire parent.
//    - Si la signature avait déjà été tracée (retour en arrière puis retour sur
//      cette étape), on la recharge depuis le base64 stocké dans value.
// ═══════════════════════════════════════════════════════════════════════════════
function SignatureCanvas({
  value, onChange,
}: {
  value: string; onChange: (v: string) => void;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const drawing    = useRef(false);
  const lastXY     = useRef({ x: 0, y: 0 });
  // Ref stable pour le callback : évite de recréer les listeners à chaque render
  const onChangeCb = useRef(onChange);
  useEffect(() => { onChangeCb.current = onChange; });

  // Valeur initiale (peut être non-vide si on revient sur cette étape)
  const initialValue = useRef(value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";

    // Recharger la signature précédente si elle existe
    if (initialValue.current) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialValue.current;
    }

    /** Convertit les coordonnées écran → coordonnées canvas (tient compte du scaling) */
    const getXY = (clientX: number, clientY: number) => {
      const rect   = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const onMouseDown = (e: MouseEvent) => {
      drawing.current = true;
      lastXY.current = getXY(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!drawing.current) return;
      const pos = getXY(e.clientX, e.clientY);
      ctx.beginPath();
      ctx.moveTo(lastXY.current.x, lastXY.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastXY.current = pos;
    };
    const onMouseUp = () => {
      if (!drawing.current) return;
      drawing.current = false;
      onChangeCb.current(canvas.toDataURL("image/png"));
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      drawing.current = true;
      const t = e.touches[0];
      lastXY.current = getXY(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!drawing.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const pos = getXY(t.clientX, t.clientY);
      ctx.beginPath();
      ctx.moveTo(lastXY.current.x, lastXY.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastXY.current = pos;
    };
    const onTouchEnd = () => {
      if (!drawing.current) return;
      drawing.current = false;
      onChangeCb.current(canvas.toDataURL("image/png"));
    };

    canvas.addEventListener("mousedown",  onMouseDown);
    canvas.addEventListener("mousemove",  onMouseMove);
    canvas.addEventListener("mouseup",    onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove",  onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",   onTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown",  onMouseDown);
      canvas.removeEventListener("mousemove",  onMouseMove);
      canvas.removeEventListener("mouseup",    onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove",  onTouchMove);
      canvas.removeEventListener("touchend",   onTouchEnd);
    };
  }, []); // exécuté une seule fois au montage du composant

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    onChangeCb.current("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-xl border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50">
        <canvas
          ref={canvasRef}
          width={700}
          height={180}
          className="w-full touch-none cursor-crosshair block"
          aria-label="Zone de signature manuscrite"
        />
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="flex items-center gap-2 text-sm text-gray-400 select-none">
              <PenLine className="w-4 h-4" aria-hidden /> Tracez votre signature ici
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="self-start flex items-center gap-1.5 text-xs text-gray-500
          hover:text-red-600 transition-colors"
        aria-label="Effacer la signature"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Effacer
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. PDF — Styles et document AffiliationDocument
//    @react-pdf/renderer génère un vrai fichier PDF côté client (navigateur).
//    Les styles ici sont proches du CSS mais limités aux propriétés supportées
//    par la librairie (pas de Tailwind, pas de flexbox gaps, etc.).
// ═══════════════════════════════════════════════════════════════════════════════

const pdfStyles = PDFStyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 30,
    paddingBottom: 50,
    paddingLeft: 35,
    paddingRight: 35,
    backgroundColor: "#ffffff",
    color: "#111827",
  },

  // ── Bandeau rouge FGTB en haut ───────────────────────────────────────────
  header: {
    backgroundColor: "#b91c1c",
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: 18,
    marginBottom: 20,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    marginRight: 12,
  },
  headerBadgeText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  headerSubtitle: {
    color: "#fca5a5",
    fontSize: 9,
    marginTop: 3,
  },

  // ── Titre de section (bandelette rouge + texte blanc) ────────────────────
  sectionTitle: {
    backgroundColor: "#b91c1c",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 9,
    paddingRight: 9,
    marginBottom: 7,
    marginTop: 4,
    borderRadius: 3,
  },
  section: {
    marginBottom: 12,
  },

  // ── Ligne label / valeur ────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "38%",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#374151",
  },
  value: {
    width: "62%",
    fontSize: 9,
    color: "#111827",
  },

  // ── Zone signature ───────────────────────────────────────────────────────
  signatureBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "solid",
    borderRadius: 4,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    marginTop: 6,
    backgroundColor: "#f9fafb",
  },
  signatureImage: {
    width: 220,
    height: 65,
  },
  signatureDate: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 5,
    fontFamily: "Helvetica-Oblique",
  },

  // ── Pied de page ────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 35,
    right: 35,
    textAlign: "center",
    fontSize: 7,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
    paddingTop: 6,
  },
});

/** Formate une valeur optionnelle : affiche "—" si vide */
const v = (val?: string) => val?.trim() || "—";

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
 * AffiliationDocument — Le document PDF complet avec 4 sections :
 *   1. Identité & adresse
 *   2. Situation professionnelle
 *   3. Mandat SEPA
 *   4. Signature
 */
function AffiliationDocument({ data }: { data: FormData }) {
  const dateSignature = new Date().toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const adresseFull = [
    `${data.rue} ${data.numero}${data.boite ? ` bte ${data.boite}` : ""}`,
    `${data.codePostal} ${data.localite}`,
    data.pays,
  ]
    .filter(Boolean)
    .join(", ");

  const modePaiementLabel =
    data.modePaiement === "domiciliation"
      ? "Domiciliation automatique"
      : "Virement manuel mensuel";

  const genreLabel =
    data.genre === "M" ? "Homme" : data.genre === "F" ? "Femme" : "Autre / Non-binaire";

  const situationProLabel = data.situationPro === "actif" ? "Actif(ve)" : "Inactif(ve)";

  const statutLabel: Record<string, string> = {
    ouvrier:     "Ouvrier",
    employe:     "Employé(e)",
    interimaire: "Intérimaire",
    etudiant:    "Étudiant(e)",
    apprenti:    "Apprenti(e)",
    cefa:        "CEFA / IFAPME",
    pfi:         "Contrat PFI",
    mutuelle:    "À la mutuelle",
  };

  const typeInactifLabel: Record<string, string> = {
    "pensionné":    "Pensionné(e)",
    "prepensionné": "Prépensionné(e)",
    "sans_emploi":  "Sans emploi",
    "autre":        data.autreInactifPrecision || "Autre",
  };

  const regimeLabel = (() => {
    if (data.regimeTravail === "temps-plein")    return "Temps plein";
    if (data.regimeTravail === "flexi")          return "Flexi-job";
    if (data.regimeTravail === "temps-partiel") {
      const detail = data.regimeTravailDetail === "plus20h"  ? " (≥ 20h/sem.)"
                   : data.regimeTravailDetail === "moins20h" ? " (< 20h/sem.)"
                   : "";
      return `Temps partiel${detail}`;
    }
    return "—";
  })();

  return (
    <Document
      title={`FGTB Affiliation — ${data.nom} ${data.prenom}`}
      author="FGTB"
      subject="Formulaire de demande d'affiliation"
    >
      <Page size="A4" style={pdfStyles.page}>

        {/* ── Bandeau rouge FGTB ─────────────────────────────────────────── */}
        <View style={pdfStyles.header}>
          <View style={pdfStyles.headerBadge}>
            <PDFText style={pdfStyles.headerBadgeText}>FGTB</PDFText>
          </View>
          <View>
            <PDFText style={pdfStyles.headerTitle}>Demande d&apos;affiliation</PDFText>
            <PDFText style={pdfStyles.headerSubtitle}>
              Fédération Générale du Travail de Belgique
            </PDFText>
          </View>
        </View>

        {/* ── Section 1 — Identité ────────────────────────────────────────── */}
        <View style={pdfStyles.section}>
          <PDFText style={pdfStyles.sectionTitle}>Identité</PDFText>
          <PdfRow label="Nom et prénom :" value={`${data.nom} ${data.prenom}`} />
          <PdfRow label="NISS :"          value={v(data.niss)} />
          <PdfRow label="Date de naissance :" value={v(data.dateNaissance)} />
          <PdfRow label="Lieu de naissance :" value={v(data.lieuNaissance)} />
          <PdfRow label="Nationalité :"   value={v(data.nationalite)} />
          <PdfRow label="Genre :"         value={genreLabel} />
          <PdfRow label="État civil :"    value={v(data.etatCivil)} />
          <PdfRow label="Email :"         value={v(data.email)} />
          <PdfRow label="Téléphone :"     value={v(data.tel)} />
          <PdfRow label="Adresse :"       value={v(adresseFull)} />
        </View>

        {/* ── Section 2 — Situation professionnelle ──────────────────────── */}
        <View style={pdfStyles.section}>
          <PDFText style={pdfStyles.sectionTitle}>Situation professionnelle</PDFText>
          <PdfRow label="Situation :" value={situationProLabel} />

          {data.situationPro === "actif" && (
            <>
              <PdfRow label="Type :"              value={statutLabel[data.statut] ?? v(data.statut)} />
              <PdfRow label="Entreprise :"        value={v(data.entreprise)} />
              <PdfRow
                label="Commission paritaire :"
                value={
                  data.secteur === "000" && data.secteurAutre
                    ? `Autre — ${data.secteurAutre}`
                    : commissionsParitaires.find((c) => c.id === data.secteur)?.label ?? v(data.secteur)
                }
              />
              <PdfRow label="N°ONSS / N° entreprise :" value={v(data.matriculeONSS)} />
              <PdfRow label="Date d'entrée :"     value={v(data.dateEntree)} />
              <PdfRow label="Régime de travail :" value={regimeLabel} />
            </>
          )}

          {data.situationPro === "inactif" && (
            <>
              <PdfRow label="Type :" value={typeInactifLabel[data.typeInactif] ?? v(data.typeInactif)} />
              {data.typeInactif === "sans_emploi" && data.allocationsChomage && (
                <PdfRow label="Allocations de chômage :" value={data.allocationsChomage === "oui" ? "Oui" : "Non"} />
              )}
            </>
          )}

          {data.autresCentraleFGTB && (
            <PdfRow label="Autre centrale FGTB :" value={data.autresCentraleFGTB === "oui" ? "Oui" : "Non"} />
          )}
          {data.centralesFGTBChoisie && (
            <PdfRow label="Centrale choisie :" value={data.centralesFGTBChoisie.replace(/_/g, " ")} />
          )}
          {data.provinceCentraleFGTB && (
            <PdfRow label="Province :" value={data.provinceCentraleFGTB} />
          )}
          {data.affilieAutreSyndicat && (
            <PdfRow label="Affilié autre syndicat :" value={data.affilieAutreSyndicat === "oui" ? "Oui" : "Non"} />
          )}
          {data.autreSyndicatChoix && (
            <PdfRow
              label="Syndicat :"
              value={
                data.autreSyndicatChoix === "csc"   ? "CSC / ACV"
                : data.autreSyndicatChoix === "cgslb" ? "CGSLB / ACLVB"
                : data.autreSyndicatAutreDetail || "Autre"
              }
            />
          )}
          {data.dossierJuridique && (
            <PdfRow label="Dossier juridique en cours :" value={data.dossierJuridique === "oui" ? "Oui" : "Non"} />
          )}
        </View>

        {/* ── Section 3 — Mandat SEPA ─────────────────────────────────────── */}
        <View style={pdfStyles.section}>
          <PDFText style={pdfStyles.sectionTitle}>Mandat SEPA — Paiement de la cotisation</PDFText>
          <PdfRow label="IBAN :"          value={v(data.iban)} />
          {data.bic && <PdfRow label="BIC / SWIFT :" value={data.bic} />}
          <PdfRow label="Mode de paiement :" value={modePaiementLabel} />
        </View>

        {/* ── Section 4 — Signature ────────────────────────────────────────── */}
        <View style={pdfStyles.section}>
          <PDFText style={pdfStyles.sectionTitle}>Signature du membre</PDFText>
          <View style={pdfStyles.signatureBox}>
            {data.signature ? (
              <PDFImage src={data.signature} style={pdfStyles.signatureImage} />
            ) : (
              <PDFText style={{ fontSize: 9, color: "#9ca3af" }}>
                (aucune signature fournie)
              </PDFText>
            )}
            <PDFText style={pdfStyles.signatureDate}>
              Signé électroniquement le {dateSignature}
            </PDFText>
          </View>
        </View>

        {/* ── Pied de page ─────────────────────────────────────────────────── */}
        <PDFText style={pdfStyles.footer}>
          FGTB — Fédération Générale du Travail de Belgique · Données traitées conformément au RGPD
        </PDFText>

      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. COMPOSANT PRINCIPAL — FormulaireWebIndependant
// ═══════════════════════════════════════════════════════════════════════════════
const MENTIONS_INIT = {
  assistance:  false,
  continuite:  false,
  information: false,
  accord:      false,
  rgpd:        false,
};

export default function FormulaireWebIndependant() {
  const [step,        setStep]        = useState(0);
  const [data,        setData]        = useState<FormData>(INIT);
  const [errors,      setErrors]      = useState<Errors>({});
  const [loading,     setLoading]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [serverError, setServerError] = useState("");
  const [nissInconnu, setNissInconnu] = useState(false);
  const [mentions,    setMentions]    = useState(MENTIONS_INIT);

  const allMentionsChecked = Object.values(mentions).every(Boolean);

  const toggleMention = (key: keyof typeof MENTIONS_INIT) =>
    setMentions((m) => ({ ...m, [key]: !m[key] }));

  /** Met à jour un seul champ sans toucher aux autres */
  const set = (field: keyof FormData) => (value: string) =>
    setData((d) => ({ ...d, [field]: value }));

  // ── Validation par étape ───────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Errors = {};

    if (step === 0) {
      if (!data.nom.trim())    e.nom    = "Champ obligatoire";
      if (!data.prenom.trim()) e.prenom = "Champ obligatoire";
      if (!nissInconnu) {
        if (!data.niss.trim()) {
          e.niss = "Champ obligatoire";
        } else if (!isValidNISS(data.niss)) {
          e.niss = "NISS invalide — vérifiez les 11 chiffres et le format AA.MM.JJ-XXX.CC";
        }
      }
      if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        e.email = "Adresse email invalide";
      if (!data.dateNaissance) e.dateNaissance = "Champ obligatoire";
    }
    if (step === 1) {
      if (!data.rue.trim())        e.rue        = "Champ obligatoire";
      if (!data.numero.trim())     e.numero     = "Champ obligatoire";
      if (!data.codePostal.trim()) e.codePostal = "Champ obligatoire";
      if (!data.localite.trim())   e.localite   = "Champ obligatoire";
      if (!data.pays.trim())       e.pays       = "Champ obligatoire";
    }
    if (step === 2) {
      if (!data.situationPro)
        e.situationPro = "Veuillez indiquer la situation professionnelle";

      if (data.situationPro === "actif") {
        if (!data.statut)             e.statut        = "Champ obligatoire";
        if (!data.entreprise.trim())  e.entreprise    = "Champ obligatoire";
        if (!data.secteur.trim())      e.secteur       = "Champ obligatoire";
        if (data.secteur === "000" && !data.secteurAutre.trim())
          e.secteurAutre = "Veuillez préciser le secteur";
        if (!data.regimeTravail)      e.regimeTravail = "Champ obligatoire";
        if (data.regimeTravail === "temps-partiel" && !data.regimeTravailDetail)
          e.regimeTravailDetail = "Champ obligatoire";
      }

      if (data.situationPro === "inactif") {
        if (!data.typeInactif)
          e.typeInactif = "Champ obligatoire";
        if (data.typeInactif === "sans_emploi" && !data.allocationsChomage)
          e.allocationsChomage = "Champ obligatoire";
        if (data.typeInactif === "autre" && !data.autreInactifPrecision.trim())
          e.autreInactifPrecision = "Champ obligatoire";
      }
    }
    if (step === 3) {
      if (data.autresCentraleFGTB === "oui" && !data.centralesFGTBChoisie)
        e.centralesFGTBChoisie = "Veuillez choisir une centrale";
      if (data.affilieAutreSyndicat === "oui" && !data.autreSyndicatChoix)
        e.autreSyndicatChoix = "Veuillez choisir un syndicat";
      if (data.autreSyndicatChoix === "autre" && !data.autreSyndicatAutreDetail.trim())
        e.autreSyndicatAutreDetail = "Champ obligatoire";
    }
    if (step === 4) {
      // Date d'affiliation
      if (!data.affiliationMois) e.affiliationMois = "Veuillez choisir un mois";
      if (!data.affiliationAnnee) e.affiliationAnnee = "Veuillez choisir une année";

      const ibanClean = data.iban.replace(/\s+/g, "").toUpperCase();
      if (!data.iban.trim()) {
        e.iban = "Champ obligatoire";
      } else if (!isValidIBAN(data.iban)) {
        e.iban = "IBAN invalide — vérifiez le numéro saisi (format : code pays + 2 chiffres + numéro de compte)";
      }
      // BIC obligatoire si le compte est hors Belgique
      if (ibanClean.length >= 2 && !ibanClean.startsWith("BE") && !data.bic.trim()) {
        e.bic = "BIC / SWIFT obligatoire pour un compte hors Belgique";
      } else if (data.bic.trim() && !isValidBIC(data.bic)) {
        e.bic = "Format BIC invalide — ex : GEBABEBB ou BNPAFRPPXXX";
      }
      if (!data.modePaiement) e.modePaiement = "Champ obligatoire";
      // Domiciliation : vérifier le titulaire du compte
      if (data.modePaiement === "domiciliation") {
        if (!data.titulaireDuCompte) e.titulaireDuCompte = "Veuillez répondre à cette question";
        if (data.titulaireDuCompte === "non" && !data.titulaireNomPrenom.trim())
          e.titulaireNomPrenom = "Veuillez indiquer le nom, prénom et lien du titulaire";
      }
    }
    if (step === 5) {
      if (!data.signature) e.signature = "La signature est obligatoire";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep((s) => Math.min(s + 1, 5)); };
  const prev = () => { setErrors({}); setStep((s) => Math.max(s - 1, 0)); };

  // ── Soumission vers Supabase ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setServerError("");

    const { error } = await supabase.from("web_affiliations").insert([{
      nom:                          data.nom,
      prenom:                       data.prenom,
      niss:                         nissInconnu ? null : data.niss,
      email:                        data.email,
      tel:                          data.tel,
      genre:                        data.genre,
      date_naissance:               data.dateNaissance,
      lieu_naissance:               data.lieuNaissance,
      nationalite:                  data.nationalite,
      etat_civil:                   data.etatCivil,
      rue:                          data.rue,
      numero:                       data.numero,
      boite:                        data.boite || null,
      code_postal:                  data.codePostal,
      localite:                     data.localite,
      pays:                         data.pays,
      situation_pro:                data.situationPro,
      statut:                       data.statut || null,
      type_inactif:                 data.typeInactif || null,
      allocations_chomage:          data.allocationsChomage || null,
      autre_inactif_precision:      data.autreInactifPrecision || null,
      entreprise:                   data.entreprise || null,
      secteur:                      data.secteur || null,
      secteur_autre:                data.secteurAutre || null,
      matricule_onss:               data.matriculeONSS || null,
      date_entree:                  data.dateEntree || null,
      regime_travail:               data.regimeTravail || null,
      regime_travail_detail:        data.regimeTravailDetail || null,
      autres_centrale_fgtb:          data.autresCentraleFGTB || null,
      centrales_fgtb_choisie:        data.centralesFGTBChoisie || null,
      province_centrale_fgtb:        data.provinceCentraleFGTB || null,
      affilie_autre_syndicat:        data.affilieAutreSyndicat || null,
      autre_syndicat_choix:          data.autreSyndicatChoix || null,
      autre_syndicat_autre_detail:   data.autreSyndicatAutreDetail || null,
      dossier_juridique:             data.dossierJuridique || null,
      affiliation_mois:             data.affiliationMois || null,
      affiliation_annee:            data.affiliationAnnee || null,
      iban:                         data.iban.replace(/\s/g, ""),
      bic:                          data.bic || null,
      mode_paiement:                data.modePaiement,
      titulaire_du_compte:          data.titulaireDuCompte || null,
      titulaire_nom_prenom:         data.titulaireNomPrenom || null,
      cotisation_mensuelle:         calculerCotisation(data)?.montant ?? null,
      cotisation_categorie:         calculerCotisation(data)?.categorie ?? null,
      mention_assistance:           mentions.assistance,
      mention_continuite:           mentions.continuite,
      mention_information:          mentions.information,
      mention_accord:               mentions.accord,
      mention_rgpd:                 mentions.rgpd,
      signature:                    data.signature,
      created_at:                   new Date().toISOString(),
    }]);

    setLoading(false);
    if (error) {
      setServerError("Une erreur s'est produite lors de l'envoi. Veuillez réessayer.");
    } else {
      setSubmitted(true);
    }
  };

  // ── Barre de progression (Stepper) ────────────────────────────────────────
  function Stepper() {
    return (
      <nav aria-label="Étapes du formulaire">
        <ol className="flex items-center justify-between">
          {STEPS.map(({ label, Icon }, i) => (
            <React.Fragment key={i}>
              <li className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`${i < step ? "Revenir à" : ""} étape ${i + 1} : ${label}`}
                  aria-current={i === step ? "step" : undefined}
                  onClick={() => { if (i < step) setStep(i); }}
                  className={[
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                    i === step ? "bg-red-700 border-red-700 text-white shadow-md scale-110" :
                    i < step   ? "bg-red-100 border-red-500 text-red-700 cursor-pointer hover:scale-105" :
                                 "bg-gray-100 border-gray-300 text-gray-400 cursor-default",
                  ].join(" ")}
                >
                  {i < step
                    ? <CheckCircle className="w-5 h-5" aria-hidden />
                    : <Icon className="w-5 h-5" aria-hidden />}
                </button>
                <span className={[
                  "text-xs font-medium hidden sm:block",
                  i === step ? "text-red-700" : i < step ? "text-red-400" : "text-gray-400",
                ].join(" ")}>
                  {label}
                </span>
              </li>
              {i < STEPS.length - 1 && (
                <li
                  aria-hidden
                  className={[
                    "flex-1 h-0.5 mx-1 sm:mx-2 transition-all duration-300",
                    i < step ? "bg-red-400" : "bg-gray-200",
                  ].join(" ")}
                />
              )}
            </React.Fragment>
          ))}
        </ol>
      </nav>
    );
  }

  // ── Page de confirmation ───────────────────────────────────────────────────
  if (submitted) {
    const pdfFileName = `FGTB_Affiliation_${data.nom}_${data.prenom}.pdf`;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">

          {/* Icône de succès */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-600" aria-hidden />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">Demande envoyée !</h1>
          <p className="text-gray-600 leading-relaxed">
            Votre demande d&apos;affiliation a bien été transmise.<br />
            Vous recevrez une confirmation à{" "}
            <strong className="text-gray-800">{data.email}</strong>.
          </p>

          {/* ── Bouton téléchargement PDF ─────────────────────────────────── */}
          <div className="mt-6 flex flex-col gap-3">
            <PDFDownloadLink
              document={<AffiliationDocument data={data} />}
              fileName={pdfFileName}
              className="flex items-center justify-center gap-2 px-6 py-2.5
                bg-red-700 text-white rounded-xl font-medium
                hover:bg-red-800 active:scale-95 transition shadow-sm"
              aria-label="Télécharger le dossier PDF"
            >
              {({ loading: pdfLoading }) =>
                pdfLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Génération du PDF…
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" aria-hidden />
                    Télécharger mon dossier PDF
                  </>
                )
              }
            </PDFDownloadLink>

            <button
              onClick={() => { setData(INIT); setStep(0); setSubmitted(false); setMentions(MENTIONS_INIT); }}
              className="px-6 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl
                font-medium hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition"
            >
              Nouvelle demande
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ── Formulaire principal ───────────────────────────────────────────────────
  const CurrentIcon = STEPS[step].Icon;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── En-tête FGTB ─────────────────────────────────────────────────── */}
        <header className="bg-red-700 rounded-2xl px-6 py-5 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-xl p-2.5 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/registericon.png"
                alt=""
                aria-hidden
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Logo CG Blanc.png"
                alt="FGTB"
                className="h-9 w-auto object-contain shrink-0"
              />
              <p className="text-white text-lg font-semibold leading-snug">
                Nouvelle demande d&apos;affiliation
              </p>
            </div>
          </div>
        </header>

        {/* ── Barre de progression ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
          <Stepper />
        </div>

        {/* ── Carte du formulaire ───────────────────────────────────────────── */}
        <main className="bg-white rounded-2xl shadow-sm p-6">

          {/* Titre de l'étape courante */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="bg-red-50 rounded-xl p-2">
              <CurrentIcon className="w-5 h-5 text-red-700" aria-hidden />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Étape {step + 1} sur {STEPS.length}
              </p>
              <h2 className="text-lg font-semibold text-gray-800">
                {STEPS[step].label}
              </h2>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              ÉTAPE 1 — IDENTITÉ
          ══════════════════════════════════════════════════════════════════ */}
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom de famille" required error={errors.nom}>
                <Input value={data.nom} onChange={set("nom")} placeholder="Dupont" />
              </Field>
              <Field label="Prénom" required error={errors.prenom}>
                <Input value={data.prenom} onChange={set("prenom")} placeholder="Jean" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="NISS — Numéro national" required={!nissInconnu} error={errors.niss}>
                  {!nissInconnu && (
                    <>
                      <Input
                        value={data.niss}
                        onChange={(rawVal) => {
                          const digits = rawVal.replace(/\D/g, "").slice(0, 11);
                          set("niss")(formatNiss(digits));
                        }}
                        placeholder="90.01.01-123.45"
                      />
                      {data.niss && !errors.niss && isValidNISS(data.niss) && (
                        <p className="flex items-center gap-1.5 text-xs text-green-600 mt-0.5">
                          <CheckCircle className="w-3.5 h-3.5" aria-hidden /> NISS valide
                        </p>
                      )}
                      {data.niss && !errors.niss && !isValidNISS(data.niss) && (
                        <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5" aria-hidden />
                          {data.niss.replace(/\D/g, "").length < 11
                            ? `${data.niss.replace(/\D/g, "").length}/11 chiffres`
                            : "Numéro incorrect (checksum invalide)"}
                        </p>
                      )}
                    </>
                  )}
                  <label className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={nissInconnu}
                      onChange={(e) => {
                        setNissInconnu(e.target.checked);
                        if (e.target.checked) set("niss")("");
                      }}
                      className="w-3.5 h-3.5 accent-red-600"
                    />
                    Numéro pas encore disponible
                  </label>
                </Field>
              </div>
              <Field label="Adresse email" required error={errors.email}>
                <Input
                  value={data.email}
                  onChange={set("email")}
                  type="email"
                  placeholder="jean@exemple.be"
                />
              </Field>
              <Field label="Téléphone" error={errors.tel}>
                <Input
                  value={data.tel}
                  onChange={set("tel")}
                  type="tel"
                  placeholder="+32 470 00 00 00"
                />
              </Field>
              <Field label="Genre" error={errors.genre}>
                <Select value={data.genre} onChange={set("genre")}>
                  <option value="M">Homme</option>
                  <option value="F">Femme</option>
                  <option value="X">Autre / Non-binaire</option>
                </Select>
              </Field>
              <Field label="Date de naissance" required error={errors.dateNaissance}>
                <DateInputFR value={data.dateNaissance} onChange={set("dateNaissance")} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Nationalité" error={errors.nationalite}>
                  <Input
                    value={data.nationalite}
                    onChange={set("nationalite")}
                    placeholder="Belge"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ÉTAPE 2 — ADRESSE
          ══════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-3">
                <Field label="Rue / Avenue" required error={errors.rue}>
                  {data.pays.trim().toLowerCase() === "belgique" ? (
                    <AddressAutocomplete
                      value={data.rue}
                      onChange={set("rue")}
                      onSelect={(s) =>
                        setData((d) => ({
                          ...d,
                          rue:        s.street,
                          numero:     s.housenumber || d.numero,
                          codePostal: s.postcode    || d.codePostal,
                          localite:   s.city        || d.localite,
                        }))
                      }
                    />
                  ) : (
                    <Input value={data.rue} onChange={set("rue")} placeholder="Rue de la Loi" />
                  )}
                </Field>
              </div>
              <Field label="N°" required error={errors.numero}>
                <Input value={data.numero} onChange={set("numero")} placeholder="1" />
              </Field>
              <Field label="Boîte" error={errors.boite}>
                <Input value={data.boite} onChange={set("boite")} placeholder="A" />
              </Field>
              <Field label="Code postal" required error={errors.codePostal}>
                <Input
                  value={data.codePostal}
                  onChange={set("codePostal")}
                  placeholder="1000"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Localité" required error={errors.localite}>
                  <Input
                    value={data.localite}
                    onChange={set("localite")}
                    placeholder="Bruxelles"
                  />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Pays" required error={errors.pays}>
                  <Input value={data.pays} onChange={set("pays")} placeholder="Belgique" />
                </Field>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ÉTAPE 3 — SITUATION PROFESSIONNELLE
          ══════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="flex flex-col gap-5">

              {/* ── Pré-choix principal : actif ou non ── */}
              <Field
                label="Êtes-vous actif(ve) professionnellement ?"
                required
                error={errors.situationPro}
              >
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "actif",   label: "Oui — actif(ve)",   desc: "Travaille, en formation, à la mutuelle…" },
                    { value: "inactif", label: "Non — inactif(ve)",  desc: "Pensionné(e), sans emploi, autre…" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={[
                        "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        data.situationPro === opt.value
                          ? "border-red-600 bg-red-50"
                          : "border-gray-200 hover:border-gray-300 bg-white",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="situationPro"
                        value={opt.value}
                        checked={data.situationPro === opt.value}
                        onChange={() =>
                          setData((d) => ({
                            ...d,
                            situationPro: opt.value,
                            ...(opt.value === "actif"
                              ? { typeInactif: "", allocationsChomage: "", autreInactifPrecision: "" }
                              : { statut: "", entreprise: "", secteur: "", secteurAutre: "", matriculeONSS: "", dateEntree: "", regimeTravail: "", regimeTravailDetail: "" }
                            ),
                          }))
                        }
                        className="mt-0.5 accent-red-600 w-4 h-4 shrink-0"
                      />
                      <div>
                        <p className={`text-sm font-semibold ${data.situationPro === opt.value ? "text-red-700" : "text-gray-800"}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

              {/* ══ Branche ACTIF ══ */}
              {data.situationPro === "actif" && (
                <>
                  {/* Type de situation active */}
                  <Field label="Type de situation" required error={errors.statut}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: "ouvrier",     label: "Ouvrier" },
                        { value: "employe",     label: "Employé(e)" },
                        { value: "interimaire", label: "Intérimaire" },
                        { value: "etudiant",    label: "Étudiant(e)" },
                        { value: "apprenti",    label: "Apprenti(e)" },
                        { value: "cefa",        label: "CEFA / IFAPME" },
                        { value: "pfi",         label: "Contrat PFI" },
                        { value: "mutuelle",    label: "À la mutuelle" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={[
                            "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm",
                            data.statut === opt.value
                              ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                              : "border-gray-200 hover:border-gray-300 text-gray-700",
                          ].join(" ")}
                        >
                          <input
                            type="radio"
                            name="statut"
                            value={opt.value}
                            checked={data.statut === opt.value}
                            onChange={() => set("statut")(opt.value)}
                            className="accent-red-600 w-3.5 h-3.5 shrink-0"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </Field>

                  {/* Champs liés à l'emploi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nom de l'entreprise / organisation" required error={errors.entreprise}>
                      <Input value={data.entreprise} onChange={set("entreprise")} placeholder="Acme S.A." />
                    </Field>
                    <Field label="Commission paritaire | Secteur d'activité" required error={errors.secteur}>
                      <CommissionSelect
                        value={data.secteur}
                        onChange={(v) => {
                          set("secteur")(v);
                          if (v !== "000") set("secteurAutre")("");
                        }}
                      />
                      {data.secteur === "000" && (
                        <div className="mt-2 flex flex-col gap-1">
                          <Input
                            value={data.secteurAutre}
                            onChange={set("secteurAutre")}
                            placeholder="Précisez votre secteur d'activité…"
                          />
                          {errors.secteurAutre && (
                            <p role="alert" className="flex items-center gap-1 text-xs text-red-600">
                              <AlertCircle className="w-3 h-3 shrink-0" aria-hidden /> {errors.secteurAutre}
                            </p>
                          )}
                        </div>
                      )}
                    </Field>
                    <Field label="N°ONSS (ou N° entreprise - N° TVA)" error={errors.matriculeONSS}>
                      <Input value={data.matriculeONSS} onChange={set("matriculeONSS")} placeholder="0000000000" />
                      <p className="text-xs text-gray-400 mt-0.5">N° ONSS disponible sur votre fiche de paie</p>
                    </Field>
                    <Field label="Date d'entrée en service" error={errors.dateEntree}>
                      <DateInputFR value={data.dateEntree} onChange={set("dateEntree")} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Régime de travail" required error={errors.regimeTravail}>
                        <Select
                          value={data.regimeTravail}
                          onChange={(v) => {
                            set("regimeTravail")(v);
                            if (v !== "temps-partiel") set("regimeTravailDetail")("");
                          }}
                        >
                          <option value="temps-plein">Temps plein</option>
                          <option value="temps-partiel">Temps partiel</option>
                          <option value="flexi">Flexi-job</option>
                        </Select>
                      </Field>

                      {/* Sous-question : volume horaire si temps partiel */}
                      {data.regimeTravail === "temps-partiel" && (
                        <Field
                          label="Volume horaire moyen"
                          required
                          error={errors.regimeTravailDetail}
                        >
                          <div className="flex gap-3 mt-1">
                            {[
                              { value: "plus20h",  label: "≥ 20h / semaine" },
                              { value: "moins20h", label: "< 20h / semaine" },
                            ].map((opt) => (
                              <label
                                key={opt.value}
                                className={[
                                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium flex-1 justify-center",
                                  data.regimeTravailDetail === opt.value
                                    ? "border-red-600 bg-red-50 text-red-700"
                                    : "border-gray-200 hover:border-gray-300 text-gray-700",
                                ].join(" ")}
                              >
                                <input
                                  type="radio"
                                  name="regimeTravailDetail"
                                  value={opt.value}
                                  checked={data.regimeTravailDetail === opt.value}
                                  onChange={() => set("regimeTravailDetail")(opt.value)}
                                  className="accent-red-600 w-4 h-4 shrink-0"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        </Field>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ══ Branche INACTIF ══ */}
              {data.situationPro === "inactif" && (
                <>
                  <Field label="Situation actuelle" required error={errors.typeInactif}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { value: "pensionné",    label: "Pensionné(e)" },
                        { value: "prepensionné", label: "Prépensionné(e)" },
                        { value: "sans_emploi",  label: "Sans emploi" },
                        { value: "autre",        label: "Autre (à préciser)" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={[
                            "flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all",
                            data.typeInactif === opt.value
                              ? "border-red-600 bg-red-50"
                              : "border-gray-200 hover:border-gray-300",
                          ].join(" ")}
                        >
                          <input
                            type="radio"
                            name="typeInactif"
                            value={opt.value}
                            checked={data.typeInactif === opt.value}
                            onChange={() =>
                              setData((d) => ({
                                ...d,
                                typeInactif: opt.value,
                                allocationsChomage: "",
                                autreInactifPrecision: "",
                              }))
                            }
                            className="accent-red-600 w-4 h-4 shrink-0"
                          />
                          <span className={`text-sm font-medium ${data.typeInactif === opt.value ? "text-red-700" : "text-gray-700"}`}>
                            {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </Field>

                  {/* Sous-question : allocations de chômage */}
                  {data.typeInactif === "sans_emploi" && (
                    <Field
                      label="Perçoit-il/elle des allocations de chômage ?"
                      required
                      error={errors.allocationsChomage}
                    >
                      <div className="flex gap-3">
                        {[
                          { value: "oui", label: "Oui" },
                          { value: "non", label: "Non" },
                        ].map((opt) => (
                          <label
                            key={opt.value}
                            className={[
                              "flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium",
                              data.allocationsChomage === opt.value
                                ? "border-red-600 bg-red-50 text-red-700"
                                : "border-gray-200 hover:border-gray-300 text-gray-700",
                            ].join(" ")}
                          >
                            <input
                              type="radio"
                              name="allocationsChomage"
                              value={opt.value}
                              checked={data.allocationsChomage === opt.value}
                              onChange={() => set("allocationsChomage")(opt.value)}
                              className="accent-red-600 w-4 h-4"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </Field>
                  )}

                  {/* Sous-question : précision si "autre" */}
                  {data.typeInactif === "autre" && (
                    <Field label="Précisez la situation" required error={errors.autreInactifPrecision}>
                      <Input
                        value={data.autreInactifPrecision}
                        onChange={set("autreInactifPrecision")}
                        placeholder="Ex : congé parental, invalidité…"
                      />
                    </Field>
                  )}
                </>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ÉTAPE 4 — TRANSFERT (facultatif)
          ══════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="flex flex-col gap-5">

              {/* ── Question 1 : Autre centrale FGTB ? ── */}
              <Field
                label="Êtes-vous affilié(e) à une autre centrale de la FGTB ?"
                error={errors.autresCentraleFGTB}
              >
                <div className="flex gap-3">
                  {[
                    { value: "oui", label: "Oui" },
                    { value: "non", label: "Non" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={[
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium",
                        data.autresCentraleFGTB === opt.value
                          ? "border-red-600 bg-red-50 text-red-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="autresCentraleFGTB"
                        value={opt.value}
                        checked={data.autresCentraleFGTB === opt.value}
                        onChange={() =>
                          setData((d) => ({
                            ...d,
                            autresCentraleFGTB: opt.value,
                            centralesFGTBChoisie: "",
                            provinceCentraleFGTB: "",
                          }))
                        }
                        className="accent-red-600 w-4 h-4 shrink-0"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </Field>

              {/* Sous-questions si oui : choix de la centrale + province */}
              {data.autresCentraleFGTB === "oui" && (
                <>
                  <Field
                    label="Quelle centrale ?"
                    required
                    error={errors.centralesFGTBChoisie}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: "centrale_jeunes",   label: "Centrale Jeunes" },
                        { value: "setca",             label: "Setca" },
                        { value: "horval",            label: "Horval (Alim.)" },
                        { value: "cgsp",              label: "CGSP" },
                        { value: "mwb",               label: "MWB (Métal)" },
                        { value: "ubt",               label: "UBT (Transport)" },
                        { value: "centrale_generale", label: "Centrale générale" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={[
                            "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm",
                            data.centralesFGTBChoisie === opt.value
                              ? "border-red-600 bg-red-50 text-red-700 font-semibold"
                              : "border-gray-200 hover:border-gray-300 text-gray-700",
                          ].join(" ")}
                        >
                          <input
                            type="radio"
                            name="centralesFGTBChoisie"
                            value={opt.value}
                            checked={data.centralesFGTBChoisie === opt.value}
                            onChange={() => set("centralesFGTBChoisie")(opt.value)}
                            className="accent-red-600 w-3.5 h-3.5 shrink-0"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </Field>

                  <Field
                    label="Dans quelle province ?"
                    error={errors.provinceCentraleFGTB}
                  >
                    <Input
                      value={data.provinceCentraleFGTB}
                      onChange={set("provinceCentraleFGTB")}
                      placeholder="Ex : Namur, Liège, Hainaut…"
                    />
                  </Field>
                </>
              )}

              {/* ── Question 2 : Autre syndicat ? ── */}
              <Field
                label="Êtes-vous affilié(e) à un autre syndicat ?"
                error={errors.affilieAutreSyndicat}
              >
                <div className="flex gap-3">
                  {[
                    { value: "oui", label: "Oui" },
                    { value: "non", label: "Non" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={[
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium",
                        data.affilieAutreSyndicat === opt.value
                          ? "border-red-600 bg-red-50 text-red-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="affilieAutreSyndicat"
                        value={opt.value}
                        checked={data.affilieAutreSyndicat === opt.value}
                        onChange={() =>
                          setData((d) => ({
                            ...d,
                            affilieAutreSyndicat: opt.value,
                            autreSyndicatChoix: "",
                            autreSyndicatAutreDetail: "",
                          }))
                        }
                        className="accent-red-600 w-4 h-4 shrink-0"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </Field>

              {/* Sous-questions si oui : quel syndicat (+ précision si "autre") */}
              {data.affilieAutreSyndicat === "oui" && (
                <>
                  <Field
                    label="Lequel ?"
                    required
                    error={errors.autreSyndicatChoix}
                  >
                    <Select
                      value={data.autreSyndicatChoix}
                      onChange={(v) => {
                        set("autreSyndicatChoix")(v);
                        if (v !== "autre") set("autreSyndicatAutreDetail")("");
                      }}
                      placeholder="Choisir…"
                    >
                      <option value="csc">CSC / ACV</option>
                      <option value="cgslb">CGSLB / ACLVB</option>
                      <option value="autre">Autre</option>
                    </Select>
                  </Field>

                  {data.autreSyndicatChoix === "autre" && (
                    <Field
                      label="Précisez le nom du syndicat"
                      required
                      error={errors.autreSyndicatAutreDetail}
                    >
                      <Input
                        value={data.autreSyndicatAutreDetail}
                        onChange={set("autreSyndicatAutreDetail")}
                        placeholder="Nom du syndicat…"
                      />
                    </Field>
                  )}
                </>
              )}

              {/* ── Question 3 : Dossier juridique en cours ? ──
                  Apparaît uniquement si au moins une des deux réponses précédentes est "oui" */}
              {(data.autresCentraleFGTB === "oui" || data.affilieAutreSyndicat === "oui") && (
                <Field
                  label="Avez-vous un dossier juridique en cours dans cet autre syndicat / cette autre centrale FGTB ?"
                  error={errors.dossierJuridique}
                >
                  <div className="flex gap-3">
                    {[
                      { value: "oui", label: "Oui" },
                      { value: "non", label: "Non" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={[
                          "flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium",
                          data.dossierJuridique === opt.value
                            ? "border-red-600 bg-red-50 text-red-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-700",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="dossierJuridique"
                          value={opt.value}
                          checked={data.dossierJuridique === opt.value}
                          onChange={() => set("dossierJuridique")(opt.value)}
                          className="accent-red-600 w-4 h-4 shrink-0"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </Field>
              )}

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ÉTAPE 5 — PAIEMENT & SIGNATURE
          ══════════════════════════════════════════════════════════════════ */}
          {step === 4 && (() => {
            // cotisation2026 sert uniquement à déterminer la catégorie et le montant de référence 2026
            const cotisation2026 = calculerCotisation(data);
            const montantMensuel2026 = cotisation2026
              ? cotisation2026.montant.toFixed(2).replace(".", ",")
              : null;

            const moisNum = parseInt(data.affiliationMois, 10);
            const annee   = data.affiliationAnnee; // "2025" ou "2026"

            // Calcul des échéances selon l'année d'affiliation
            let echeances2025: Echeance[] | null = null;
            let echeances2026: Echeance[] | null = null;

            if (cotisation2026 && data.affiliationMois && annee && !isNaN(moisNum)) {
              const cat = cotisation2026.categorie;

              if (annee === "2025") {
                // Solde 2025 : mois restants dans l'année, par trimestre, aux tarifs 2025
                const tarif2025 = getMontantParAnnee(cat, "2025") ?? cotisation2026.montant;
                echeances2025 = calculerEcheancesTrimestrielles(tarif2025, moisNum, "2025");
                // Année 2026 complète (4 trimestres) aux tarifs 2026
                echeances2026 = calculerEcheancesTrimestrielles(cotisation2026.montant, 1, "2026");
              } else {
                // Affiliation directement en 2026 : seulement 2026
                echeances2026 = calculerEcheancesTrimestrielles(cotisation2026.montant, moisNum, "2026");
              }
            }

            // Alias rétrocompatible pour les autres usages
            const cotisation = cotisation2026;
            const montantMensuel = montantMensuel2026;

            // Échéancier domiciliation (prélèvements par 3 mois jusqu'à déc. 2026)
            const echeancesDom = cotisation2026 && data.affiliationMois && data.affiliationAnnee && !isNaN(moisNum)
              ? calculerEcheancesDomiciliation(moisNum, data.affiliationAnnee, cotisation2026.categorie)
              : null;

            return (
              <div className="flex flex-col gap-5">

                {/* ── 1. Date d'affiliation ── */}
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" aria-hidden />
                    Date d&apos;affiliation
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Mois" required error={errors.affiliationMois}>
                      <select
                        value={data.affiliationMois}
                        onChange={(e) => set("affiliationMois")(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm
                          bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                      >
                        <option value="">Choisir un mois…</option>
                        {MONTHS_FR.map((m, i) => (
                          <option key={i + 1} value={String(i + 1)}>{m}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Année" required error={errors.affiliationAnnee}>
                      <select
                        value={data.affiliationAnnee}
                        onChange={(e) => set("affiliationAnnee")(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm
                          bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                      >
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                      </select>
                    </Field>
                  </div>
                </div>

                {/* ── 2. Cotisation calculée (Barème 2026) ── */}
                {cotisation ? (
                  <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4 flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      Cotisation calculée — Barème 2026
                    </p>
                    <p className="text-2xl font-bold text-green-800">
                      {montantMensuel} €
                      <span className="text-sm font-normal text-green-600 ml-2">/ mois</span>
                    </p>
                    <p className="text-xs text-green-700">
                      {cotisation.categorie} — {cotisation.label}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 inline mr-1.5" aria-hidden />
                    Le montant de la cotisation ne peut pas encore être calculé.
                    Vérifiez les informations saisies aux étapes précédentes.
                  </div>
                )}

                {/* ── 3. Mode de paiement ── */}
                <Field label="Mode de paiement" required error={errors.modePaiement}>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {[
                      { value: "domiciliation", label: "Domiciliation automatique", desc: "Prélèvement mensuel automatique sur votre compte." },
                      { value: "virement",      label: "Virement trimestriel",      desc: "Vous effectuez un virement tous les 3 mois." },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={[
                          "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer flex-1 transition-all",
                          data.modePaiement === opt.value
                            ? "border-red-600 bg-red-50"
                            : "border-gray-200 hover:border-gray-300 bg-white",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="modePaiement"
                          value={opt.value}
                          checked={data.modePaiement === opt.value}
                          onChange={() =>
                            setData((d) => ({
                              ...d,
                              modePaiement: opt.value,
                              titulaireDuCompte: "",
                              titulaireNomPrenom: "",
                            }))
                          }
                          className="mt-0.5 accent-red-600 w-4 h-4 shrink-0"
                        />
                        <div>
                          <p className={`text-sm font-semibold ${
                            data.modePaiement === opt.value ? "text-red-700" : "text-gray-800"
                          }`}>{opt.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </Field>

                {/* ── 4a. Détails VIREMENT ── */}
                {data.modePaiement === "virement" && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col gap-3 text-sm">
                    <p className="font-semibold text-blue-800">Informations de paiement par virement</p>

                    {/* Aucun mois/année sélectionné */}
                    {!echeances2026 && !echeances2025 && (
                      <div className="bg-white rounded-lg border border-blue-200 px-4 py-3 text-xs text-gray-500">
                        Sélectionnez un mois et une année pour afficher l&apos;échéancier.
                      </div>
                    )}

                    {/* ── Tableau helper inline ── */}
                    {([
                      echeances2025
                        ? { rows: echeances2025, label: "Solde 2025 — Barème 2025", totalLabel: "Total 2025", color: "amber" }
                        : null,
                      echeances2026
                        ? { rows: echeances2026, label: "Échéancier 2026 — Barème 2026", totalLabel: "Total 2026", color: "blue" }
                        : null,
                    ] as Array<{ rows: Echeance[]; label: string; totalLabel: string; color: "amber" | "blue" } | null>)
                      .filter(Boolean)
                      .map((bloc, bi) => {
                        const b = bloc!;
                        const isAmber = b.color === "amber";
                        const headerCls = isAmber
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800";
                        const footerCls = isAmber
                          ? "bg-amber-100 border-amber-200 text-amber-900"
                          : "bg-blue-100 border-blue-200 text-blue-900";
                        const labelCls = isAmber
                          ? "text-amber-700"
                          : "text-blue-700";
                        const borderCls = isAmber
                          ? "border-amber-200"
                          : "border-blue-200";
                        return (
                          <div key={bi} className="flex flex-col gap-1.5">
                            <p className={`text-xs font-semibold uppercase tracking-wide ${labelCls}`}>
                              {b.label}
                            </p>
                            <div className={`overflow-hidden rounded-lg border ${borderCls} bg-white`}>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className={headerCls}>
                                    <th className="px-3 py-2 text-left font-semibold">Période</th>
                                    <th className="px-3 py-2 text-left font-semibold">Mois</th>
                                    <th className="px-3 py-2 text-right font-semibold">Montant</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {b.rows.map((e, i) => (
                                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                                      <td className="px-3 py-2 font-medium text-gray-800">{e.nom}</td>
                                      <td className="px-3 py-2 text-gray-600">
                                        {e.periode}
                                        {e.nbMois < 3 && (
                                          <span className="ml-1 text-amber-600">({e.nbMois} mois)</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold text-gray-900 font-mono">
                                        {e.montant.toFixed(2).replace(".", ",")} €
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className={`border-t ${footerCls}`}>
                                    <td colSpan={2} className="px-3 py-2 font-semibold text-xs">
                                      {b.totalLabel}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold font-mono">
                                      {b.rows.reduce((s, e) => s + e.montant, 0).toFixed(2).replace(".", ",")} €
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        );
                      })
                    }

                    {(echeances2025 || echeances2026) && (
                      <p className="text-xs text-blue-600 italic">
                        Chaque virement est dû pour le 15 du premier mois du trimestre concerné.
                      </p>
                    )}

                    {/* Coordonnées bancaires */}
                    <div className="bg-white rounded-lg border border-blue-200 px-4 py-3 flex flex-col gap-1.5 text-blue-900">
                      <p className="font-semibold text-blue-700 text-xs uppercase tracking-wide mb-1">Coordonnées de virement</p>
                      <p><span className="font-bold">Compte :</span> <span className="font-mono">BE94 8791 5049 0114</span></p>
                      <p><span className="font-bold">Nom :</span> Centrale Générale FGTB Namur Luxembourg</p>
                      <p>
                        <span className="font-bold">Communication :</span>{" "}
                        {data.niss && (
                          <span className="font-mono font-semibold mr-1">{data.niss.replace(/\D/g, "")}</span>
                        )}
                        <span className={data.niss ? "text-gray-700" : "italic text-amber-700"}>
                          votre numéro de registre national (NISS)
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* ── 4b. Détails DOMICILIATION ── */}
                {data.modePaiement === "domiciliation" && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 flex flex-col gap-3 text-sm">
                    <p className="font-semibold text-purple-800">Mandat de domiciliation SEPA</p>

                    <div className="bg-white rounded-lg border border-purple-200 px-4 py-3 flex flex-col gap-1 text-xs text-purple-900">
                      <p className="font-semibold text-purple-700 uppercase tracking-wide text-xs mb-1">Créancier</p>
                      <p className="font-semibold">Centrale Générale FGTB Namur – Luxembourg</p>
                      <p>Rue Fonteny Maroy 13, 6800 Libramont-Chevigny</p>
                      <p>Identifiant créancier : <span className="font-mono font-semibold">BE00000647821</span></p>
                    </div>

                    {/* Phrase explicative */}
                    <div className="bg-purple-100 rounded-lg px-3 py-2 text-xs text-purple-800 leading-relaxed">
                      Le prélèvement automatique démarre le <span className="font-semibold">10 du mois suivant votre inscription</span>.
                      Chaque prélèvement couvre les <span className="font-semibold">3 mois les plus anciens</span> non encore réglés,
                      jusqu&apos;à ce que votre compte soit en ordre.
                    </div>

                    {/* Échéancier domiciliation */}
                    {echeancesDom ? (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                          Échéancier des prélèvements — jusqu&apos;à décembre 2026
                        </p>
                        <div className="overflow-hidden rounded-lg border border-purple-200 bg-white">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-purple-100 text-purple-800">
                                <th className="px-3 py-2 text-left font-semibold">Date du prélèvement</th>
                                <th className="px-3 py-2 text-left font-semibold">Mois couverts</th>
                                <th className="px-3 py-2 text-right font-semibold">Montant</th>
                              </tr>
                            </thead>
                            <tbody>
                              {echeancesDom.map((e, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-purple-50/40"}>
                                  <td className="px-3 py-2 font-medium text-purple-900 whitespace-nowrap">{e.datePrelevement}</td>
                                  <td className="px-3 py-2 text-gray-600">{e.moisCouverts.join(", ")}</td>
                                  <td className="px-3 py-2 text-right font-bold text-purple-900 font-mono whitespace-nowrap">
                                    {e.montant.toFixed(2).replace(".", ",")} €
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : cotisation ? (
                      <div className="bg-white rounded-lg border border-purple-200 px-4 py-2 text-xs text-purple-900">
                        Sélectionnez une date d&apos;affiliation pour afficher l&apos;échéancier.
                      </div>
                    ) : null}

                    <Field label="Êtes-vous le/la titulaire du compte bancaire ?" required error={errors.titulaireDuCompte}>
                      <div className="flex gap-3 mt-1">
                        {[
                          { value: "oui", label: "Oui, c'est mon compte" },
                          { value: "non", label: "Non, compte d'un tiers" },
                        ].map((opt) => (
                          <label
                            key={opt.value}
                            className={[
                              "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium flex-1 justify-center",
                              data.titulaireDuCompte === opt.value
                                ? "border-red-600 bg-red-50 text-red-700"
                                : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white",
                            ].join(" ")}
                          >
                            <input
                              type="radio"
                              name="titulaireDuCompte"
                              value={opt.value}
                              checked={data.titulaireDuCompte === opt.value}
                              onChange={() =>
                                setData((d) => ({
                                  ...d,
                                  titulaireDuCompte: opt.value,
                                  titulaireNomPrenom: opt.value === "oui" ? "" : d.titulaireNomPrenom,
                                }))
                              }
                              className="accent-red-600 w-4 h-4 shrink-0"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </Field>

                    {data.titulaireDuCompte === "non" && (
                      <Field
                        label="Nom, Prénom et lien de parenté / rôle du titulaire"
                        required
                        error={errors.titulaireNomPrenom}
                      >
                        <Input
                          value={data.titulaireNomPrenom}
                          onChange={set("titulaireNomPrenom")}
                          placeholder="Ex : Dupont Marie — épouse / tuteur légal…"
                        />
                      </Field>
                    )}
                  </div>
                )}

                {/* ── 5. Bloc RIB (IBAN / BIC) ── */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-semibold text-gray-700">Relevé d&apos;identité bancaire (RIB)</span>
                    {" "}— Renseignez les coordonnées du compte sur lequel la cotisation sera prélevée.
                    Le BIC / SWIFT est{" "}
                    <span className="font-semibold text-red-700">obligatoire pour tout compte hors Belgique</span>.
                  </p>

                  <Field label="IBAN — Numéro de compte bancaire (international)" required error={errors.iban}>
                    <Input
                      value={data.iban}
                      onChange={(rawVal) => {
                        const clean     = rawVal.replace(/\s/g, "").toUpperCase();
                        const formatted = clean.replace(/(.{4})/g, "$1 ").trim();
                        set("iban")(formatted);
                      }}
                      placeholder="BE68 5390 0754 7034 — ou FR76 3000 6000…"
                    />
                    {data.iban && !errors.iban && isValidIBAN(data.iban) && (
                      <p className="flex items-center gap-1.5 text-xs text-green-600 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5" aria-hidden />
                        IBAN valide
                        {ibanCountryCode(data.iban) === "BE"
                          ? " — compte belge"
                          : ` — compte ${ibanCountryCode(data.iban)} (BIC obligatoire)`}
                      </p>
                    )}
                  </Field>

                  <Field
                    label={
                      data.iban && ibanCountryCode(data.iban) !== "BE" && ibanCountryCode(data.iban).length === 2
                        ? "BIC / SWIFT (obligatoire — compte hors Belgique)"
                        : "BIC / SWIFT (obligatoire si compte hors Belgique)"
                    }
                    required={
                      data.iban.replace(/\s/g, "").length >= 2 &&
                      ibanCountryCode(data.iban) !== "BE"
                    }
                    error={errors.bic}
                  >
                    <Input
                      value={data.bic}
                      onChange={(val) => set("bic")(val.toUpperCase().replace(/\s/g, ""))}
                      placeholder="GEBABEBB"
                    />
                    {data.bic && !errors.bic && isValidBIC(data.bic) && (
                      <p className="flex items-center gap-1.5 text-xs text-green-600 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5" aria-hidden /> BIC valide
                      </p>
                    )}
                  </Field>
                </div>

              </div>
            );
          })()}

          {/* ══════════════════════════════════════════════════════════════════
              ÉTAPE 6 — VALIDATION & SIGNATURE
          ══════════════════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="flex flex-col gap-5">

              {/* ── Introduction ── */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 leading-relaxed">
                Avant de soumettre votre demande, veuillez lire attentivement chaque mention
                ci-dessous et cocher les cases correspondantes.{" "}
                <span className="font-semibold text-gray-800">Toutes les cases sont obligatoires.</span>
              </div>

              {/* ── Cases à cocher ── */}
              <div className="flex flex-col gap-3">
                {([
                  {
                    key: "assistance" as const,
                    label: (
                      <>
                        <span className="font-semibold">Assistance juridique —</span>{" "}
                        Je suis informé(e) que la Centrale Générale FGTB Namur Luxembourg peut m&apos;informer
                        et m&apos;assister uniquement dans un dossier lié au droit du travail belge.
                        Seule la Centrale Générale FGTB Namur Luxembourg estimera la nécessité
                        d&apos;une action en justice.
                      </>
                    ),
                  },
                  {
                    key: "continuite" as const,
                    label: (
                      <>
                        <span className="font-semibold">Continuité d&apos;affiliation —</span>{" "}
                        En cas de retard dans le paiement de mes cotisations, j&apos;autorise la
                        Centrale Générale FGTB Namur Luxembourg à prélever des cotisations syndicales
                        sur tout avantage sectoriel ou prime que je lui confie pour paiement afin de
                        permettre la continuité de mon affiliation.
                      </>
                    ),
                  },
                  {
                    key: "information" as const,
                    label: (
                      <>
                        <span className="font-semibold">Obligation d&apos;information —</span>{" "}
                        Je m&apos;engage à informer spontanément et immédiatement la Centrale Générale
                        FGTB Namur Luxembourg de tout changement dans mes coordonnées et / ou ma situation
                        professionnelle par écrit (courrier recommandé ou email à{" "}
                        <span className="font-mono text-xs">admin.nalux@accg.be</span>).
                        Dans le cas contraire, la Centrale Générale FGTB Namur Luxembourg déclinera
                        toute responsabilité en cas de préjudices et aucun remboursement de cotisations
                        ne pourra être effectué.
                      </>
                    ),
                  },
                  {
                    key: "accord" as const,
                    label: (
                      <>
                        <span className="font-semibold">Accord général —</span>{" "}
                        Je déclare avoir pris connaissance des droits et obligations des membres de la
                        Centrale Générale FGTB Namur Luxembourg et marque mon accord à ce sujet.
                      </>
                    ),
                  },
                  {
                    key: "rgpd" as const,
                    label: (
                      <>
                        <span className="font-semibold">RGPD —</span>{" "}
                        J&apos;accepte que mes données soient traitées par la FGTB Namur-Luxembourg
                        conformément à la politique de confidentialité en vigueur pour la gestion de
                        mon affiliation et de mes services syndicaux.
                      </>
                    ),
                  },
                ] as { key: keyof typeof MENTIONS_INIT; label: React.ReactNode }[]).map(({ key, label }) => (
                  <label
                    key={key}
                    className={[
                      "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      mentions[key]
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300 bg-white",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={mentions[key]}
                      onChange={() => toggleMention(key)}
                      className="mt-0.5 w-4 h-4 shrink-0 accent-green-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 leading-relaxed">{label}</span>
                  </label>
                ))}
              </div>

              {/* ── Récapitulatif des cases ── */}
              {!allMentionsChecked && (
                <p className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
                  {Object.values(mentions).filter(Boolean).length} / 5 mentions acceptées —
                  cochez toutes les cases pour pouvoir soumettre votre demande.
                </p>
              )}

              {/* ── Signature manuscrite ── */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <PenLine className="w-4 h-4 shrink-0 text-gray-500" aria-hidden />
                  Signature manuscrite
                  <span className="text-red-600 ml-0.5" aria-hidden>*</span>
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  En signant ci-dessous, vous confirmez que toutes les informations fournies
                  sont exactes et que vous acceptez les conditions ci-dessus.
                </p>
                <SignatureCanvas value={data.signature} onChange={set("signature")} />
                {errors.signature && (
                  <p role="alert" className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="w-3 h-3 shrink-0" aria-hidden /> {errors.signature}
                  </p>
                )}
              </div>

              {/* ── Erreur serveur éventuelle ── */}
              {serverError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 bg-red-50 border border-red-200
                    text-red-700 rounded-xl p-4 text-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
                  {serverError}
                </div>
              )}

            </div>
          )}

          {/* ── Navigation Précédent / Suivant ─────────────────────────────── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {/* Bouton Précédent — masqué à la première étape */}
            {step > 0 ? (
              <button
                type="button"
                onClick={prev}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2
                  border-gray-200 text-gray-600 font-medium hover:border-gray-300
                  hover:bg-gray-50 active:scale-95 transition"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden /> Précédent
              </button>
            ) : <div aria-hidden />}

            {/* Bouton Suivant ou Soumettre à la dernière étape */}
            {step < 5 ? (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl
                  bg-red-700 text-white font-medium hover:bg-red-800
                  active:scale-95 transition shadow-sm"
              >
                Suivant <ChevronRight className="w-4 h-4" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !allMentionsChecked || !data.signature}
                title={
                  !allMentionsChecked
                    ? "Cochez toutes les cases obligatoires pour continuer"
                    : !data.signature
                    ? "Votre signature est obligatoire"
                    : undefined
                }
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl
                  bg-red-700 text-white font-medium hover:bg-red-800
                  active:scale-95 transition shadow-sm
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Envoi en cours…</>
                  : <><Send className="w-4 h-4" aria-hidden /> Soumettre ma demande</>}
              </button>
            )}
          </div>
        </main>

        {/* ── Pied de page ─────────────────────────────────────────────────── */}
        <footer className="text-center text-xs text-gray-400 pb-4 space-y-1">
          <p>Centrale Générale FGTB Namur Luxembourg</p>
          <p>Vos données personnelles sont traitées conformément au règlement européen RGPD.</p>
        </footer>

      </div>
    </div>
  );
}
