"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  BookOpen,
  CheckCircle,
  ClipboardCheck,
  ClipboardPaste,
  ExternalLink,
  HelpCircle,
  Italic,
  Lightbulb,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { IconeChargement } from "../../Chargement";
import { compterMots, evaluerMatiere, lecturePossible, SEUIL_CORRECTE, SEUIL_SOLIDE, type Lisible, type Matiere } from "../../../lib/matiere";
import { CONSIGNES_MAX, EXTRAIT_MAX, LECTURES_MAX } from "../../../lib/redaction-limites";
import type { Lisibilite } from "../../api/redaction/lisibilite/route";

/** Une source proposée à la rédaction assistée (un article du fil). */
export type SourcePanneau = {
  id: string;
  titre: string;
  source: string | null;
  lien: string;
  resumeMots: number;
  alerte?: boolean;
};

/** Ce que le panneau transmet au formulaire pour lancer le brouillon. */
export type DemandeBrouillon = {
  veilleIds: string[];
  lire: string[];
  textes: Record<string, string>;
  notes: string;
  consignes: string;
};

/** État de la rédaction assistée, tenu par le formulaire (il applique le brouillon). */
export type EtatIA =
  | { etape: "inactif" }
  | { etape: "en_cours"; lecture: boolean }
  | { etape: "propose"; avertissement: string | null; suggestionImage: string; matiere: string; reprises: number }
  | { etape: "erreur"; message: string };

export const RAPPEL_IA = "Brouillon IA — à vérifier, corriger et valider avant publication. Recoupez avec les sources.";

type EtatSource = {
  lisible: Lisible;
  explication: string;
  lien: string;
  lire: boolean;
  texte: string;
  ouvert: boolean;
  message: string;
  /** Change à chaque collage réussi : relance l'animation de confirmation de la ligne. */
  confirme: number;
};

const NIVEAUX: Record<Matiere["niveau"], { libelle: string; texte: string; remplissage: string }> = {
  maigre: { libelle: "Maigre", texte: "text-militant-charbon", remplissage: "bg-militant-ardoise" },
  correcte: { libelle: "Correcte", texte: "text-militant-rouge", remplissage: "bg-militant-rouge" },
  solide: { libelle: "Solide", texte: "text-militant-bordeaux", remplissage: "bg-militant-bordeaux" },
};
const PLEIN = 900;

const BOUTON =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 px-3.5 py-1.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:cursor-not-allowed disabled:opacity-50";
const BOUTON_PLEIN = `${BOUTON} border-militant-bordeaux bg-militant-bordeaux text-white hover:border-militant-charbon hover:bg-militant-charbon`;
const BOUTON_CONTOUR = `${BOUTON} border-militant-charbon bg-white hover:bg-militant-charbon hover:text-white`;
const BOUTON_DISCRET = `${BOUTON} border-transparent hover:border-militant-charbon`;

const liste = (elements: string[]) => elements.join(", ").replace(/, ([^,]*)$/, " et $1");
const nombre = (n: number) => n.toLocaleString("fr-BE");

/**
 * Rédaction assistée par l'IA, à partir d'une ou plusieurs sources du fil :
 * 1. sources (lecture par l'IA si le média l'autorise, ou texte collé) ; 2. notes ; 3. consignes ; 4. création.
 * La jauge « Matière » dit si l'IA a de quoi écrire et quel geste ferait le plus progresser le brouillon.
 */
export default function PanneauRedaction({
  refPanneau,
  sources,
  consignesInitiales = "",
  ia,
  onLancer,
}: {
  refPanneau: React.RefObject<HTMLElement | null>;
  sources: SourcePanneau[];
  consignesInitiales?: string;
  ia: EtatIA;
  onLancer: (demande: DemandeBrouillon) => void;
}) {
  const enCours = ia.etape === "en_cours";
  const [etats, setEtats] = useState<Record<string, EtatSource>>(() =>
    Object.fromEntries(
      sources.map((s) => [
        s.id,
        { lisible: "chargement", explication: "", lien: s.lien, lire: false, texte: "", ouvert: false, message: "", confirme: 0 },
      ])
    )
  );
  const [notes, setNotes] = useState("");
  const [consignes, setConsignes] = useState(consignesInitiales);

  function maj(id: string, changement: Partial<EtatSource>) {
    setEtats((e) => ({ ...e, [id]: { ...e[id], ...changement } }));
  }

  // L'IA pourra-t-elle lire chaque article ? (vérification gratuite du robots.txt de chaque média)
  useEffect(() => {
    let actif = true;
    for (const s of sources) {
      fetch(`/api/redaction/lisibilite?veilleId=${s.id}`)
        .then(async (r) => {
          const json = (await r.json().catch(() => ({}))) as Partial<Lisibilite> & { erreur?: string };
          if (!actif) return;
          maj(
            s.id,
            r.ok && json.lisible
              ? { lisible: json.lisible, explication: json.explication ?? "", lien: json.lien ?? s.lien }
              : { lisible: "inconnu", explication: json.erreur ?? "La vérification a échoué." }
          );
        })
        .catch(() => actif && maj(s.id, { lisible: "inconnu", explication: "La vérification a échoué (réseau)." }));
    }
    return () => {
      actif = false;
    };
  }, [sources]);

  const matiere = useMemo(
    () =>
      evaluerMatiere(
        sources.map((s) => ({
          nom: s.source ?? "cette source",
          resumeMots: s.resumeMots,
          lisible: etats[s.id].lisible,
          lire: etats[s.id].lire,
          texteMots: compterMots(etats[s.id].texte),
        })),
        compterMots(notes)
      ),
    [sources, etats, notes]
  );

  async function coller(id: string) {
    try {
      const texte = await navigator.clipboard.readText();
      if (!texte.trim()) {
        maj(id, { message: "Le presse-papiers est vide : copiez d'abord le texte de l'article (Ctrl+A puis Ctrl+C)." });
        return;
      }
      // Le texte collé remplace la lecture par l'IA : inutile de payer deux fois la même matière.
      setEtats((e) => ({ ...e, [id]: { ...e[id], texte, lire: false, message: "", confirme: e[id].confirme + 1 } }));
    } catch {
      // Navigateur qui refuse l'accès au presse-papiers : collage manuel dans le champ.
      maj(id, { ouvert: true, message: "Collez le texte dans le champ ci-dessous (Ctrl+V)." });
      requestAnimationFrame(() => document.getElementById(`texte-${id}`)?.focus());
    }
  }

  const textesTrop = sources.some((s) => etats[s.id].texte.trim().length > EXTRAIT_MAX) || notes.trim().length > EXTRAIT_MAX;
  const consignesTrop = consignes.trim().length > CONSIGNES_MAX;

  function lancer() {
    const lire = sources.filter((s) => etats[s.id].lire && lecturePossible(etats[s.id].lisible)).map((s) => s.id);
    const textes = Object.fromEntries(
      sources.filter((s) => etats[s.id].texte.trim()).map((s) => [s.id, etats[s.id].texte.trim()])
    );
    onLancer({ veilleIds: sources.map((s) => s.id), lire, textes, notes: notes.trim(), consignes: consignes.trim() });
  }

  // Récapitulatif de ce que l'IA utilisera.
  const nomsLus = sources.filter((s) => etats[s.id].lire && lecturePossible(etats[s.id].lisible)).map((s) => s.source ?? "une source");
  const nomsColles = sources.filter((s) => etats[s.id].texte.trim()).map((s) => s.source ?? "une source");
  const recap = [
    sources.length > 1 ? `les ${sources.length} résumés du flux` : "le résumé du flux",
    nomsLus.length && `${nomsLus.length > 1 ? "les articles" : "l'article"} de ${liste(nomsLus)}, lu${nomsLus.length > 1 ? "s" : ""} par l'IA`,
    nomsColles.length && `votre texte de ${liste(nomsColles)}`,
    notes.trim() && "vos notes",
    consignes.trim() && "vos consignes",
  ].filter(Boolean) as string[];

  return (
    <section
      ref={refPanneau}
      tabIndex={-1}
      aria-labelledby="titre-panneau-ia"
      className="overflow-hidden rounded-2xl border-2 border-militant-bordeaux bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
    >
      {ia.etape === "propose" && <BandeauPropose ia={ia} />}

      <div className="px-5 py-5 sm:px-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] md:items-start">
          <div>
            <h2 id="titre-panneau-ia" className="flex items-center gap-2 font-condensed text-2xl font-extrabold leading-none">
              <Sparkles size={20} className="text-militant-bordeaux" aria-hidden />
              Rédaction assistée par l&apos;IA
            </h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed">
              {sources.length > 1
                ? `Un seul article de synthèse à partir des ${sources.length} sources du sujet. `
                : "Un brouillon à partir de cet article. "}
              Donnez à l&apos;IA le texte d&apos;au moins une source : elle lit celles que le média autorise, vous collez les
              autres. Les passages repris mot pour mot sont mis en italique.
            </p>
          </div>
          <JaugeMatiere matiere={matiere} />
        </div>

        <ol className="mt-6 space-y-6">
          <Etape numero={1} titre={sources.length > 1 ? `Les ${sources.length} sources` : "La source"}>
            <p className="mb-3 text-sm">
              Lecture par l&apos;IA : {LECTURES_MAX} sources au maximum, environ 8 c. chacune. Sinon, ouvrez l&apos;article et
              collez son texte.
            </p>
            <ul className="space-y-2.5">
              {sources.map((s) => (
                <LigneSource
                  key={s.id}
                  source={s}
                  etat={etats[s.id]}
                  quotaAtteint={matiere.lectures >= LECTURES_MAX}
                  desactive={enCours}
                  onLire={() => maj(s.id, { lire: !etats[s.id].lire })}
                  onColler={() => coller(s.id)}
                  onTexte={(texte) => maj(s.id, { texte, lire: texte.trim() ? false : etats[s.id].lire, message: "" })}
                  onOuvrir={(ouvert) => maj(s.id, { ouvert, message: "" })}
                  onRetirer={() => maj(s.id, { texte: "", ouvert: false, message: "" })}
                />
              ))}
            </ul>
          </Etape>

          <Etape numero={2} titre="Vos notes" id="notes-ia" facultatif>
            <p id="aide-notes-ia" className="mb-1.5 text-xs">
              Ce que vous savez et qui n&apos;est pas dans les articles : faits, chiffres, contexte local, réaction d&apos;un
              délégué.
            </p>
            <textarea
              id="notes-ia"
              aria-describedby="aide-notes-ia"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={enCours}
              rows={3}
              placeholder="Ex. Le piquet de Libramont a réuni une quarantaine de personnes."
              className={champ(notes.trim().length > EXTRAIT_MAX)}
            />
            <Compteur valeur={notes} max={EXTRAIT_MAX} />
          </Etape>

          <Etape numero={3} titre="Consignes pour l'IA" id="consignes-ia" facultatif>
            <p id="aide-consignes-ia" className="mb-1.5 text-xs">
              {consignesInitiales
                ? "Pré-remplies avec l'angle proposé par le Check IA : modifiez-les librement. "
                : "L'angle, le ton, le public, la longueur, les points à mettre en avant. "}
              Elles ne lèvent jamais les règles de base : pas d&apos;invention, pas de recopie.
            </p>
            <textarea
              id="consignes-ia"
              aria-describedby="aide-consignes-ia"
              value={consignes}
              onChange={(e) => setConsignes(e.target.value)}
              disabled={enCours}
              rows={3}
              placeholder={"Ex. Insiste sur l'impact pour les ouvriers de la construction.\nTon plus sobre, 400 mots maximum."}
              className={champ(consignesTrop)}
            />
            <Compteur valeur={consignes} max={CONSIGNES_MAX} />
          </Etape>

          <Etape numero={4} titre={ia.etape === "propose" ? "Créer un autre brouillon" : "Créer le brouillon"}>
            <p className="text-sm leading-relaxed">
              L&apos;IA utilisera {liste(recap)}. <span className="font-semibold">Coût estimé : environ {matiere.coutCentimes} c.</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={lancer}
                disabled={enCours || textesTrop || consignesTrop}
                className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl bg-militant-bordeaux px-5 py-2 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {enCours ? (
                  <IconeChargement size={16} />
                ) : ia.etape === "propose" ? (
                  <RefreshCw size={16} aria-hidden />
                ) : (
                  <Sparkles size={16} aria-hidden />
                )}
                {enCours ? "Création en cours…" : ia.etape === "propose" ? "Créer un autre brouillon avec l'IA" : "Créer le brouillon avec l'IA"}
              </button>
              {enCours && (
                <p className="text-sm font-semibold" aria-live="polite">
                  {ia.lecture
                    ? "L'IA lit les articles puis rédige… Comptez 30 secondes à 2 minutes."
                    : "L'IA rédige… Comptez 20 secondes à 1 minute."}{" "}
                  Ne fermez pas la page.
                </p>
              )}
              {matiere.niveau === "maigre" && !enCours && (
                <p className="text-sm">Matière maigre : le brouillon sera court et prudent.</p>
              )}
            </div>
            {ia.etape === "erreur" && (
              <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-militant-bordeaux">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
                {ia.message}
              </p>
            )}
          </Etape>
        </ol>
      </div>
    </section>
  );
}

/** Jauge « Matière » : remplissage animé à chaque geste, niveau écrit en toutes lettres, conseil du geste suivant. */
function JaugeMatiere({ matiere }: { matiere: Matiere }) {
  const niveau = NIVEAUX[matiere.niveau];
  const pourcent = Math.round(matiere.remplissage * 100);
  const repereCorrecte = (SEUIL_CORRECTE / PLEIN) * 100;
  const repereSolide = (SEUIL_SOLIDE / PLEIN) * 100;
  return (
    <div className="rounded-2xl border border-militant-ardoise px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p id="titre-matiere" className="text-sm font-bold">
          Matière pour l&apos;IA
        </p>
        <p className={`font-condensed text-3xl font-extrabold leading-none transition-colors ${niveau.texte}`} aria-hidden>
          {niveau.libelle}
        </p>
      </div>
      <div
        role="meter"
        aria-labelledby="titre-matiere"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pourcent}
        aria-valuetext={niveau.libelle}
        className="relative mt-2.5 h-3.5 overflow-hidden rounded-full bg-militant-ardoise/25"
      >
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none ${niveau.remplissage}`}
          style={{ width: `${Math.max(pourcent, 4)}%` }}
        />
        {/* Repères des seuils, en blanc par-dessus le remplissage. */}
        <span aria-hidden className="absolute inset-y-0 w-[3px] bg-white" style={{ left: `${repereCorrecte}%` }} />
        <span aria-hidden className="absolute inset-y-0 w-[3px] bg-white" style={{ left: `${repereSolide}%` }} />
      </div>
      <div aria-hidden className="relative mt-1 h-4 text-[11px] font-semibold">
        <span className="absolute left-0">Maigre</span>
        <span className="absolute" style={{ left: `calc(${repereCorrecte}% + 6px)` }}>
          Correcte
        </span>
        <span className="absolute" style={{ left: `calc(${repereSolide}% + 6px)` }}>
          Solide
        </span>
      </div>
      <p aria-live="polite" className="mt-2.5 flex items-start gap-1.5 text-sm leading-snug">
        {matiere.conseil ? (
          <>
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-militant-rouge" aria-hidden />
            {matiere.conseil}
          </>
        ) : (
          <>
            <CheckCircle size={16} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
            Assez de matière : vous pouvez créer le brouillon.
          </>
        )}
      </p>
    </div>
  );
}

/** Une source : média, titre, lisibilité, puis « Ouvrir », « Faire lire » et « Coller ». */
function LigneSource({
  source,
  etat,
  quotaAtteint,
  desactive,
  onLire,
  onColler,
  onTexte,
  onOuvrir,
  onRetirer,
}: {
  source: SourcePanneau;
  etat: EtatSource;
  quotaAtteint: boolean;
  desactive: boolean;
  onLire: () => void;
  onColler: () => void;
  onTexte: (texte: string) => void;
  onOuvrir: (ouvert: boolean) => void;
  onRetirer: () => void;
}) {
  const nom = source.source ?? "Source inconnue";
  const texteMots = compterMots(etat.texte);
  const lisible = lecturePossible(etat.lisible);
  const lue = etat.lire && lisible;
  // Rail de gauche : ce qui nourrira l'IA pour cette source (le texte de la ligne le dit aussi).
  const rail = texteMots ? "bg-militant-bordeaux" : lue ? "bg-militant-rouge" : "bg-militant-ardoise/45";
  const idTexte = `texte-${source.id}`;

  return (
    <li className="relative grid gap-x-4 gap-y-3 overflow-hidden rounded-xl border border-militant-ardoise bg-white py-3.5 pl-5 pr-3.5 sm:grid-cols-[minmax(0,1fr)_auto]">
      {/* Confirmation d'un collage : voile bordeaux qui s'efface (rejoué à chaque collage grâce à la clé). */}
      {etat.confirme > 0 && <span key={etat.confirme} aria-hidden className="source-confirmee pointer-events-none absolute inset-0" />}
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[6px] transition-colors duration-300 ${rail}`} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-condensed text-xl font-bold leading-tight">{nom}</span>
          {source.alerte && (
            <span className="rounded-full border border-militant-ardoise px-2 py-px text-[11px] font-semibold">via alerte Google</span>
          )}
          <PuceLisibilite etat={etat} />
        </p>
        <a
          href={etat.lien}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 line-clamp-2 max-w-prose break-words text-[15px] leading-snug decoration-militant-rouge decoration-2 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
        >
          {source.titre}
          <span className="sr-only"> (article d&apos;origine, nouvel onglet)</span>
        </a>
        <p className="mt-1 text-xs">
          Résumé du flux : {nombre(source.resumeMots)} mot{source.resumeMots > 1 ? "s" : ""}
          {texteMots > 0 && ` · votre texte : ${nombre(texteMots)} mots`}
          {lue && " · l'IA lira l'article"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:self-center">
        <a
          href={etat.lien}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ouvrir l'article de ${nom} (nouvel onglet)`}
          className={BOUTON_DISCRET}
        >
          <ExternalLink size={15} aria-hidden /> Ouvrir
        </a>
        {lisible && !texteMots && (
          <button
            type="button"
            aria-pressed={lue}
            onClick={onLire}
            disabled={desactive || (!lue && quotaAtteint)}
            title={!lue && quotaAtteint ? `${LECTURES_MAX} lectures maximum par brouillon` : undefined}
            className={lue ? BOUTON_PLEIN : BOUTON_CONTOUR}
          >
            {lue ? <CheckCircle size={15} aria-hidden /> : <BookOpen size={15} aria-hidden />}
            {lue ? "Lue par l'IA" : "Faire lire"}
            <span className="sr-only"> : {nom}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onColler}
          disabled={desactive}
          className={etat.lisible === "non" && !texteMots ? BOUTON_PLEIN : BOUTON_CONTOUR}
        >
          <ClipboardPaste size={15} aria-hidden />
          {texteMots ? "Recoller" : "Coller"}
          <span className="sr-only"> le texte de {nom}</span>
        </button>
      </div>

      {(texteMots > 0 || etat.ouvert || etat.message) && (
        <div className="sm:col-span-2">
          {etat.message && (
            <p role="status" className="mb-2 flex items-start gap-1.5 text-sm font-semibold text-militant-bordeaux">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
              {etat.message}
            </p>
          )}
          {texteMots > 0 && !etat.ouvert && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border-l-4 border-militant-bordeaux py-1 pl-3 text-sm">
              <ClipboardCheck size={16} className="text-militant-bordeaux" aria-hidden />
              <span>
                <span className="font-bold">Texte collé</span> : {nombre(texteMots)} mots
              </span>
              <button
                type="button"
                onClick={() => onOuvrir(true)}
                disabled={desactive}
                className="min-h-[44px] px-1 font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
              >
                Voir ou modifier
              </button>
              <button
                type="button"
                onClick={onRetirer}
                disabled={desactive}
                className="inline-flex min-h-[44px] items-center gap-1 px-1 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
              >
                <X size={14} aria-hidden /> Retirer
              </button>
            </div>
          )}
          {etat.ouvert && (
            <div>
              <label htmlFor={idTexte} className="mb-1 block text-sm font-bold">
                Texte de l&apos;article de {nom}
              </label>
              <textarea
                id={idTexte}
                value={etat.texte}
                onChange={(e) => onTexte(e.target.value)}
                disabled={desactive}
                rows={6}
                placeholder="Collez ici le texte de l'article (Ctrl+V). Menus et publicités peuvent rester : l'IA les ignore."
                className={champ(etat.texte.trim().length > EXTRAIT_MAX)}
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOuvrir(false)}
                  className="min-h-[44px] text-sm font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                >
                  Replier
                </button>
                <Compteur valeur={etat.texte} max={EXTRAIT_MAX} />
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function PuceLisibilite({ etat }: { etat: EtatSource }) {
  const contenu =
    etat.lisible === "chargement"
      ? { icone: <IconeChargement size={13} className="text-militant-rouge" />, texte: "Vérification…" }
      : etat.lisible === "oui"
        ? { icone: <CheckCircle size={13} className="text-militant-rouge" aria-hidden />, texte: "L'IA peut lire" }
        : etat.lisible === "non"
          ? { icone: <Ban size={13} className="text-militant-bordeaux" aria-hidden />, texte: "À lire vous-même" }
          : { icone: <HelpCircle size={13} aria-hidden />, texte: "Lecture incertaine" };
  return (
    <span
      title={etat.explication || undefined}
      className="inline-flex items-center gap-1 rounded-full border border-militant-ardoise px-2 py-px text-xs font-semibold"
    >
      {contenu.icone}
      {contenu.texte}
      {etat.explication && <span className="sr-only"> : {etat.explication}</span>}
    </span>
  );
}

function BandeauPropose({ ia }: { ia: Extract<EtatIA, { etape: "propose" }> }) {
  return (
    <div aria-live="polite">
      <div className="flex items-start gap-3 bg-militant-bordeaux px-5 py-4 text-white sm:px-6">
        <Sparkles size={22} className="mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-condensed text-2xl font-extrabold leading-tight">{RAPPEL_IA}</p>
          <p className="mt-1 text-sm">
            {ia.matiere} Tous les champs sont modifiables ; la date et le statut n&apos;ont pas été touchés (l&apos;article
            reste un brouillon).
          </p>
        </div>
      </div>
      {(ia.reprises > 0 || ia.avertissement) && (
        <div className="space-y-2 border-b-2 border-militant-bordeaux px-5 py-3 text-sm sm:px-6">
          {ia.reprises > 0 && (
            <p className="flex items-start gap-2">
              <Italic size={17} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
              <span>
                <span className="font-bold text-militant-bordeaux">
                  {ia.reprises} passage{ia.reprises > 1 ? "s" : ""} repris mot pour mot, mis en italique dans le contenu.
                </span>{" "}
                Reformulez-les, ou gardez-les comme citations (entre guillemets, en citant le média).
              </span>
            </p>
          )}
          {ia.avertissement && (
            <p className="flex items-start gap-2">
              <AlertTriangle size={17} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
              <span>
                <span className="font-bold text-militant-bordeaux">À vérifier : </span>
                {ia.avertissement}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Etape({
  numero,
  titre,
  id,
  facultatif,
  children,
}: {
  numero: number;
  titre: string;
  id?: string;
  facultatif?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
      <span aria-hidden className="font-condensed text-3xl font-extrabold leading-none text-militant-rouge">
        {numero}
      </span>
      <div className="min-w-0">
        {id ? (
          <label htmlFor={id} className="mb-1 block text-[15px] font-bold">
            {titre}
            {facultatif && <span className="font-medium"> (facultatif)</span>}
          </label>
        ) : (
          <p className="mb-1 text-[15px] font-bold">{titre}</p>
        )}
        {children}
      </div>
    </li>
  );
}

function Compteur({ valeur, max }: { valeur: string; max: number }) {
  const n = valeur.trim().length;
  if (!n) return null;
  return (
    <p className={`mt-1 text-right text-xs tabular-nums ${n > max ? "font-bold text-militant-bordeaux" : ""}`}>
      {nombre(n)} / {nombre(max)} caractères{n > max ? " : raccourcissez" : ""}
    </p>
  );
}

function champ(trop: boolean) {
  return `w-full resize-y rounded-xl border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-militant-rouge disabled:opacity-60 ${
    trop ? "border-2 border-militant-bordeaux" : "border-militant-ardoise focus:border-militant-charbon"
  }`;
}
