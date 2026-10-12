"use client";

import { useRef, useState, type RefObject } from "react";
import { AlertTriangle, CheckCircle, FileUp, Sparkles } from "lucide-react";
import { EcranChargement, IconeChargement } from "../../../Chargement";
import { Alerte } from "../../_partage/ui";
import type { Vulgarisation } from "../../../../lib/vulgarisation-ia";

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
      className="ecg-panneau ecg-panneau-corps"
    >
      <h2 id="titre-note" className="ecg-sous-titre flex items-center gap-2 leading-tight">
        <span className="ecg-entete-ico h-9 w-9 rounded-[10px]" aria-hidden>
          <FileUp size={18} />
        </span>
        Importer une note à vulgariser
      </h2>
      <p className="ecg-texte-doux mt-2 text-sm">
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
        className={`ecg-depot mt-4 cursor-default gap-3 ${survol ? "border-[var(--app-fonce)] bg-[var(--app-pale)]" : ""}`}
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
          className={`ecg-btn cursor-pointer ${enCours ? "pointer-events-none opacity-50" : ""}`}
        >
          <FileUp size={16} aria-hidden /> {fichier ? "Choisir une autre note" : "Choisir une note"}
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={vulgariser}
          disabled={!fichier || enCours}
          className="ecg-btn ecg-btn-principal"
        >
          {enCours ? <IconeChargement size={18} /> : <Sparkles size={18} aria-hidden />}
          {enCours ? "Vulgarisation en cours…" : "Vulgariser la note"}
        </button>
        <p className="ecg-aide m-0">Claude Sonnet 5, quelques centimes par note</p>
      </div>

      <div aria-live="polite">
        {etat.etape === "en_cours" && (
          <div className="mt-4 rounded-xl border border-[#dde2e7]">
            <EcranChargement compact texte="Lecture de la note puis vulgarisation par l'IA…" />
            <p className="ecg-texte-doux -mt-6 pb-6 text-center text-sm">Comptez 30 secondes à 2 minutes selon la longueur de la note.</p>
          </div>
        )}
        {etat.etape === "erreur" && (
          <Alerte ton="erreur" className="mt-4">
            {etat.message}
          </Alerte>
        )}
        {etat.etape === "fait" && (
          <div className="mt-4 space-y-2">
            <Alerte ton="succes" icone={CheckCircle}>
              Formulaire pré-rempli à partir de « {etat.nom} ». Relisez chaque section avec la note sous les yeux.
            </Alerte>
            {!etat.noteSuffisante && (
              <Alerte ton="attention" icone={AlertTriangle} role={null}>
                Selon l&apos;IA, la note est trop courte ou ambiguë pour une vulgarisation fiable.
              </Alerte>
            )}
            {etat.avertissement && (
              <Alerte ton="attention" role={null} titre="À vérifier :">
                <p className="mt-1 whitespace-pre-line">{etat.avertissement}</p>
              </Alerte>
            )}
            {etat.archive && <p className="ecg-erreur">{etat.archive}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
