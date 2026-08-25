"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import type { C32Data } from "./app/api/fill-c3-2/route";
import { getSupabase } from "./lib/supabase";
import { postJson } from "./lib/post-json";
import { useOnceSubmit } from "./lib/use-once-submit";

const EMPTY: C32Data = {
  prenom: "",
  nom: "",
  niss: "",
  email: "",
  dateDebutChomage: "",
  typeDemandeur: "",
  declAffirme: false,
  dateSig: "",
  signature: "",
};

const TIPS: Record<string, string> = {
  niss: "Votre numéro NISS se trouve au verso de votre carte d'identité. Les six premiers chiffres correspondent en principe à votre date de naissance (année, mois, jour).",
  travailleur: "Cochez « Travailleur » si vous êtes occupé dans les liens d'un contrat de travail.",
  apprenti: "Cochez « Apprenti » uniquement s'il s'agit d'une formation en alternance visée à l'article 1bis de l'AR du 28.11.1969.",
  dateDebut: "Indiquez la date à partir de laquelle vous demandez des allocations de chômage temporaire.",
  decl: "J'affirme sur l'honneur que la présente déclaration est sincère et complète.",
  rappel: "Après la date d'entrée en vigueur de votre chômage temporaire, vous devez introduire ce formulaire le plus rapidement possible auprès de votre organisme de paiement.",
};

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold hover:bg-blue-200 border border-blue-200"
        aria-label="Aide"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 top-5 left-0 w-72 bg-white border border-blue-200 rounded-lg shadow-xl p-3 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
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
        {tip && <InfoTooltip text={TIPS[tip] ?? tip} />}
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

function DateInput({ value, onChange, className }: {
  value: string; onChange: (value: string) => void; className: string;
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

function formatNiss(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 6) return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
  if (d.length <= 9) return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}-${d.slice(6, 9)}.${d.slice(9)}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-gray-800 bg-gray-100 rounded-lg px-3 py-2 mb-3 mt-2">
      {children}
    </h3>
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
        width={400}
        height={80}
        className={`border rounded-lg w-full touch-none bg-white cursor-crosshair ${error ? "border-red-400" : "border-gray-300"}`}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
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

const STEP_LABELS = ["Votre identité", "Votre demande", "Signature"];
const TOTAL_STEPS = STEP_LABELS.length;

export interface C32FormProps {
  journeyMode?: boolean;
  initialData?: Partial<C32Data>;
  /** En parcours guidé : le parent envoie l'e-mail groupé C1+C3.2 (une seule fois). */
  onComplete?: (result: {
    form: C32Data;
    pdfBase64: string;
    fileName: string;
  }) => void | Promise<void>;
}

export default function FormulaireC32({
  journeyMode = false,
  initialData,
  onComplete,
}: C32FormProps = {}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<C32Data>({ ...EMPTY, ...initialData });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { acquire, release } = useOnceSubmit();

  function set<K extends keyof C32Data>(field: K, value: C32Data[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};

    if (s === 1) {
      if (!form.nom.trim()) e.nom = "Requis";
      if (!form.prenom.trim()) e.prenom = "Requis";
      if (!form.niss.replace(/\D/g, "")) e.niss = "Requis";
      else if (form.niss.replace(/\D/g, "").length !== 11) e.niss = "Le NISS doit comporter 11 chiffres";
      if (!form.email.trim()) e.email = "Requis";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Adresse e-mail invalide";
    }

    if (s === 2) {
      if (!form.dateDebutChomage.trim()) e.dateDebutChomage = "Requis";
      else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.dateDebutChomage)) e.dateDebutChomage = "Format jj/mm/aaaa";
      if (!form.typeDemandeur) e.typeDemandeur = "Sélectionnez Travailleur ou Apprenti";
    }

    if (s === 3) {
      if (!form.declAffirme) e.declAffirme = "Requis";
      if (!form.dateSig) e.dateSig = "Requis";
      if (!form.signature) e.signature = "La signature est obligatoire";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep(s => Math.min(s + 1, TOTAL_STEPS));
  }

  function prev() {
    setStep(s => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    if (!acquire() || loading) return;
    if (!validateStep(step)) {
      release();
      return;
    }
    setLoading(true);
    try {
      const fillRes = await fetch("/api/fill-c3-2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!fillRes.ok) throw new Error("Erreur remplissage PDF");
      const { pdfBase64: b64 } = await fillRes.json();
      setPdfBase64(b64);

      await getSupabase().from("web_c3_2").insert({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        niss: form.niss.replace(/\D/g, "") || null,
        email: form.email.trim().toLowerCase() || null,
        data: form,
      });

      const fileName = `formulaire-c3-2-${form.nom.toLowerCase()}-${form.prenom.toLowerCase()}.pdf`;

      if (journeyMode && onComplete) {
        await onComplete({ form, pdfBase64: b64, fileName });
        return;
      }

      if (!journeyMode) {
        await postJson("/api/send-c3-2", {
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          email: form.email.trim().toLowerCase(),
          pdfBase64: b64,
          fileName,
        });
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      release();
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
    a.download = `formulaire-c3-2-${form.nom.toLowerCase()}-${form.prenom.toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={52} />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Formulaire prêt</h2>
        <p className="text-gray-600 text-sm mb-6">
          Votre formulaire C3.2 a été complété. Téléchargez-le et remettez-le le plus rapidement possible à votre organisme de paiement.
        </p>
        <button
          onClick={downloadPdf}
          className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-xl text-sm"
        >
          <FileDown size={18} /> Télécharger le formulaire C3.2 (PDF)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-gray-800 text-white rounded-t-2xl px-6 py-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Office National de l&apos;Emploi</p>
        <h1 className="text-base font-bold">Formulaire C3.2 — Demande d&apos;allocations de chômage temporaire</h1>
        <p className="text-xs text-gray-400 mt-1">Étape {step}/{TOTAL_STEPS} : {STEP_LABELS[step - 1]}</p>
      </div>

      <div className="bg-white shadow rounded-b-2xl px-6 py-6">
        <StepIndicator step={step} total={TOTAL_STEPS} />

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-4">
          <p>{TIPS.rappel}</p>
        </div>

        {step === 1 && (
          <>
            <SectionTitle>Votre identité</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom *" error={errors.prenom}>
                <input className={inp(errors.prenom)} value={form.prenom} onChange={e => set("prenom", e.target.value)} />
              </Field>
              <Field label="Nom *" error={errors.nom}>
                <input className={inp(errors.nom)} value={form.nom} onChange={e => set("nom", e.target.value)} />
              </Field>
            </div>
            <Field label="Numéro de Registre national (NISS) *" hint="Format : 85.04.12-123.45" tip="niss" error={errors.niss}>
              <input
                className={inp(errors.niss)}
                value={form.niss}
                onChange={e => set("niss", formatNiss(e.target.value))}
                placeholder="85.04.12-123.45"
                maxLength={15}
              />
            </Field>
            <Field label="Adresse e-mail *" error={errors.email}>
              <input
                type="email"
                className={inp(errors.email)}
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="vous@exemple.be"
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle>Votre demande</SectionTitle>
            <Field label="Je demande des allocations de chômage temporaire à partir du *" tip="dateDebut" error={errors.dateDebutChomage}>
              <DateInput className={inp(errors.dateDebutChomage)} value={form.dateDebutChomage} onChange={v => set("dateDebutChomage", v)} />
            </Field>

            <Field label="En tant que *" error={errors.typeDemandeur}>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    checked={form.typeDemandeur === "travailleur"}
                    onChange={() => set("typeDemandeur", "travailleur")}
                    className="accent-blue-600"
                  />
                  <span>Travailleur</span>
                  <InfoTooltip text={TIPS.travailleur} />
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    checked={form.typeDemandeur === "apprenti"}
                    onChange={() => set("typeDemandeur", "apprenti")}
                    className="accent-blue-600"
                  />
                  <span>Apprenti</span>
                  <InfoTooltip text={TIPS.apprenti} />
                </label>
              </div>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle>Signature</SectionTitle>
            <div className="mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.declAffirme}
                  onChange={e => set("declAffirme", e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  J&apos;affirme sur l&apos;honneur que la présente déclaration est sincère et complète.
                  <InfoTooltip text={TIPS.decl} />
                </span>
              </label>
              {errors.declAffirme && <p className="text-red-600 text-xs ml-7">{errors.declAffirme}</p>}
            </div>

            <Field label="Date de signature *" error={errors.dateSig}>
              <DateInput className={inp(errors.dateSig)} value={form.dateSig} onChange={v => set("dateSig", v)} />
            </Field>

            <Field label="Signature travailleur * (signez dans le cadre ci-dessous)" error={errors.signature}>
              <SignaturePad
                value={form.signature}
                onChange={v => {
                  set("signature", v);
                  setErrors(prev => ({ ...prev, signature: undefined }));
                }}
                error={errors.signature}
              />
            </Field>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 mt-4">
              <strong>Protection des données :</strong> vos déclarations sont conservées dans des fichiers informatiques.
              Plus d&apos;informations sur{" "}
              <a href="https://www.onem.be" target="_blank" rel="noopener noreferrer" className="underline">
                www.onem.be
              </a>
              .
            </div>
          </>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={prev}
            disabled={step === 1}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Précédent
          </button>
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-xl text-sm"
            >
              Suivant <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-5 rounded-xl text-sm"
            >
              {loading ? "Génération…" : <><FileDown size={15} /> Générer le PDF</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
