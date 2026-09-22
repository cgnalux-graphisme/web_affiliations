"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle,
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

  return (
    <nav aria-label="Étapes du parcours de transfert" className="mb-8">
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map(({ label, Icon }, i) => (
          <li key={label} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={[
                "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all",
                i < currentIndex
                  ? "border-red-500 bg-red-100 text-red-800"
                  : i === currentIndex
                    ? "scale-110 border-red-900 bg-red-900 text-white shadow-md"
                    : "border-gray-300 bg-gray-100 text-gray-400",
              ].join(" ")}
            >
              {i < currentIndex ? (
                <CheckCircle className="h-5 w-5" aria-hidden />
              ) : (
                <Icon className="h-5 w-5" aria-hidden />
              )}
            </div>
            <span
              className={[
                "hidden text-center text-xs font-medium sm:block",
                i === currentIndex ? "text-red-900" : i < currentIndex ? "text-red-500" : "text-gray-400",
              ].join(" ")}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function IntroScreen({ onStart, onResume }: { onStart: () => void; onResume: () => void }) {
  const saved = loadTransferJourney();
  const canResume = saved && saved.phase !== "intro" && saved.phase !== "complete";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-red-900 p-3 text-white">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
              Parcours guidé
            </p>
            <h1 className="text-2xl font-bold text-gray-900">Transfert vers la FGTB</h1>
          </div>
        </div>

        <p className="mb-6 text-sm leading-7 text-gray-600">
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
            <li key={text} className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-900 text-xs font-bold text-white">
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-950"
          >
            Commencer le parcours
            <ChevronRight className="h-4 w-4" />
          </button>
          {canResume && (
            <button
              type="button"
              onClick={onResume}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
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
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-700"
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
    <div className="mx-auto mb-6 max-w-2xl rounded-xl border border-green-200 bg-green-50 px-5 py-4">
      <p className="font-semibold text-green-800">{title}</p>
      <p className="mt-1 text-sm text-green-700">{description}</p>
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
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    persist(next);
    setShowTransition("affiliation");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleC1Complete(result: {
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
      c1: { pdfBase64: c1Pdf.pdfBase64, fileName: c1Pdf.fileName },
      c32: { pdfBase64: c32Pdf.pdfBase64, fileName: c32Pdf.fileName },
    });

    persist({
      ...state,
      onemEmailSent: true,
      updatedAt: new Date().toISOString(),
    });
  }

  async function handleC32Complete(result: {
    form: { nom: string; prenom: string; email: string };
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
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
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
          <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
            <p className="mb-4 text-sm text-gray-600">
              Le formulaire C1 est introuvable. Veuillez reprendre l&apos;étape C1 avant de continuer.
            </p>
            <button
              type="button"
              onClick={() => persist({ ...state, phase: "c1", updatedAt: new Date().toISOString() })}
              className="rounded-xl bg-red-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-950"
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
