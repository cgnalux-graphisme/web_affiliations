"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftRight,
  ChevronRight,
  ClipboardList,
  FileDown,
  FileSignature,
  FileText,
  RotateCcw,
} from "lucide-react";
import FormulaireWebIndependant from "./FormulaireWebIndependant";
import FormulaireC1 from "./FormulaireC1";
import FormulaireC32 from "./FormulaireC32";
import LivraisonFormulaires from "./LivraisonFormulaires";
import {
  affiliationToProfile,
  profileToC1,
  profileToC32,
  type AffiliationProfileSource,
} from "./lib/person-profile";
import {
  clearTransferJourney,
  createInitialJourneyState,
  loadTransferJourney,
  saveTransferJourney,
  type JourneyPhase,
  type TransferJourneyState,
} from "./lib/transfer-journey";
import { postJson } from "./lib/post-json";

import { EtapesFormulaire } from "./app/formulaires/Charte";
const STEPS = [
  { key: "affiliation" as const, label: "Affiliation", Icon: FileSignature },
  { key: "c1" as const, label: "Formulaire C1", Icon: ClipboardList },
  { key: "c32" as const, label: "Formulaire C3.2", Icon: FileText },
  { key: "complete" as const, label: "Envoi", Icon: FileDown },
];

function JourneyStepper({ phase }: { phase: JourneyPhase }) {
  const currentIndex =
    phase === "intro" ? -1 :
    phase === "affiliation" ? 0 :
    phase === "c1" ? 1 :
    phase === "c32" ? 2 : 3;

  // Même indicateur d'étapes que les formulaires (app/formulaires/Charte.tsx).
  return (
    <div className="form-cadre mb-8 px-1">
      <EtapesFormulaire libelles={STEPS.map((e) => e.label)} courant={Math.min(currentIndex, STEPS.length - 1)} />
    </div>
  );
}

function IntroScreen({ onStart, onResume }: { onStart: () => void; onResume: () => void }) {
  const saved = loadTransferJourney();
  const canResume = saved && saved.phase !== "intro" && saved.phase !== "complete";

  return (
    <div className="form-cadre">
      <header className="etape-entree flex items-start gap-4 rounded-2xl bg-militant-bordeaux px-6 py-6 text-white sm:px-8">
        <span aria-hidden className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-white/40">
          <ArrowLeftRight className="h-6 w-6" />
        </span>
        <div>
          <p className="font-condensed text-[15px] font-bold uppercase tracking-[0.12em]">Parcours guidé</p>
          <h1 className="mt-1 font-condensed text-3xl font-extrabold uppercase leading-[0.95] sm:text-[40px]">Transfert vers la FGTB</h1>
        </div>
      </header>
      <div className="form-carte etape-entree">

        <p className="mb-6 max-w-prose text-[16px] leading-relaxed">
          Vous quittez un autre syndicat pour rejoindre la FGTB ? Ce parcours vous guide à travers
          les <strong>3 formulaires obligatoires</strong>, dans le bon ordre. Vos informations
          (nom, adresse, coordonnées…) sont reprises automatiquement d&apos;une étape à l&apos;autre.
        </p>

        <ol className="mb-8 space-y-3">
          {[
            "Demande d'affiliation à la FGTB",
            "Formulaire C1 — déclaration de situation ONEM",
            "Formulaire C3.2 — chômage temporaire ONEM",
          ].map((text, i) => (
            <li key={text} className="flex items-center gap-3 rounded-xl border border-militant-ardoise px-4 py-3 text-[16px] font-semibold">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-militant-bordeaux font-condensed text-[17px] font-bold text-white">
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onStart}
            className="form-btn-principal"
          >
            Commencer le parcours
            <ChevronRight className="h-4 w-4" />
          </button>
          {canResume && (
            <button
              type="button"
              onClick={onResume}
              className="form-btn-secondaire"
            >
              Reprendre où j&apos;en étais
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CompleteScreen({
  state,
  onRestart,
  onEnvoyerServiceChomage,
}: {
  state: TransferJourneyState;
  onRestart: () => void;
  onEnvoyerServiceChomage: () => Promise<void>;
}) {
  const { profile, pdfs } = state;

  return (
    <div>
      <LivraisonFormulaires
        accent="red"
        titre="Parcours terminé"
        description={
          profile
            ? `${profile.prenom}, vos formulaires sont prêts. Choisissez ce que vous voulez en faire.`
            : "Vos formulaires sont prêts. Choisissez ce que vous voulez en faire."
        }
        nom={profile?.nom ?? ""}
        prenom={profile?.prenom ?? ""}
        emailDeclarant={profile?.email ?? ""}
        texteServiceChomage="Le service chômage reçoit le formulaire C1 et le formulaire C3.2, comme jusqu'ici."
        documents={pdfs}
        serviceChomageDejaEnvoye={Boolean(state.onemEmailSent)}
        onEnvoyerServiceChomage={onEnvoyerServiceChomage}
      />
      <div className="mx-auto mt-6 max-w-2xl text-center">
        <button
          type="button"
          onClick={onRestart}
          className="form-btn-retour"
        >
          <RotateCcw className="h-4 w-4" />
          Recommencer un nouveau parcours
        </button>
      </div>
    </div>
  );
}

function TransitionBanner({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div role="status" className="etape-entree mx-auto mb-6 max-w-2xl rounded-2xl border-2 border-militant-bordeaux px-5 py-4">
      <p className="font-condensed text-xl font-bold uppercase leading-tight text-militant-bordeaux">{title}</p>
      <p className="mt-1 text-[15px]">{description}</p>
    </div>
  );
}

export default function ParcoursTransfert() {
  const [state, setState] = useState<TransferJourneyState>(createInitialJourneyState);
  const [ready, setReady] = useState(false);
  const [showTransition, setShowTransition] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadTransferJourney();
    if (saved) setState(saved);
    setReady(true);
  }, []);

  const persist = useCallback((next: TransferJourneyState) => {
    setState(next);
    saveTransferJourney(next);
  }, []);

  function handleStart() {
    clearTransferJourney();
    const next = createInitialJourneyState();
    next.phase = "affiliation";
    persist(next);
  }

  function handleResume() {
    const saved = loadTransferJourney();
    if (saved) setState(saved);
  }

  function handleRestart() {
    clearTransferJourney();
    setState(createInitialJourneyState());
    setShowTransition(null);
  }

  function handleAffiliationComplete(result: {
    data: AffiliationProfileSource & { signature: string };
    demandeId: string | null;
    pdfBase64: string;
    fileName: string;
  }) {
    const profile = affiliationToProfile(result.data);
    const next: TransferJourneyState = {
      phase: "c1",
      profile,
      pdfs: [
        {
          key: "affiliation",
          label: "Demande d'affiliation FGTB",
          fileName: result.fileName,
          pdfBase64: result.pdfBase64,
          demande: result.demandeId ? { type: "affiliation", id: result.demandeId } : undefined,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    persist(next);
    setShowTransition("affiliation");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleC1Complete(result: {
    demandeId: string | null;
    pdfBase64: string;
    fileName: string;
  }) {
    const next: TransferJourneyState = {
      ...state,
      phase: "c32",
      pdfs: [
        ...state.pdfs.filter((p) => p.key !== "c1"),
        {
          key: "c1",
          label: "Formulaire C1 — Déclaration de situation",
          fileName: result.fileName,
          pdfBase64: result.pdfBase64,
          demande: result.demandeId ? { type: "c1", id: result.demandeId } : undefined,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    persist(next);
    setShowTransition("c1");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function envoyerAuServiceChomage() {
    if (state.onemEmailSent) return;
    const c1Pdf = state.pdfs.find((p) => p.key === "c1");
    const c32Pdf = state.pdfs.find((p) => p.key === "c32");
    if (!c1Pdf || !c32Pdf || !state.profile) {
      throw new Error("Les formulaires C1 et C3.2 sont introuvables.");
    }

    await postJson("/api/send-onem-bundle", {
      nom: state.profile.nom.trim(),
      prenom: state.profile.prenom.trim(),
      email: state.profile.email.trim().toLowerCase(),
      c1: { pdfBase64: c1Pdf.pdfBase64, fileName: c1Pdf.fileName, demandeId: c1Pdf.demande?.id },
      c32: { pdfBase64: c32Pdf.pdfBase64, fileName: c32Pdf.fileName, demandeId: c32Pdf.demande?.id },
    });

    persist({
      ...state,
      onemEmailSent: true,
      updatedAt: new Date().toISOString(),
    });
  }

  async function handleC32Complete(result: {
    form: { nom: string; prenom: string; email: string };
    demandeId: string | null;
    pdfBase64: string;
    fileName: string;
  }) {
    const c1Pdf = state.pdfs.find((p) => p.key === "c1");
    if (!c1Pdf) {
      throw new Error("PDF C1 introuvable — impossible de terminer le parcours.");
    }

    const next: TransferJourneyState = {
      ...state,
      phase: "complete",
      pdfs: [
        ...state.pdfs.filter((p) => p.key !== "c32"),
        {
          key: "c32",
          label: "Formulaire C3.2 — Chômage temporaire",
          fileName: result.fileName,
          pdfBase64: result.pdfBase64,
          demande: result.demandeId ? { type: "c32", id: result.demandeId } : undefined,
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    persist(next);
    setShowTransition(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!ready) return null;

  const c1Initial = state.profile ? profileToC1(state.profile) : undefined;
  const c32Initial = state.profile ? profileToC32(state.profile) : undefined;
  const c1Pdf = state.pdfs.find((p) => p.key === "c1");

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {state.phase !== "intro" && state.phase !== "complete" && (
          <JourneyStepper phase={state.phase} />
        )}

        {showTransition === "affiliation" && state.phase === "c1" && (
          <TransitionBanner
            title="Étape 1 terminée — Affiliation enregistrée"
            description="Vos coordonnées ont été reprises. Complétez maintenant le formulaire C1 (seuls les champs spécifiques à l'ONEM restent à remplir)."
          />
        )}

        {showTransition === "c1" && state.phase === "c32" && (
          <TransitionBanner
            title="Étape 2 terminée — Formulaire C1 enregistré"
            description="Il ne reste plus que le formulaire C3.2. Votre identité est déjà préremplie."
          />
        )}

        {state.phase === "intro" && (
          <IntroScreen onStart={handleStart} onResume={handleResume} />
        )}

        {state.phase === "affiliation" && (
          <FormulaireWebIndependant
            journeyMode
            initialData={{ affilieAutreSyndicat: "oui" }}
            onComplete={handleAffiliationComplete}
          />
        )}

        {state.phase === "c1" && c1Initial && (
          <FormulaireC1
            journeyMode
            initialData={c1Initial}
            onComplete={handleC1Complete}
          />
        )}

        {state.phase === "c32" && c32Initial && c1Pdf && (
          <FormulaireC32
            journeyMode
            initialData={c32Initial}
            onComplete={handleC32Complete}
          />
        )}

        {state.phase === "c32" && c32Initial && !c1Pdf && (
          <div className="form-carte mx-auto max-w-lg text-center">
            <p className="mb-4 text-[16px]">
              Le formulaire C1 est introuvable. Veuillez reprendre l&apos;étape C1 avant de continuer.
            </p>
            <button
              type="button"
              onClick={() => persist({ ...state, phase: "c1", updatedAt: new Date().toISOString() })}
              className="form-btn-principal"
            >
              Retour au formulaire C1
            </button>
          </div>
        )}

        {state.phase === "complete" && (
          <CompleteScreen
            state={state}
            onRestart={handleRestart}
            onEnvoyerServiceChomage={envoyerAuServiceChomage}
          />
        )}
      </div>
    </div>
  );
}
