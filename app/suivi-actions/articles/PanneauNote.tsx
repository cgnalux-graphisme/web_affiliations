"use client";

import { useRef, useState, type RefObject } from "react";
import { AlertTriangle, CheckCircle, FileUp, Loader2, Sparkles } from "lucide-react";
import type { Vulgarisation } from "../../../lib/vulgarisation-ia";

export const RAPPEL_NOTE = "Vulgarisation IA — vérifier la fidélité à la note FGTB avant publication.";

const TAILLE_MAX = 4 * 1024 * 1024;
const EXTENSIONS = [".docx", ".pdf"];

export type ResultatNote = { vulgarisation: Vulgarisation; document_source: string | null; archive: string | null };

type Etat =
  | { etape: "attente" }
  | { etape: "en_cours"; nom: string }
  | { etape: "fait"; nom: string; avertissement: string | null; noteSuffisante: boolean; archive: string | null }
  | { etape: "erreur"; message: string };

/**
 * « On vous explique » : dépôt d'une note FGTB (.docx ou .pdf) → texte extrait et vulgarisé par l'IA
 * sur le serveur → le formulaire est pré-rempli (onResultat). Rien ne part sans clic.
 */
export default function PanneauNote({
  refPanneau,
  dejaRedige,
  onResultat,
}: {
  refPanneau?: RefObject<HTMLElement | null>;
  dejaRedige: boolean;
  onResultat: (r: ResultatNote) => void;
}) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [etat, setEtat] = useState<Etat>({ etape: "attente" });
  const [survol, setSurvol] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const enCours = etat.etape === "en_cours";

  function accepter(f: File | null) {
    if (!f) return;
    const nom = f.name.toLowerCase();
    if (!EXTENSIONS.some((e) => nom.endsWith(e))) {
      setEtat({
        etape: "erreur",
        message: nom.endsWith(".doc")
          ? "Ancien format Word (.doc) : enregistrez la note en .docx puis réessayez."
          : "Choisissez une note au format Word (.docx) ou PDF.",
      });
      return;
    }
    if (f.size > TAILLE_MAX) {
      setEtat({ etape: "erreur", message: "Le fichier dépasse 4 Mo. Pour un PDF, essayez la version Word de la note." });
      return;
    }
    setFichier(f);
    setEtat({ etape: "attente" });
  }

  async function vulgariser() {
    if (!fichier || enCours) return;
    if (dejaRedige && !window.confirm("La vulgarisation remplacera le titre, le chapô, les points clés, le contenu et les sources déjà saisis. Continuer ?")) {
      return;
    }
    setEtat({ etape: "en_cours", nom: fichier.name });
    try {
      const donnees = new FormData();
      donnees.append("fichier", fichier);
      const reponse = await fetch("/api/redaction/note", { method: "POST", body: donnees });
      const json = (await reponse.json().catch(() => ({}))) as Partial<ResultatNote> & { erreur?: string };
      if (!reponse.ok || !json.vulgarisation) {
        setEtat({
          etape: "erreur",
          message:
            json.erreur ??
            (reponse.status === 413
              ? "Le fichier est trop lourd pour être envoyé (4 Mo maximum)."
              : reponse.status === 504
                ? "Le traitement a pris trop de temps. Réessayez ; si la note est très longue, gardez la partie utile."
                : "La vulgarisation a échoué. Réessayez."),
        });
        return;
      }
      onResultat(json as ResultatNote);
      setEtat({
        etape: "fait",
        nom: fichier.name,
        avertissement: json.vulgarisation.avertissement,
        noteSuffisante: json.vulgarisation.note_suffisante,
        archive: json.archive ?? null,
      });
    } catch {
      setEtat({ etape: "erreur", message: "Le serveur ne répond pas. Vérifiez votre connexion et réessayez." });
    }
  }

  return (
    <section
      ref={refPanneau}
      tabIndex={-1}
      aria-labelledby="titre-note"
      className="rounded-2xl border-2 border-militant-bordeaux bg-white p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
    >
      <h2 id="titre-note" className="flex items-center gap-2 font-condensed text-2xl font-extrabold uppercase leading-tight">
        <FileUp size={20} aria-hidden /> Importer une note à vulgariser
      </h2>
      <p className="mt-1 text-sm">
        Déposez la note technique de la FGTB (Word .docx ou PDF, 4 Mo maximum). Le texte est extrait sur le serveur, l&apos;IA
        le vulgarise et pré-remplit le formulaire ci-dessous. La note d&apos;origine est archivée (usage interne).
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          if (!enCours) accepter(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`mt-4 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          survol ? "border-militant-bordeaux" : "border-militant-ardoise"
        }`}
      >
        <p className="text-[15px]">
          {fichier ? (
            <>
              Note choisie : <span className="break-all font-bold">{fichier.name}</span>
            </>
          ) : (
            "Glissez la note ici, ou"
          )}
        </p>
        <input
          ref={champ}
          type="file"
          accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          id="fichier-note"
          disabled={enCours}
          onChange={(e) => {
            // Copier le fichier AVANT de vider le champ (vider le champ vide aussi sa FileList).
            const f = e.target.files?.[0] ?? null;
            e.target.value = "";
            accepter(f);
          }}
        />
        <label
          htmlFor="fichier-note"
          className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border-2 border-militant-charbon bg-white px-4 py-2 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus-within:ring-2 focus-within:ring-militant-rouge ${
            enCours ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <FileUp size={16} aria-hidden /> {fichier ? "Choisir une autre note" : "Choisir une note"}
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={vulgariser}
          disabled={!fichier || enCours}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-militant-bordeaux px-5 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {enCours ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Sparkles size={18} aria-hidden />}
          {enCours ? "Vulgarisation en cours…" : "Vulgariser la note"}
        </button>
        <p className="text-sm">Claude Sonnet 5 · quelques centimes par note</p>
      </div>

      <div aria-live="polite">
        {etat.etape === "en_cours" && (
          <p role="status" className="mt-4 flex items-start gap-2 font-semibold">
            <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-militant-rouge" aria-hidden />
            Lecture de la note puis vulgarisation par l&apos;IA… comptez 30 secondes à 2 minutes selon la longueur.
          </p>
        )}
        {etat.etape === "erreur" && (
          <p role="alert" className="mt-4 flex items-start gap-2 border-l-[6px] border-militant-bordeaux py-1 pl-3 font-semibold">
            {etat.message}
          </p>
        )}
        {etat.etape === "fait" && (
          <div className="mt-4 space-y-2">
            <p className="flex items-start gap-2 font-semibold">
              <CheckCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
              Formulaire pré-rempli à partir de « {etat.nom} ». Relisez chaque section avec la note sous les yeux.
            </p>
            {!etat.noteSuffisante && (
              <p className="flex items-start gap-2 rounded-xl border-2 border-militant-bordeaux px-3 py-2 text-sm font-semibold">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
                Selon l&apos;IA, la note est trop courte ou ambiguë pour une vulgarisation fiable.
              </p>
            )}
            {etat.avertissement && (
              <div className="rounded-xl border-2 border-militant-ardoise px-3 py-2 text-sm">
                <p className="font-bold">À vérifier :</p>
                <p className="mt-1 whitespace-pre-line">{etat.avertissement}</p>
              </div>
            )}
            {etat.archive && <p className="text-sm font-semibold text-militant-bordeaux">{etat.archive}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
