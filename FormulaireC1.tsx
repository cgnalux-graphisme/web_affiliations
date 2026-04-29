"use client";

import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, FileDown, ChevronRight, ChevronLeft } from "lucide-react";
import type { C1Data, CohabitantRow } from "./app/api/fill-c1/route";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Valeurs initiales ────────────────────────────────────────────────────────
const EMPTY: C1Data = {
  niss: "", nom: "", prenom: "", dateNaissance: "", nationalite: "Belge",
  rue: "", numero: "", boite: "", codePostal: "", commune: "", pays: "Belgique",
  email: "", telephone: "",
  motifDemandeAlloc: false, motifDemandeAllocDate: "",
  motifFormationAlternance: "", motifPremiereFois: false, motifApresInterruption: false,
  motifChangementOrganisme: false, motifChangementOrganismeDate: "",
  motifModification: false,
  motifModifAdresse: false, motifModifAdresseDate: "",
  motifModifCotisationSyndicale: false, motifModifPermis: false,
  motifModifSituationPersonnelle: false, motifModifSituationPersonnelleDate: "",
  motifModifModePaiement: false, motifModifModePaiementDate: "",
  sitFamHabiteSeul: false,
  sitFamPensionAlimentaire: false, sitFamPensionCopie: "",
  sitFamSepareDesFait: false, sitFamSepareCopie: "",
  sitFamRemarques: "", sitFamCohabite: false, cohabitants: [],
  sitFamRemarquesCohabitants: "",
  partenaireNom: "", partenaireDeclaration: "",
  actEtudesPleinExercice: "non", actEtudesDate: "",
  actApprentissage: "non", actApprentissageDate: "",
  actFormationSyntra: "non", actFormationSyntraDate: "",
  actMandatCulturel: "non", actMandatCulturelDecl: "",
  actMandatPolitique: "non", actMandatPolitiqueDecl: "",
  actChapitreXII: "non",
  actTremplin: "non", actTremplinDecl: "",
  actActiviteAccessoire: "non", actAdminSociete: "non",
  actInscritIndependant: "non", actIndependantDecl: "",
  revPensionComplete: "non", revPensionCompleteDecl: "",
  revPensionRetraite: "non", revIndemnitesMaladie: "non",
  revIndemnitesAccident: "non", revAvantageFinancier: "non",
  paiementVirement: true, paiementCompteAMonNom: "oui", paiementNomTitulaire: "",
  paiementIban: "", paiementBic: "", paiementCheque: false,
  cotisationAction: "none", cotisationMoisAnnee: "",
  natApplicable: false, natRefugie: "", natApatride: "", natDocumentSejour: "",
  natAccesMarchePro: "", natDescriptionLimitation: "",
  divCongesSansSolde: "non", divCongesDu: "", divCongesAu: "", divIncapacite33: "non",
  declAffirme: false, declLuFeuille: false, declSaitCommuniquer: false,
  declDocsAttestation: false, declDocsExtrait: false,
  declDocsAnnexeRegis: false, declDocsPermis: false, declDocsAutre: "",
  dateSig: "",
  signature: "",
};

const EMPTY_COHABITANT: CohabitantRow = {
  nomPrenom: "", lienParente: "", dateNaissance: "",
  allocFamiliales: false, typeActivite: "", montantActivite: "",
  typeRevenu: "", montantRevenu: "",
};

// ── Textes officiels — Feuille info ONEM (verbatim) ──────────────────────────
const TIPS: Record<string, string> = {
  "1":  "Vous trouverez votre numéro NISS, votre numéro d'identification de la sécurité sociale, au verso de votre carte d'identité. Les six premiers chiffres sont en principe ceux de votre date de naissance (année, mois et jour).",
  "2":  "Attention ! Mentionnez l'adresse où vous habitez effectivement. Cette adresse doit correspondre à l'adresse où vous êtes domicilié. Si vous changez d'adresse, vous mentionnez votre nouvelle adresse ici.\n\nSituation particulière : si vous êtes inscrit à une adresse de référence CPAS, vous mentionnez cette adresse et vous ajoutez 'adresse de référence CPAS'.",
  "3":  "Mentionnez votre nationalité. Le cas échéant, indiquez 'apatride reconnu' (voir aussi (31)).",
  "4":  "Si vous demandez des allocations pour la première fois ou si vous changez d'organisme de paiement.\n\nVous devez compléter toutes les rubriques sauf les rubriques 'MA COTISATION SYNDICALE', et 'TRAVAILLEUR AYANT UNE NATIONALITE AUTRE QUE CELLE D'UN PAYS DE L'EEE OU DE LA SUISSE'. Vous ne complétez la rubrique 'MA COTISATION SYNDICALE' que si vous êtes syndiqué et que vous autorisez la retenue de la cotisation syndicale sur vos allocations.",
  "5":  "Si vous demandez à nouveau des allocations après une interruption de plus d'un an.\n\nVous devez compléter toutes les rubriques sauf les 'MA COTISATION SYNDICALE' et 'TRAVAILLEUR AYANT UNE NATIONALITE AUTRE QUE CELLE D'UN PAYS DE L'EEE OU DE LA SUISSE'. Vous ne complétez ces rubriques que si ces données ont changé depuis votre précédente déclaration.",
  "6":  "Si votre adresse change et que vous l'avez mentionnée à la rubrique 'MON IDENTITE'.\n\nComplétez les rubriques 'MA SITUATION FAMILIALE' et 'MA DECLARATION'. Vous ne complétez les autres rubriques que si ces données ont changé depuis votre précédente déclaration.\n\nSi vous êtes inscrit comme demandeur d'emploi, communiquez aussi votre changement d'adresse au service de placement (FOREM, ACTIRIS, Arbeitsamt der DG, VDAB ou MAISON DE L'EMPLOI) auprès duquel vous êtes inscrit.",
  "7":  "Si des modifications interviennent dans votre situation personnelle ou dans celle des personnes avec lesquelles vous cohabitez.\n\nVous devez déclarer toute modification relative aux données mentionnées dans ce formulaire, qui interviendrait dans votre situation personnelle ou dans celle des personnes avec lesquelles vous cohabitez.\n\nPar exemple : votre partenaire ou un autre membre du ménage débute une activité professionnelle, vos parents cohabitants deviennent pensionnés, votre enfant cohabitant devient chômeur, vous commencez à aider un indépendant, …",
  "8":  "Si en tant que membre d'un syndicat, vous autorisez la retenue de votre cotisation syndicale sur vos allocations ou si vous retirez votre précédente autorisation.\n\nComplétez les rubriques 'MA COTISATION SYNDICALE' et 'MA DECLARATION'. Vous ne complétez les autres rubriques que si ces données ont changé depuis votre précédente déclaration.",
  "9":  "Si le mode de paiement de vos allocations ou votre numéro de compte change.\n\nComplétez les rubriques 'MODE DE PAIEMENT DE MES ALLOCATIONS' et 'MA DECLARATION'. Vous ne complétez les autres rubriques que si ces données ont changé depuis votre précédente déclaration.",
  "10": "Si vous introduisez une prolongation de votre permis de séjour et/ou permis de travail. (voir également (31)).\n\nComplétez les rubriques 'TRAVAILLEUR AYANT UNE NATIONALITE AUTRE QUE CELLE D'UN PAYS DE L'EEE OU DE LA SUISSE' et 'MA DECLARATION'. Vous ne complétez les autres rubriques que si ces données ont changé depuis votre précédente déclaration.",
  "11": "Attention ! Déclarez votre situation familiale réelle. S'il est constaté que votre situation familiale ne correspond pas à vos déclarations, vous pouvez être sanctionné.",
  "12": "Vous habitez seul lorsqu'il n'y a pas d'autres personnes qui font partie de votre ménage.\n\nSituation particulière : Vous êtes censé continuer à cohabiter avec quelqu'un lorsqu'il (elle) travaille temporairement à l'étranger, est emprisonné(e) ou séjourne en institution pour malades mentaux. Mentionnez 'emprisonnement' ou 'internement' et la date de début de celui-ci après « Remarques ». Si vous n'êtes pas sûr d'être considéré comme habitant seul, décrivez votre situation après « Remarques ».",
  "13": "Vous pouvez obtenir des allocations comme travailleur ayant charge de famille lorsque vous habitez seul et que :\n- vous payez effectivement une pension alimentaire en exécution d'une décision judiciaire ;\n- vous payez effectivement une pension alimentaire suite à un acte notarié dans le cadre d'une procédure de divorce ;\n- vous êtes séparé de fait et un jugement autorise votre conjoint à percevoir une partie de vos revenus en vertu d'une délégation de sommes (art. 221 du Code civil) ;\n- vous payez effectivement une pension alimentaire en faveur de votre enfant sur la base d'un acte notarié.",
  "14": "Vous cohabitez avec quelqu'un lorsque cette personne fait partie de votre ménage, même si cette personne est domiciliée à une autre adresse.",
  "15": "Selon la relation que vous avez avec la personne avec laquelle vous cohabitez, vous mentionnez :\n- 'conjoint' ;\n- 'partenaire' (peu importe le sexe). Si votre partenaire n'a pas de revenus (ou a de faibles revenus) et est financièrement à votre charge, vous ajoutez 'financièrement à charge' ;\n- 'enfant' ;\n- le lien de parenté p.ex. père, neveu, oncle, … ;\n- 'aucun' s'il n'y a pas de lien de parenté.",
  "15bis": "Si vous avez mentionné dans la grille que votre partenaire ou une autre personne (pas votre enfant) est financièrement à votre charge, vous répondez aux questions en dessous de la grille. Votre partenaire ou la personne à charge signe vos déclarations. Les déclarations concernant le partenaire ou la personne à charge peuvent également être mentionnées sur un FORMULAIRE C1-PARTENAIRE séparé. Demandez des explications à votre organisme de paiement.",
  "16": "Vous indiquez une croix dans cette colonne si vous percevez les allocations familiales (c'est-à-dire si vous êtes 'l'allocataire'). Le fait que vous soyez également 'l'attributaire', à savoir que le droit aux allocations familiales découle de votre statut, n'a pas d'importance.",
  "17": "Mentionnez l'activité professionnelle des personnes avec lesquelles vous cohabitez :\n- 'salarié' et la nature de l'activité ;\n- 'indépendant' : déclarez chaque activité indépendante des membres de votre famille ;\n- 'aucune' lorsque la personne n'a aucune activité professionnelle ni comme salarié ni comme indépendant ou lorsqu'elle reçoit des allocations de chômage complet.",
  "18": "Vous ne devez mentionner le montant des revenus professionnels que dans les situations suivantes :\n- si votre conjoint ou partenaire est travailleur salarié dans un emploi à temps partiel ;\n- si vous ne cohabitez pas avec un conjoint ou partenaire mais avec d'autres personnes parmi lesquelles des enfants.",
  "19": "Vous devez déclarer tous les revenus de remplacement (montant brut) des personnes avec lesquelles vous cohabitez. Les principaux revenus de remplacement sont : les allocations de chômage (également les allocations d'insertion), les indemnités de maladie-invalidité, les allocations de maternité, les allocations d'interruption de carrière, les allocations de crédit-temps, les indemnités pour accident de travail ou maladie professionnelle et les pensions de retraite ou de survie.",
  "20": "Si vous entamez des prestations de travail en activité principale, comme salarié ou indépendant, vous le mentionnez sur votre carte de contrôle.\n\nSi vous exercez une activité comme indépendant à titre principal, vous n'avez pas droit aux allocations de chômage.\n\nSous certaines conditions, vous pouvez cumuler vos allocations avec des revenus provenant d'une activité accessoire.",
  "21": "Vous devez déclarer votre activité artistique sauf si vous l'exercez comme hobby ou exclusivement dans le cadre du régime des « petites indemnités ». Une activité artistique est considérée comme un hobby aussi longtemps que vous la pratiquez sans aucune commercialisation.\n\nAttention : Si vous exercez exclusivement des activités techniques dans le secteur artistique, cochez 'non'.",
  "22": "Par ailleurs, le suivi d'études de plein exercice en cours du jour, d'un apprentissage, d'une formation avec une convention de stage organisée par SYNTRA, l'IFAPME, l'EFEPME, l'IAWM, d'une formation en alternance doit être déclaré préalablement et entraîne la perte du droit aux allocations de chômage sauf si vous obtenez une dispense de la part de l'instance régionale.",
  "24": "Les travailleurs de certaines catégories professionnelles particulières (p.ex. mineur, pilote d'avion, marin,…) ont droit à une pension complète avant l'âge normal de la pension.\n\nSi vous remplissez les conditions d'âge et d'ancienneté pour percevoir cette pension spécifique, vous n'avez pas droit aux allocations. Demandez des explications à votre organisme de paiement.",
  "25": "Les revenus (autres que salariés ou statutaires) que vous procure une activité artistique peuvent avoir une incidence sur le montant de votre allocation de chômage, même si vous avez mis fin à cette activité.\n\nPar ailleurs, vous devez déclarer les avantages financiers que vous percevez dans le cadre d'une formation (vous joignez un FORMULAIRE C1F). Ces avantages entraînent la perte du droit aux allocations de chômage sauf si vous obtenez une dispense ou une autorisation de la part de l'instance régionale.",
  "26": "Vous déclarez votre pension de survie sur le FORMULAIRE C1B. Si vous ne recevez pas une pension de survie mais une allocation de transition limitée dans le temps, vous répondez 'non' et vous ne joignez pas de FORMULAIRE C1B. Cette allocation de transition est cumulable sans limitation avec les allocations de chômage.",
  "29": "Veuillez communiquer sous cette rubrique de quelle manière vous désirez recevoir vos allocations et communiquez également chaque modification.",
  "30": "Si vous êtes syndiqué, vous pouvez autoriser la retenue de la cotisation syndicale sur vos allocations de chômage.\n\nMentionnez sous cette rubrique si vous autorisez cette retenue ou si vous retirez votre autorisation précédente.",
  "31": "Indiquez 'réfugié' ou 'apatride reconnu', si vous possédez un de ces statuts. Joignez une preuve de votre reconnaissance en tant que réfugié ou apatride.\n\nVous ne devez pas présenter un document de séjour ou un permis de travail dans les cas suivants :\n- vous possédez le statut de réfugié ou d'apatride reconnu ;\n- vous êtes ressortissant d'un des pays suivants : Allemagne, Autriche, Bulgarie, République de Chypre, Croatie, Danemark, Espagne, Estonie, Finlande, France, Grande-Bretagne, Grèce, Hongrie, Irlande, Islande, Italie, Lettonie, Liechtenstein, Lituanie, Luxembourg, Malte, Norvège, Pays-Bas, Pologne, Portugal, Roumanie, Slovaquie, Slovénie, Suède, République tchèque ou la Suisse.",
  "32": "Le fait d'avoir une incapacité permanente au travail d'au moins 33 % peut avoir une incidence sur le montant de vos allocations. En effet, la reconnaissance d'une inaptitude permanente d'au moins 33% permet de « fixer » le montant de votre allocation. Cela signifie que, soit vous ne serez pas concerné par la dégressivité du montant des allocations de chômage, soit la dégressivité s'arrêtera.\n\nVous pouvez demander cet avantage via le FORMULAIRE C47-DEMANDE, disponible auprès de votre organisme de paiement.",
  "33": "Lisez attentivement la déclaration, indiquez les annexes que vous joignez, datez et signez. Votre organisme de paiement vous remettra un double de votre FORMULAIRE C1 et un exemplaire de la feuille d'information.",
};

// ── Composants UI ────────────────────────────────────────────────────────────
function InfoTooltip({ n }: { n: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const text = TIPS[n] ?? "";

  return (
    <div ref={ref} className="relative inline-flex items-center shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center justify-center px-1 min-w-[22px] h-4 rounded bg-blue-50 text-blue-600 text-[9px] font-bold hover:bg-blue-200 border border-blue-200 leading-none"
      >
        ({n})
      </button>
      {open && (
        <div className="absolute z-50 top-5 left-0 w-72 bg-white border border-blue-200 rounded-lg shadow-xl p-3 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
          <p className="font-bold text-blue-700 mb-1.5">({n})</p>
          {text}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, error, tip, children }: {
  label: string; hint?: string; error?: string; tip?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        {tip && <InfoTooltip n={tip} />}
      </div>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

const inp = (err?: string) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${err ? "border-red-400 focus:ring-red-200 bg-red-50" : "border-gray-300 focus:ring-blue-200"}`;

function formatDateFrInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function DateInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="jj/mm/aaaa"
      maxLength={10}
      className={className}
      value={value}
      onChange={e => onChange(formatDateFrInput(e.target.value))}
    />
  );
}

interface AddressSuggestion {
  street: string;
  housenumber: string;
  postcode: string;
  city: string;
  display: string;
}

function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: AddressSuggestion) => void;
  className: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    if (v.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/address-autocomplete?q=${encodeURIComponent(v)}`);
        const json = await res.json();
        const list = (json.suggestions ?? []) as AddressSuggestion[];
        setSuggestions(list.slice(0, 6));
        setOpen(list.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(s: AddressSuggestion) {
    onChange(s.street);
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        className={className}
        value={value}
        onChange={e => handleChange(e.target.value)}
        placeholder="Rue de la Loi"
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</span>
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden text-sm">
          {suggestions.map((s, i) => (
            <li
              key={`${s.display}-${i}`}
              onMouseDown={() => handleSelect(s)}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-0"
            >
              {s.display}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SectionTitle({ children, tip }: { children: React.ReactNode; tip?: string }) {
  return (
    <h3 className="text-sm font-bold text-gray-800 bg-gray-100 rounded-lg px-3 py-2 mb-3 mt-4 flex items-center gap-2">
      <span className="flex-1">{children}</span>
      {tip && <InfoTooltip n={tip} />}
    </h3>
  );
}

function Toggle({ label, checked, onChange, tip }: { label: string; checked: boolean; onChange: (v: boolean) => void; tip?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-1.5">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0" />
      <span className="text-sm text-gray-700 flex-1">{label}</span>
      {tip && <InfoTooltip n={tip} />}
    </label>
  );
}

function YesNo({ value, onChange }: { value: "oui" | "non"; onChange: (v: "oui" | "non") => void }) {
  return (
    <div className="flex gap-4">
      {(["non", "oui"] as const).map(v => (
        <label key={v} className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" checked={value === v} onChange={() => onChange(v)} className="accent-blue-600" />
          <span className="text-sm capitalize">{v}</span>
        </label>
      ))}
    </div>
  );
}

function SignaturePad({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] : e;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function stopDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current!.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400} height={80}
        className={`border rounded-lg w-full touch-none bg-white cursor-crosshair ${error ? "border-red-400" : "border-gray-300"}`}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
      <div className="flex justify-between items-center mt-1">
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button type="button" onClick={clear} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">Effacer</button>
      </div>
      {value && <p className="text-xs text-green-600 mt-1">Signature enregistrée ✓</p>}
    </div>
  );
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i + 1 === step ? "bg-blue-600 text-white" : i + 1 < step ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-500"}`}>
            {i + 1}
          </div>
          {i < total - 1 && <div className={`flex-1 h-0.5 ${i + 1 < step ? "bg-blue-300" : "bg-gray-200"}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function formatNiss(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 6) return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
  if (d.length <= 9) return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}-${d.slice(6, 9)}.${d.slice(9)}`;
}

function formatIBAN(v: string) {
  return v.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

// ── Formulaire principal ─────────────────────────────────────────────────────
const STEP_LABELS = [
  "Mon identité",
  "Motif(s) de la déclaration",
  "Ma situation familiale",
  "Mes activités & mes revenus",
  "Mode de paiement, cotisation & divers",
  "Ma déclaration",
];
const TOTAL_STEPS = STEP_LABELS.length;

export default function FormulaireC1() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<C1Data>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof C1Data>(field: K, value: C1Data[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function setCohabitant(i: number, field: keyof CohabitantRow, value: string | boolean) {
    setForm(prev => {
      const list = [...prev.cohabitants];
      list[i] = { ...list[i], [field]: value };
      return { ...prev, cohabitants: list };
    });
  }

  function addCohabitant() {
    if (form.cohabitants.length >= 5) return;
    setForm(prev => ({ ...prev, cohabitants: [...prev.cohabitants, { ...EMPTY_COHABITANT }] }));
  }

  function removeCohabitant(i: number) {
    setForm(prev => ({ ...prev, cohabitants: prev.cohabitants.filter((_, idx) => idx !== i) }));
  }

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.nom.trim()) e.nom = "Requis";
      if (!form.prenom.trim()) e.prenom = "Requis";
      if (!form.rue.trim()) e.rue = "Requis";
      if (!form.codePostal.trim()) e.codePostal = "Requis";
      if (!form.commune.trim()) e.commune = "Requis";
      if (!form.email.trim()) e.email = "Requis";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Adresse e-mail invalide";
    }
    if (s === 2) {
      const hasMotif = form.motifDemandeAlloc || form.motifChangementOrganisme ||
        form.motifModifAdresse || form.motifModifCotisationSyndicale ||
        form.motifModifPermis || form.motifModifSituationPersonnelle ||
        form.motifModifModePaiement;
      if (!hasMotif) e.motif = "Veuillez sélectionner au moins un motif";
    }
    if (s === 6) {
      if (!form.declAffirme) e.declAffirme = "Requis";
      if (!form.declLuFeuille) e.declLuFeuille = "Requis";
      if (!form.declSaitCommuniquer) e.declSaitCommuniquer = "Requis";
      if (!form.dateSig) e.dateSig = "Requis";
      if (!form.signature) e.signature = "La signature est obligatoire";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep(s => Math.min(s + 1, TOTAL_STEPS));
  }

  function prev() { setStep(s => Math.max(s - 1, 1)); }

  async function handleSubmit() {
    if (!validateStep(step)) return;
    setLoading(true);
    try {
      // Fill PDF
      const fillRes = await fetch("/api/fill-c1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!fillRes.ok) throw new Error("Erreur remplissage PDF");
      const { pdfBase64: b64 } = await fillRes.json();
      setPdfBase64(b64);

      // Save to Supabase
      await supabase.from("web_c1").insert({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        niss: form.niss.replace(/\D/g, "") || null,
        email: form.email.trim().toLowerCase() || null,
        data: form,
      });

      // Send email
      await fetch("/api/send-c1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          email: form.email.trim().toLowerCase(),
          pdfBase64: b64,
          fileName: `formulaire-c1-${form.nom.toLowerCase()}-${form.prenom.toLowerCase()}.pdf`,
        }),
      });

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    if (!pdfBase64) return;
    const bytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formulaire-c1-${form.nom.toLowerCase()}-${form.prenom.toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Succès ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={52} />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Formulaire prêt</h2>
        <p className="text-gray-600 text-sm mb-6">
          Votre formulaire C1 a été complété. Téléchargez-le, imprimez-le, signez-le et remettez-le à votre organisme de paiement.
        </p>
        <button onClick={downloadPdf}
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-xl text-sm">
          <FileDown size={18} /> Télécharger le formulaire C1 (PDF)
        </button>
      </div>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-gray-800 text-white rounded-t-2xl px-6 py-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Office National de l&apos;Emploi</p>
        <h1 className="text-base font-bold">Formulaire C1 — Déclaration de situation personnelle et familiale</h1>
        <p className="text-xs text-gray-400 mt-1">Étape {step}/{TOTAL_STEPS} : {STEP_LABELS[step - 1]}</p>
      </div>

      <div className="bg-white shadow rounded-b-2xl px-6 py-6">
        <StepIndicator step={step} total={TOTAL_STEPS} />

        {/* ══ ÉTAPE 1 — Identité & Adresse ══ */}
        {step === 1 && (
          <>
            <SectionTitle>Mon identité</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom *" error={errors.nom}>
                <input className={inp(errors.nom)} value={form.nom} onChange={e => set("nom", e.target.value)} />
              </Field>
              <Field label="Prénom *" error={errors.prenom}>
                <input className={inp(errors.prenom)} value={form.prenom} onChange={e => set("prenom", e.target.value)} />
              </Field>
            </div>
            <Field label="NISS (numéro de registre national)" hint="Format : 85.04.12-123.45" tip="1">
              <input className={inp()} value={form.niss} onChange={e => set("niss", formatNiss(e.target.value))} placeholder="85.04.12-123.45" maxLength={15} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date de naissance">
                <DateInput className={inp()} value={form.dateNaissance} onChange={v => set("dateNaissance", v)} />
              </Field>
              <Field label="Nationalité" tip="3">
                <input className={inp()} value={form.nationalite} onChange={e => set("nationalite", e.target.value)} />
              </Field>
            </div>

            <SectionTitle>Mon adresse effective</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Rue *" error={errors.rue} tip="2">
                  <AddressAutocomplete
                    className={inp(errors.rue)}
                    value={form.rue}
                    onChange={v => set("rue", v)}
                    onSelect={s => {
                      setForm(prev => ({
                        ...prev,
                        rue: s.street || prev.rue,
                        numero: s.housenumber || prev.numero,
                        codePostal: s.postcode || prev.codePostal,
                        commune: s.city || prev.commune,
                      }));
                      setErrors(prev => ({
                        ...prev,
                        rue: undefined,
                        numero: undefined,
                        codePostal: undefined,
                        commune: undefined,
                      }));
                    }}
                  />
                </Field>
              </div>
              <Field label="Numéro">
                <input className={inp()} value={form.numero} onChange={e => set("numero", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Code postal *" error={errors.codePostal}>
                <input className={inp(errors.codePostal)} value={form.codePostal} onChange={e => set("codePostal", e.target.value)} maxLength={6} />
              </Field>
              <div className="col-span-2">
                <Field label="Commune *" error={errors.commune}>
                  <input className={inp(errors.commune)} value={form.commune} onChange={e => set("commune", e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email *" error={errors.email}>
                <input type="email" className={inp(errors.email)} value={form.email} onChange={e => set("email", e.target.value)} />
              </Field>
              <Field label="Téléphone (facultatif)">
                <input type="tel" className={inp()} value={form.telephone} onChange={e => set("telephone", e.target.value)} />
              </Field>
            </div>
          </>
        )}

        {/* ══ ÉTAPE 2 — Motifs ══ */}
        {step === 2 && (
          <>
            {errors.motif && <p className="text-red-600 text-sm mb-3 bg-red-50 rounded-lg p-2">{errors.motif}</p>}

            <Toggle label="Je demande des allocations de chômage" checked={form.motifDemandeAlloc} onChange={v => set("motifDemandeAlloc", v)} tip="4" />
            {form.motifDemandeAlloc && (
              <div className="ml-7 space-y-3 mt-2">
                <Field label="à partir du">
                  <DateInput className={inp()} value={form.motifDemandeAllocDate} onChange={v => set("motifDemandeAllocDate", v)} />
                </Field>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="motifType" checked={form.motifPremiereFois && !form.motifApresInterruption}
                      onChange={() => { set("motifPremiereFois", true); set("motifApresInterruption", false); }}
                      className="accent-blue-600" />
                    pour la 1ère fois
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="motifType" checked={form.motifApresInterruption}
                      onChange={() => { set("motifPremiereFois", false); set("motifApresInterruption", true); }}
                      className="accent-blue-600" />
                    après une interruption de mes allocations
                    <InfoTooltip n="5" />
                  </label>
                </div>
                <Field label="comme chômeur temporaire suivant une formation en alternance">
                  <div className="flex gap-4">
                    {(["oui", "non"] as const).map(v => (
                      <label key={v} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input type="radio" checked={form.motifFormationAlternance === v}
                          onChange={() => set("motifFormationAlternance", v)} className="accent-blue-600" />
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            <Toggle label="Je change d&apos;organisme de paiement" checked={form.motifChangementOrganisme} onChange={v => set("motifChangementOrganisme", v)} tip="4" />
            {form.motifChangementOrganisme && (
              <div className="ml-7 mt-2">
                <Field label="à partir du">
                  <DateInput className={inp()} value={form.motifChangementOrganismeDate} onChange={v => set("motifChangementOrganismeDate", v)} />
                </Field>
              </div>
            )}

            <SectionTitle>Je déclare une modification relative à :</SectionTitle>
            <Toggle label="mon adresse" checked={form.motifModifAdresse} onChange={v => set("motifModifAdresse", v)} tip="6" />
            {form.motifModifAdresse && (
              <div className="ml-7">
                <Field label="à partir du">
                  <DateInput className={inp()} value={form.motifModifAdresseDate} onChange={v => set("motifModifAdresseDate", v)} />
                </Field>
              </div>
            )}
            <Toggle label="l&apos;autorisation de retenue de ma cotisation syndicale" checked={form.motifModifCotisationSyndicale} onChange={v => set("motifModifCotisationSyndicale", v)} tip="8" />
            <Toggle label="mon permis de séjour et/ou de travail" checked={form.motifModifPermis} onChange={v => set("motifModifPermis", v)} tip="10" />
            <Toggle label="ma situation personnelle ou familiale" checked={form.motifModifSituationPersonnelle} onChange={v => set("motifModifSituationPersonnelle", v)} tip="7" />
            {form.motifModifSituationPersonnelle && (
              <div className="ml-7">
                <Field label="à partir du">
                  <DateInput className={inp()} value={form.motifModifSituationPersonnelleDate} onChange={v => set("motifModifSituationPersonnelleDate", v)} />
                </Field>
              </div>
            )}
            <Toggle label="mon mode de paiement et/ou mon numéro de compte" checked={form.motifModifModePaiement} onChange={v => set("motifModifModePaiement", v)} tip="9" />
            {form.motifModifModePaiement && (
              <div className="ml-7">
                <Field label="à partir du">
                  <DateInput className={inp()} value={form.motifModifModePaiementDate} onChange={v => set("motifModifModePaiementDate", v)} />
                </Field>
              </div>
            )}
          </>
        )}

        {/* ══ ÉTAPE 3 — Situation familiale ══ */}
        {step === 3 && (
          <>
            {form.motifDemandeAlloc && form.motifFormationAlternance !== "oui" ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                Cette section ne doit pas être complétée pour une demande d&apos;allocations de chômage temporaire (sauf formation en alternance). Passez à l&apos;étape suivante.
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">Décrivez votre situation de logement actuelle.</p>
                <SectionTitle tip="11">Ma situation de logement</SectionTitle>
                <Toggle label="J&apos;habite seul(e)" checked={form.sitFamHabiteSeul} tip="12" onChange={v => { set("sitFamHabiteSeul", v); if (v) { set("sitFamCohabite", false); set("cohabitants", []); } }} />
                <Toggle label="Je cohabite avec d&apos;autres personnes" checked={form.sitFamCohabite} tip="14" onChange={v => { set("sitFamCohabite", v); if (v) set("sitFamHabiteSeul", false); }} />

                <SectionTitle>Situations particulières</SectionTitle>
                <Toggle label="Je paie une pension alimentaire (décision judiciaire ou acte notarié)" checked={form.sitFamPensionAlimentaire} onChange={v => set("sitFamPensionAlimentaire", v)} tip="13" />
                {form.sitFamPensionAlimentaire && (
                  <div className="ml-7">
                    <Field label="Copie">
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={form.sitFamPensionCopie === "joins"} onChange={() => set("sitFamPensionCopie", "joins")} className="accent-blue-600" />Je joins une copie</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={form.sitFamPensionCopie === "deja"} onChange={() => set("sitFamPensionCopie", "deja")} className="accent-blue-600" />J&apos;ai déjà introduit une copie</label>
                      </div>
                    </Field>
                  </div>
                )}
                <Toggle label="Je suis séparé(e) de fait et mon conjoint perçoit une partie de mes revenus" checked={form.sitFamSepareDesFait} onChange={v => set("sitFamSepareDesFait", v)} />

                <Field label="Remarques (facultatif)">
                  <textarea className={`${inp()} h-16 resize-none`} value={form.sitFamRemarques} onChange={e => set("sitFamRemarques", e.target.value)} />
                </Field>

                {form.sitFamCohabite && (
                  <>
                    <SectionTitle>Personnes avec qui je cohabite</SectionTitle>
                    <p className="text-xs text-gray-500 mb-3">Indiquez jusqu&apos;à 5 personnes.</p>
                    {form.cohabitants.map((c, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-4 mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-700">Personne {i + 1}</span>
                          <button type="button" onClick={() => removeCohabitant(i)} className="text-xs text-red-600 hover:underline">Supprimer</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Nom et prénom">
                            <input className={inp()} value={c.nomPrenom} onChange={e => setCohabitant(i, "nomPrenom", e.target.value)} />
                          </Field>
                          <Field label="Lien de parenté" tip="15">
                            <input className={inp()} value={c.lienParente} onChange={e => setCohabitant(i, "lienParente", e.target.value)} placeholder="conjoint, enfant..." />
                          </Field>
                          <Field label="Date de naissance">
                            <DateInput className={inp()} value={c.dateNaissance} onChange={v => setCohabitant(i, "dateNaissance", v)} />
                          </Field>
                          <Field label="Allocations familiales" tip="16">
                            <label className="flex items-center gap-2 cursor-pointer mt-1">
                              <input type="checkbox" checked={c.allocFamiliales} onChange={e => setCohabitant(i, "allocFamiliales", e.target.checked)} className="accent-blue-600 w-4 h-4" />
                              <span className="text-sm text-gray-700">Oui</span>
                            </label>
                          </Field>
                          <Field label="Type d&apos;activité professionnelle" tip="17">
                            <input className={inp()} value={c.typeActivite} onChange={e => setCohabitant(i, "typeActivite", e.target.value)} placeholder="salarié, indépendant..." />
                          </Field>
                          <Field label="Montant mensuel brut (€)" tip="18">
                            <input className={inp()} value={c.montantActivite} onChange={e => setCohabitant(i, "montantActivite", e.target.value)} />
                          </Field>
                          <Field label="Type de revenu de remplacement" tip="19">
                            <input className={inp()} value={c.typeRevenu} onChange={e => setCohabitant(i, "typeRevenu", e.target.value)} placeholder="chômage, pension..." />
                          </Field>
                          <Field label="Montant mensuel brut (€)">
                            <input className={inp()} value={c.montantRevenu} onChange={e => setCohabitant(i, "montantRevenu", e.target.value)} />
                          </Field>
                        </div>
                      </div>
                    ))}
                    {form.cohabitants.length < 5 && (
                      <button type="button" onClick={addCohabitant}
                        className="text-sm text-blue-600 hover:underline mb-3">+ Ajouter une personne</button>
                    )}

                    <SectionTitle tip="15bis">Partenaire ou personne à charge</SectionTitle>
                    <p className="text-xs text-gray-500 mb-2">À compléter uniquement si votre partenaire ou une autre personne (pas votre enfant) est financièrement à votre charge.</p>
                    <Field label="Nom et prénom du partenaire / de la personne à charge">
                      <input className={inp()} value={form.partenaireNom} onChange={e => set("partenaireNom", e.target.value)} />
                    </Field>
                    {form.partenaireNom && (
                      <Field label="Déclaration">
                        <div className="space-y-1">
                          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={form.partenaireDeclaration === "premiere_fois"} onChange={() => set("partenaireDeclaration", "premiere_fois")} className="accent-blue-600" />Je le déclare pour la première fois (je joins le formulaire C1-PARTENAIRE)</label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={form.partenaireDeclaration === "inchangee"} onChange={() => set("partenaireDeclaration", "inchangee")} className="accent-blue-600" />Ma déclaration précédente reste inchangée</label>
                        </div>
                      </Field>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ══ ÉTAPE 4 — Activités & Revenus ══ */}
        {step === 4 && (
          <>
            <p className="text-sm text-gray-600 mb-4">Répondez à chaque question. Par défaut : <strong>Non</strong>.</p>

            <SectionTitle tip="20">Mes activités</SectionTitle>
            {[
              { field: "actEtudesPleinExercice" as const, label: "Je suis des études de plein exercice", dateField: "actEtudesDate" as const },
              { field: "actApprentissage" as const, label: "Je suis un apprentissage ou une formation en alternance", dateField: "actApprentissageDate" as const },
              { field: "actFormationSyntra" as const, label: "Je suis une formation SYNTRA / IFAPME / EFEPME / IAWM", dateField: "actFormationSyntraDate" as const },
            ].map(({ field, label, dateField }) => (
              <div key={field} className="mb-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-700 flex-1 pr-4 flex items-center gap-1">{label} <InfoTooltip n="22" /></span>
                  <YesNo value={form[field]} onChange={v => set(field, v)} />
                </div>
                {form[field] === "oui" && (
                  <div className="ml-4 mt-2">
                    <Field label="À partir du">
                      <DateInput className={inp()} value={form[dateField]} onChange={v => set(dateField, v)} />
                    </Field>
                  </div>
                )}
              </div>
            ))}

            <div className="mb-1">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700 flex-1 pr-4">Titulaire d&apos;un mandat culturel</span>
                <YesNo value={form.actMandatCulturel} onChange={v => set("actMandatCulturel", v)} />
              </div>
              {form.actMandatCulturel === "oui" && (
                <div className="ml-4 mt-1 space-y-1 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.actMandatCulturelDecl === "premiere_fois"} onChange={() => set("actMandatCulturelDecl", "premiere_fois")} className="accent-blue-600" />Je déclare cela pour la 1ère fois</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.actMandatCulturelDecl === "inchangee"} onChange={() => set("actMandatCulturelDecl", "inchangee")} className="accent-blue-600" />Ma déclaration précédente reste inchangée</label>
                </div>
              )}
            </div>
            <div className="mb-1">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700 flex-1 pr-4">Titulaire d&apos;un mandat politique</span>
                <YesNo value={form.actMandatPolitique} onChange={v => set("actMandatPolitique", v)} />
              </div>
              {form.actMandatPolitique === "oui" && (
                <div className="ml-4 mt-1 space-y-1 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.actMandatPolitiqueDecl === "premiere_fois"} onChange={() => set("actMandatPolitiqueDecl", "premiere_fois")} className="accent-blue-600" />Je déclare cela pour la 1ère fois</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.actMandatPolitiqueDecl === "inchangee"} onChange={() => set("actMandatPolitiqueDecl", "inchangee")} className="accent-blue-600" />Ma déclaration précédente reste inchangée</label>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 mb-1">
              <span className="text-sm text-gray-700 flex-1 pr-4 flex items-center gap-1">Bénéficiaire du Chapitre XII (attestation travail des arts) <InfoTooltip n="21" /></span>
              <YesNo value={form.actChapitreXII} onChange={v => set("actChapitreXII", v)} />
            </div>
            <div className="mb-1">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700 flex-1 pr-4">Bénéficiaire Tremplin</span>
                <YesNo value={form.actTremplin} onChange={v => set("actTremplin", v)} />
              </div>
              {form.actTremplin === "oui" && (
                <div className="ml-4 mt-1 space-y-1 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.actTremplinDecl === "premiere_fois"} onChange={() => set("actTremplinDecl", "premiere_fois")} className="accent-blue-600" />Je déclare cela pour la 1ère fois</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.actTremplinDecl === "inchangee"} onChange={() => set("actTremplinDecl", "inchangee")} className="accent-blue-600" />Ma déclaration précédente reste inchangée</label>
                </div>
              )}
            </div>
            {[
              { field: "actActiviteAccessoire" as const, label: "Activité accessoire ou aide à un indépendant" },
              { field: "actAdminSociete" as const, label: "Administrateur de société" },
              { field: "actInscritIndependant" as const, label: "Inscrit comme indépendant (à titre accessoire ou principal)" },
            ].map(({ field, label }) => (
              <div key={field} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700 flex-1 pr-4">{label}</span>
                <YesNo value={form[field]} onChange={v => set(field, v)} />
              </div>
            ))}
            {(form.actActiviteAccessoire === "oui" || form.actAdminSociete === "oui" || form.actInscritIndependant === "oui") && (
              <div className="ml-4 mt-1 space-y-1 text-sm">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.actIndependantDecl === "premiere_fois"} onChange={() => set("actIndependantDecl", "premiere_fois")} className="accent-blue-600" />Je déclare cela pour la 1ère fois</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.actIndependantDecl === "inchangee"} onChange={() => set("actIndependantDecl", "inchangee")} className="accent-blue-600" />Ma déclaration précédente reste inchangée</label>
              </div>
            )}

            <SectionTitle>Mes revenus</SectionTitle>
            {[
              { field: "revPensionComplete" as const, label: "J'appartiens à une catégorie pro. particulière et j'ai droit à une pension complète", tip: "24" },
              { field: "revPensionRetraite" as const, label: "Je perçois une pension de retraite ou de survie", tip: "26" },
              { field: "revIndemnitesMaladie" as const, label: "Je perçois une indemnité de maladie ou d'invalidité", tip: "" },
              { field: "revIndemnitesAccident" as const, label: "Je perçois une indemnité pour accident du travail ou maladie professionnelle", tip: "" },
              { field: "revAvantageFinancier" as const, label: "Je perçois un avantage financier lié à une formation ou un apprentissage", tip: "25" },
            ].map(({ field, label, tip }) => (
              <div key={field} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700 flex-1 pr-4 flex items-center gap-1">{label} {tip && <InfoTooltip n={tip} />}</span>
                <YesNo value={form[field]} onChange={v => set(field, v)} />
              </div>
            ))}
          </>
        )}

        {/* ══ ÉTAPE 5 — Paiement & Cotisation ══ */}
        {step === 5 && (
          <>
            <SectionTitle tip="29">Mode de paiement de mes allocations</SectionTitle>
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={form.paiementVirement} onChange={() => { set("paiementVirement", true); set("paiementCheque", false); }} className="accent-blue-600" />
                Virement bancaire
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={form.paiementCheque} onChange={() => { set("paiementCheque", true); set("paiementVirement", false); }} className="accent-blue-600" />
                Chèque circulaire (envoyé à mon adresse)
              </label>
            </div>

            {form.paiementVirement && (
              <>
                <Field label="Le compte est à mon nom ?">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-sm"><input type="radio" checked={form.paiementCompteAMonNom === "oui"} onChange={() => set("paiementCompteAMonNom", "oui")} className="accent-blue-600" />Oui</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-sm"><input type="radio" checked={form.paiementCompteAMonNom === "non"} onChange={() => set("paiementCompteAMonNom", "non")} className="accent-blue-600" />Non</label>
                  </div>
                </Field>
                {form.paiementCompteAMonNom === "non" && (
                  <Field label="Nom du titulaire du compte">
                    <input className={inp()} value={form.paiementNomTitulaire} onChange={e => set("paiementNomTitulaire", e.target.value)} />
                  </Field>
                )}
                <Field label="IBAN (belge ou étranger)" hint="Le BIC est requis uniquement pour un IBAN étranger">
                  <input className={inp()} value={form.paiementIban} onChange={e => set("paiementIban", formatIBAN(e.target.value))} placeholder="BE68 5390 0754 7034" maxLength={42} />
                </Field>
                {form.paiementIban && !form.paiementIban.replace(/\s/g, "").toUpperCase().startsWith("BE") && (
                  <Field label="BIC">
                    <input className={`${inp()} uppercase`} value={form.paiementBic} onChange={e => set("paiementBic", e.target.value.toUpperCase())} placeholder="GEBABEBB" maxLength={11} />
                  </Field>
                )}
              </>
            )}

            <SectionTitle tip="30">Cotisation syndicale (si modification)</SectionTitle>
            <p className="text-xs text-gray-500 mb-3">À compléter uniquement si vous souhaitez modifier votre autorisation de retenue.</p>
            <div className="space-y-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" checked={form.cotisationAction === "none"} onChange={() => set("cotisationAction", "none")} className="accent-blue-600" />Aucune modification</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" checked={form.cotisationAction === "autorise"} onChange={() => set("cotisationAction", "autorise")} className="accent-blue-600" />J&apos;autorise la retenue de la cotisation syndicale</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" checked={form.cotisationAction === "nAutorise"} onChange={() => set("cotisationAction", "nAutorise")} className="accent-blue-600" />Je n&apos;autorise plus la retenue de la cotisation syndicale</label>
            </div>
            {form.cotisationAction !== "none" && (
              <Field label="À partir du mois de chômage de (MM/AAAA)">
                <input className={inp()} value={form.cotisationMoisAnnee} onChange={e => set("cotisationMoisAnnee", e.target.value)} placeholder="01/2025" maxLength={7} />
              </Field>
            )}

            <SectionTitle tip="31">Ma nationalité</SectionTitle>
            <p className="text-xs text-gray-500 mb-3">À compléter uniquement si vous n&apos;êtes pas ressortissant(e) de l&apos;Espace Économique Européen.</p>
            <Toggle label="Cette section me concerne" checked={form.natApplicable} onChange={v => set("natApplicable", v)} />
            {form.natApplicable && (
              <>
                <Field label="Réfugié(e) reconnu(e)">
                  <YesNo value={form.natRefugie as "oui" | "non"} onChange={v => set("natRefugie", v)} />
                </Field>
                <Field label="Apatride">
                  <YesNo value={form.natApatride as "oui" | "non"} onChange={v => set("natApatride", v)} />
                </Field>
                {form.natRefugie !== "oui" && form.natApatride !== "oui" && (
                  <>
                    <Field label="Titulaire d&apos;un document de séjour">
                      <YesNo value={form.natDocumentSejour as "oui" | "non"} onChange={v => set("natDocumentSejour", v)} />
                    </Field>
                    {form.natDocumentSejour === "oui" && (
                      <Field label="Accès au marché professionnel">
                        <div className="space-y-1 text-sm">
                          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.natAccesMarchePro === "illimite"} onChange={() => set("natAccesMarchePro", "illimite")} className="accent-blue-600" />Illimité</label>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.natAccesMarchePro === "limite"} onChange={() => set("natAccesMarchePro", "limite")} className="accent-blue-600" />Limité</label>
                          {form.natAccesMarchePro === "limite" && (
                            <div className="ml-6">
                              <Field label="Description de la limitation">
                                <input className={inp()} value={form.natDescriptionLimitation} onChange={e => set("natDescriptionLimitation", e.target.value)} />
                              </Field>
                            </div>
                          )}
                          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={form.natAccesMarchePro === "aucun"} onChange={() => set("natAccesMarchePro", "aucun")} className="accent-blue-600" />Aucun</label>
                        </div>
                      </Field>
                    )}
                  </>
                )}
              </>
            )}

            <SectionTitle>Divers</SectionTitle>
            <div className="mb-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700 flex-1 pr-4">Congés sans solde</span>
                <YesNo value={form.divCongesSansSolde} onChange={v => set("divCongesSansSolde", v)} />
              </div>
              {form.divCongesSansSolde === "oui" && (
                <div className="grid grid-cols-2 gap-3 mt-2 ml-4">
                  <Field label="Du">
                    <DateInput className={inp()} value={form.divCongesDu} onChange={v => set("divCongesDu", v)} />
                  </Field>
                  <Field label="Au">
                    <DateInput className={inp()} value={form.divCongesAu} onChange={v => set("divCongesAu", v)} />
                  </Field>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700 flex-1 pr-4 flex items-center gap-1">Incapacité de travail permanente d&apos;au moins 33 % <InfoTooltip n="32" /></span>
              <YesNo value={form.divIncapacite33} onChange={v => set("divIncapacite33", v)} />
            </div>
          </>
        )}

        {/* ══ ÉTAPE 6 — Déclaration ══ */}
        {step === 6 && (
          <>
            <SectionTitle tip="33">Ma déclaration</SectionTitle>
            <p className="text-sm text-gray-600 mb-4">Vous devez cocher les trois cases ci-dessous pour valider votre demande.</p>
            <div className="space-y-3 mb-5">
              {[
                { field: "declAffirme" as const, label: "J&apos;affirme sur l&apos;honneur que la présente déclaration est sincère et complète." },
                { field: "declLuFeuille" as const, label: "J&apos;ai lu la feuille d&apos;informations." },
                { field: "declSaitCommuniquer" as const, label: "Je sais que je dois communiquer toute modification à mon organisme de paiement et que je peux être sanctionné(e) si je ne le fais pas." },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form[field]} onChange={e => set(field, e.target.checked)} className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0" />
                    <span className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: label }} />
                  </label>
                  {errors[field] && <p className="text-red-600 text-xs ml-7">{errors[field]}</p>}
                </div>
              ))}
            </div>

            <SectionTitle>Documents joints (si applicable)</SectionTitle>
            <div className="space-y-2 mb-5">
              {[
                { field: "declDocsAttestation" as const, label: "Attestation de la DG Personnes handicapées du SPF Sécurité sociale" },
                { field: "declDocsExtrait" as const, label: "Copie de l&apos;extrait de la pension" },
                { field: "declDocsAnnexeRegis" as const, label: "Formulaire C1 ANNEXE REGIS" },
                { field: "declDocsPermis" as const, label: "Copie du permis de séjour et/ou du permis de travail" },
              ].map(({ field, label }) => (
                <label key={field} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form[field]} onChange={e => set(field, e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: label }} />
                </label>
              ))}
              <Field label="Autre document">
                <input className={inp()} value={form.declDocsAutre} onChange={e => set("declDocsAutre", e.target.value)} />
              </Field>
            </div>

            <Field label="Date de signature *" error={errors.dateSig}>
              <DateInput className={inp(errors.dateSig)} value={form.dateSig} onChange={v => set("dateSig", v)} />
            </Field>

            <Field label="Signature * (signez dans le cadre ci-dessous)" error={errors.signature}>
              <SignaturePad value={form.signature} onChange={v => { set("signature", v); setErrors(prev => ({ ...prev, signature: undefined })); }} error={errors.signature} />
            </Field>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mt-4">
              <strong>Important :</strong> Après avoir téléchargé le PDF, imprimez-le et remettez-le à votre organisme de paiement (Centrale Générale FGTB).
            </div>
          </>
        )}

        {/* ── Navigation ── */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
          <button type="button" onClick={prev} disabled={step === 1}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={16} /> Précédent
          </button>
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={next}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-xl text-sm">
              Suivant <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-5 rounded-xl text-sm">
              {loading ? "Génération…" : <><FileDown size={15} /> Générer le PDF</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
