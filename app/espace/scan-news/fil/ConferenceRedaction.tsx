"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ToucheReact, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Ban, CheckCircle, ExternalLink, EyeOff, FilePen, HelpCircle, PenLine, RotateCcw, Sparkles } from "lucide-react";
import { IconeChargement } from "../../../Chargement";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { STATUT_PUBLIE } from "../../../../lib/articles";
import type { ArticleLie } from "../../../../lib/veille-articles-lies";
import { avecDelai } from "../../../../lib/delai";
import { VEILLE_IGNORE, VEILLE_NOUVEAU, VEILLE_TRAITE, type StatutVeille } from "../../../../lib/veille";
import {
  FENETRE_HEURES,
  LIBELLES_FORMAT,
  LIBELLES_RANG,
  cheminRedactionSujet,
  idsDuSujet,
  type AnalyseEnregistree,
  type ArticleSujet,
  type Rang,
  type SujetClasse,
} from "../../../../lib/veille-tri";
import { domaineDe } from "../../../../lib/logo-media-domaine";
import LogoMedia from "./LogoMedia";
import { Statut, Vide } from "../../_partage/ui";

const RANGS_LISTE: Rang[] = ["S", "A", "B"];
const STYLE_RANG: Record<Rang, string> = {
  S: "bg-militant-bordeaux text-white",
  A: "bg-militant-rouge text-white",
  B: "border-[3px] border-militant-charbon",
  C: "border border-[#dde2e7]",
  X: "border border-[#dde2e7]",
};
const BOUTON = "ecg-btn ecg-btn-petit";
const PLEIN = `${BOUTON} ecg-btn-principal`;
const CONTOUR = `${BOUTON}`;
const DISCRET = `${BOUTON} ecg-btn-fantome`;

/** brouillon / publie : un article enregistré traite le sujet ; commence : rédaction lancée mais rien d'enregistré. */
type EtatSujet = "" | "commence" | "brouillon" | "publie" | "ignore";
type Sujet = SujetClasse & { index: number };

function heure(iso: string) {
  return new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
function jour(iso: string) {
  return new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

function Rang({ rang, taille = "moyen" }: { rang: Rang; taille?: "petit" | "moyen" | "grand" }) {
  const t = taille === "grand" ? "h-14 w-14 rounded-2xl text-4xl" : taille === "petit" ? "h-6 w-6 rounded-md text-base" : "h-9 w-9 rounded-[10px] text-[22px]";
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center font-condensed font-extrabold leading-none ${t} ${STYLE_RANG[rang]}`}>
      {LIBELLES_RANG[rang].lettre}
    </span>
  );
}

function PuceEtat({ etat }: { etat: EtatSujet }) {
  if (etat === "publie")
    return (
      <Statut ton="ok" icone={CheckCircle}>
        Publié
      </Statut>
    );
  if (etat === "brouillon")
    return (
      <Statut ton="info" icone={FilePen}>
        Brouillon enregistré
      </Statut>
    );
  if (etat === "commence")
    return (
      <Statut ton="attente" icone={PenLine}>
        Commencé
      </Statut>
    );
  if (etat === "ignore") return <Statut icone={EyeOff}>Ignoré</Statut>;
  return null;
}

function Lisibilite({ lisible }: { lisible: ArticleSujet["lisible"] }) {
  if (!lisible) return null;
  const [icone, texte] =
    lisible === "oui"
      ? [<CheckCircle key="i" size={14} className="text-[#00785a]" aria-hidden />, "L'IA peut lire"]
      : lisible === "non"
        ? [<Ban key="i" size={14} className="text-militant-bordeaux" aria-hidden />, "À lire vous-même"]
        : [<HelpCircle key="i" size={14} aria-hidden />, "Lecture incertaine"];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold">
      {icone}
      {texte}
    </span>
  );
}

/**
 * Check IA en « conférence de rédaction » : la liste des sujets à gauche (S, A, B), le sujet ouvert à droite.
 * On traite les sujets un par un ; la barre de progression dit où on en est. Clavier : ↑ ↓ dans la liste,
 * B brouillon IA, R rédiger, I ignorer. Ignorer s'annule pendant 8 secondes.
 */
export default function ConferenceRedaction({
  analyse,
  statutsInitiaux,
  articlesLies = {},
}: {
  analyse: AnalyseEnregistree;
  /** Index du sujet → article enregistré qui le traite (reconnu à ses sources). */
  articlesLies?: Record<number, ArticleLie>;
  /** Statut actuel des articles du classement (absent = effacé du fil). */
  statutsInitiaux: Record<string, string>;
}) {
  const router = useRouter();
  const [statuts, setStatuts] = useState(statutsInitiaux);
  useEffect(() => setStatuts(statutsInitiaux), [statutsInitiaux]);

  const sujets: Sujet[] = useMemo(() => (analyse.resultat.sujets ?? []).map((s, index) => ({ ...s, index })), [analyse]);
  const principaux = sujets.filter((s) => RANGS_LISTE.includes(s.rang));
  const surveiller = sujets.filter((s) => s.rang === "C");
  const ecartes = sujets.filter((s) => s.rang === "X");

  const presents = useCallback((s: SujetClasse) => idsDuSujet(s).filter((id) => id in statuts), [statuts]);
  const etatDe = useCallback(
    (s: Sujet): EtatSujet => {
      const lie = articlesLies[s.index];
      if (lie) return lie.statut === STATUT_PUBLIE ? "publie" : "brouillon";
      const ids = presents(s);
      if (!ids.length) return "";
      if (ids.every((id) => statuts[id] === VEILLE_IGNORE)) return "ignore";
      return ids.some((id) => statuts[id] === VEILLE_TRAITE) ? "commence" : "";
    },
    [presents, statuts, articlesLies]
  );

  const [choisi, setChoisi] = useState<number>(() => (principaux.find((s) => !etatDe(s)) ?? principaux[0] ?? sujets[0])?.index ?? 0);
  const sujet = sujets.find((s) => s.index === choisi) ?? sujets[0];
  const [enCours, setEnCours] = useState<"ia" | "rediger" | "statut" | null>(null);
  const [erreur, setErreur] = useState("");
  const [toast, setToast] = useState<{ texte: string; annuler: (() => void) | null } | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detail = useRef<HTMLDivElement>(null);

  const traites = principaux.filter((s) => etatDe(s)).length;
  const ancienne = Date.now() - new Date(analyse.created_at).getTime() > FENETRE_HEURES * 60 * 60 * 1000;

  function montrerToast(texte: string, annuler: (() => void) | null) {
    setToast({ texte, annuler });
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setToast(null), 8000);
  }

  function choisir(index: number, focus = true) {
    setChoisi(index);
    setErreur("");
    if (focus) requestAnimationFrame(() => document.getElementById(`sujet-${index}`)?.focus());
  }

  /** Écrit les statuts en base (par groupe de valeur), puis met l'écran à jour. */
  async function ecrire(nouveaux: Record<string, string>): Promise<boolean> {
    const groupes = new Map<string, string[]>();
    for (const [id, st] of Object.entries(nouveaux)) groupes.set(st, [...(groupes.get(st) ?? []), id]);
    for (const [st, ids] of groupes) {
      const { data, error } = await getSupabaseAuth().from("site_veille").update({ statut: st }).in("id", ids).select("id");
      if (error || !data?.length) {
        console.error(error);
        setErreur("Modification impossible. Votre session a peut-être expiré : reconnectez-vous puis réessayez.");
        return false;
      }
    }
    setStatuts((s) => ({ ...s, ...nouveaux }));
    return true;
  }

  async function rediger(s: Sujet, avecIA: boolean) {
    const ids = presents(s);
    if (!ids.length) return;
    setEnCours(avecIA ? "ia" : "rediger");
    setErreur("");
    const aMarquer = Object.fromEntries(ids.filter((id) => statuts[id] !== VEILLE_TRAITE).map((id) => [id, VEILLE_TRAITE]));
    // Marquer « traité » est secondaire : sans réponse de la base en 8 s, le formulaire s'ouvre quand même.
    const marque = !Object.keys(aMarquer).length ? true : await avecDelai(ecrire(aMarquer), 8000).catch(() => false);
    if (marque !== false) {
      router.push(cheminRedactionSujet(analyse.id, s.index, avecIA));
      return;
    }
    setEnCours(null);
  }

  async function ignorer(s: Sujet) {
    const ids = presents(s);
    if (!ids.length) return;
    const avant = Object.fromEntries(ids.map((id) => [id, statuts[id]]));
    const tousIgnores = ids.every((id) => statuts[id] === VEILLE_IGNORE);
    setEnCours("statut");
    setErreur("");
    const ok = await ecrire(Object.fromEntries(ids.map((id) => [id, tousIgnores ? VEILLE_NOUVEAU : VEILLE_IGNORE])));
    setEnCours(null);
    if (!ok) return;
    router.refresh();
    if (tousIgnores) {
      montrerToast("Sujet remis à trier.", null);
      return;
    }
    montrerToast("Sujet ignoré.", async () => {
      if (await ecrire(avant)) router.refresh();
      setToast(null);
      choisir(s.index);
    });
    // Enchaîne sur le prochain sujet à traiter.
    const suivant = principaux.find((p) => p.index !== s.index && !etatDe(p) && p.index > s.index) ?? principaux.find((p) => p.index !== s.index && !etatDe(p));
    if (suivant) choisir(suivant.index);
  }

  // Raccourcis clavier (hors champs de saisie).
  useEffect(() => {
    function touche(e: KeyboardEvent) {
      const cible = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName) || cible.isContentEditable) return;
      if (!sujet || enCours) return;
      const k = e.key.toLowerCase();
      if (k === "b") rediger(sujet, true);
      else if (k === "r") rediger(sujet, false);
      else if (k === "i") ignorer(sujet);
    }
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });

  function naviguer(e: ToucheReact, index: number) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const ordre = principaux.map((s) => s.index);
    const i = ordre.indexOf(index);
    const suivant = ordre[Math.max(0, Math.min(ordre.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (suivant !== undefined) choisir(suivant);
  }

  if (!sujet) {
    return (
      <div className="ecg-panneau">
        <Vide icone="radar" titre="Aucun sujet retenu">
          Le dernier Check IA n&apos;a retenu aucun sujet. Relancez-le après le prochain rafraîchissement.
        </Vide>
      </div>
    );
  }

  const idsSujet = presents(sujet);
  const etatSujet = etatDe(sujet);
  const aLireVousMeme = sujet.articles.filter((a) => a.lisible === "non").length;

  return (
    <section aria-labelledby="titre-check-ia" className="ecg-pile">
      <h2 id="titre-check-ia" className="sr-only">
        Check IA
      </h2>

      {/* Synthèse du jour, au-dessus de la conférence. */}
      <div className="grid gap-x-8 gap-y-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        {analyse.resultat.synthese && (
          <p className="ecg-encart max-w-3xl text-[16px] leading-relaxed">{analyse.resultat.synthese}</p>
        )}
        <p className="ecg-texte-doux text-sm md:text-right">
          Classement {analyse.origine === "auto" ? "automatique" : "manuel"} du {jour(analyse.created_at)} à {heure(analyse.created_at)}
          <br className="hidden md:block" /> {analyse.nb_articles} articles des {FENETRE_HEURES} h · indicatif : c&apos;est vous qui décidez
        </p>
      </div>
      {(ancienne || analyse.resultat.avertissement) && (
        <p className="mt-3 flex max-w-3xl items-start gap-2 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#8a5300]" aria-hidden />
          <span>
            {ancienne && (
              <span className="font-bold">Classement de plus de {FENETRE_HEURES} h : rafraîchissez le fil puis relancez Check IA. </span>
            )}
            {analyse.resultat.avertissement}
          </span>
        </p>
      )}

      <div className="ecg-panneau grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ── Liste ── */}
        <div className="border-b border-[#dde2e7] lg:border-b-0 lg:border-r">
          <div className="border-b border-[#dde2e7] bg-[#fafbfc] px-5 py-4">
            <p className="flex items-baseline justify-between text-sm font-semibold">
              <span>Sujets traités</span>
              <span className="tabular-nums">
                <span className="font-condensed text-2xl font-extrabold">{traites}</span> sur {principaux.length}
              </span>
            </p>
            <div
              role="progressbar"
              aria-label="Sujets traités"
              aria-valuemin={0}
              aria-valuemax={principaux.length}
              aria-valuenow={traites}
              className="mt-2 h-2 overflow-hidden rounded-full bg-[#e3e7eb]"
            >
              <div
                className="h-full rounded-full bg-[var(--app-fonce)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${principaux.length ? (traites / principaux.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div role="listbox" aria-label="Sujets à traiter" className="py-1">
            {RANGS_LISTE.map((rang) => {
              const duRang = principaux.filter((s) => s.rang === rang);
              if (!duRang.length) return null;
              return (
                <div key={rang} role="group" aria-labelledby={`groupe-${rang}`} className="pt-3">
                  <p id={`groupe-${rang}`} className="flex items-center gap-2 px-5 pb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[#56646f]">
                    <Rang rang={rang} taille="petit" />
                    {LIBELLES_RANG[rang].titre}
                    <span className="font-barlow font-semibold normal-case tracking-normal">({duRang.length})</span>
                  </p>
                  {duRang.map((s) => {
                    const etat = etatDe(s);
                    const actif = s.index === choisi;
                    const nonLisibles = s.articles.filter((a) => a.lisible === "non").length;
                    return (
                      <button
                        key={s.index}
                        id={`sujet-${s.index}`}
                        type="button"
                        role="option"
                        aria-selected={actif}
                        tabIndex={actif ? 0 : -1}
                        onClick={() => {
                          choisir(s.index, false);
                          if (window.matchMedia("(max-width: 1023px)").matches) detail.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        onKeyDown={(e) => naviguer(e, s.index)}
                        className={`grid w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-3 border-l-4 px-5 py-3 text-left transition-colors ${
                          actif ? "border-[var(--app)] bg-[var(--app-pale)]" : "border-transparent hover:bg-[#fafbfc]"
                        }`}
                      >
                        <Rang rang={s.rang} />
                        <span className="min-w-0">
                          <span
                            className={`line-clamp-2 text-[15px] font-semibold leading-snug ${
                              etat === "ignore" ? "ecg-texte-doux line-through" : ""
                            }`}
                          >
                            {s.sujet}
                          </span>
                          <span className="ecg-texte-doux mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
                            <span>{LIBELLES_FORMAT[s.format]}</span>
                            <span>
                              {s.articles.length} source{s.articles.length > 1 ? "s" : ""}
                              {nonLisibles ? ` · ${nonLisibles} à lire vous-même` : ""}
                            </span>
                            <PuceEtat etat={etat} />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {(surveiller.length > 0 || ecartes.length > 0) && (
            <details className="group mx-5 mb-4 mt-3 border-t border-[#dde2e7] pt-1 text-sm">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 font-semibold">
                <span>
                  {surveiller.length > 0 && `À surveiller (${surveiller.length})`}
                  {surveiller.length > 0 && ecartes.length > 0 && " · "}
                  {ecartes.length > 0 && `Pas pour nous (${ecartes.length})`}
                </span>
                <span className="ecg-lien text-xs">
                  <span className="group-open:hidden">Afficher</span>
                  <span className="hidden group-open:inline">Masquer</span>
                </span>
              </summary>
              <ul className="space-y-1 pb-2">
                {surveiller.map((s) => (
                  <li key={s.index}>
                    <button
                      type="button"
                      onClick={() => choisir(s.index, false)}
                      aria-current={s.index === choisi}
                      className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-1 text-left hover:bg-[#fafbfc]"
                    >
                      <Rang rang="C" taille="petit" />
                      <span className="font-semibold">{s.sujet}</span>
                    </button>
                  </li>
                ))}
                {ecartes.map((s) => (
                  <li key={s.index} className="flex gap-2 py-1.5">
                    <Rang rang="X" taille="petit" />
                    <span>
                      <span className="font-semibold">{s.sujet}</span>
                      {s.pourquoi && <span className="ecg-texte-doux block text-[13px]">{s.pourquoi}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {analyse.resultat.non_retenus > 0 && (
                <p className="ecg-texte-doux pb-2 text-[13px]">{analyse.resultat.non_retenus} articles sans rapport n&apos;ont été classés nulle part.</p>
              )}
            </details>
          )}
        </div>

        {/* ── Sujet ouvert ── */}
        <div ref={detail} aria-live="polite" className="min-w-0 scroll-mt-4 px-5 py-6 sm:px-7">
          <button
            type="button"
            onClick={() => document.getElementById(`sujet-${choisi}`)?.focus()}
            className="ecg-lien mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm lg:hidden"
          >
            <ArrowLeft size={15} aria-hidden /> Retour à la liste
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <Rang rang={sujet.rang} taille="grand" />
            <span>
              <span className="block font-condensed text-lg font-bold leading-none">{LIBELLES_RANG[sujet.rang].titre}</span>
              <span className="ecg-texte-doux text-sm">{LIBELLES_FORMAT[sujet.format]}</span>
            </span>
            <PuceEtat etat={etatSujet} />
          </div>

          <h3 className="mt-4 max-w-3xl text-balance font-condensed text-[30px] font-bold leading-[1.08]">{sujet.sujet}</h3>

          {sujet.angle && (
            <p className="ecg-encart mt-4 max-w-3xl text-[16px] leading-relaxed">
              <span className="font-bold">Notre angle : </span>
              {sujet.angle}
            </p>
          )}
          {sujet.pourquoi && <p className="ecg-texte-doux mt-3 max-w-3xl text-[15px] leading-relaxed">{sujet.pourquoi}</p>}

          <h4 className="mt-6 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[#56646f]">
            {sujet.articles.length > 1
              ? `${sujet.articles.length} sources : un seul article de synthèse${aLireVousMeme ? `, dont ${aLireVousMeme} à lire vous-même` : ""}`
              : "La source"}
          </h4>
          <ul className="mt-1">
            {sujet.articles.map((a) => {
              const statut = statuts[a.id] as StatutVeille | undefined;
              return (
                <li key={a.id} className="border-t border-[#eef1f3] py-2.5 first:border-t-0">
                  <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]">
                    <LogoMedia lien={a.lien} nom={a.source} />
                    <a
                      href={a.lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={a.titre}
                      className="min-w-0 truncate text-[15px] decoration-[var(--app)] decoration-2 underline-offset-4 hover:underline"
                    >
                      <span className="mr-2 font-bold">
                        {/* Alerte Google : le média d'origine, dont l'adresse a été retrouvée. */}
                        {a.alerte && domaineDe(a.lien) !== "news.google.com" ? `${domaineDe(a.lien)} (alerte Google)` : (a.source ?? "Source inconnue")}
                      </span>
                      {a.titre}
                      <ExternalLink size={13} className="ml-1 inline-block align-baseline" aria-hidden />
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                    <span className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto">
                      <Lisibilite lisible={a.lisible} />
                      {statut === undefined ? (
                        <span className="text-xs font-semibold">Effacé du fil</span>
                      ) : statut !== VEILLE_NOUVEAU ? (
                        <span className="text-xs font-semibold">{statut === VEILLE_TRAITE ? "Traité" : "Ignoré"}</span>
                      ) : null}
                    </span>
                  </div>
                  {a.doublons?.length ? (
                    <p className="ecg-texte-doux ml-9 mt-0.5 text-xs">
                      + {a.doublons.length} doublon{a.doublons.length > 1 ? "s" : ""} replié{a.doublons.length > 1 ? "s" : ""} (alerte Google qui reprend cet article)
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {articlesLies[sujet.index] && (
            <div className="ecg-alerte ecg-alerte-succes mt-6 flex-wrap items-center">
              <p className="min-w-0 flex-1 text-[15px]">
                <span className="font-bold">
                  {articlesLies[sujet.index].statut === STATUT_PUBLIE ? "Article publié" : "Brouillon enregistré"} :
                </span>{" "}
                {articlesLies[sujet.index].titre}
              </p>
              <Link href={`/espace/scan-news/articles/${articlesLies[sujet.index].id}/modifier`} className={PLEIN}>
                <FilePen size={16} aria-hidden />
                {articlesLies[sujet.index].statut === STATUT_PUBLIE ? "Ouvrir l'article" : "Continuer le brouillon"}
              </Link>
            </div>
          )}
          {etatSujet === "commence" && (
            <p className="mt-6 text-[15px]">
              Rédaction commencée, mais aucun article enregistré ne reprend ces sources. Relancez « Brouillon IA » ou
              « Rédiger un article » : le formulaire s&apos;ouvre de nouveau, pré-rempli.
            </p>
          )}

          {idsSujet.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => rediger(sujet, true)} disabled={enCours !== null} className={articlesLies[sujet.index] ? CONTOUR : PLEIN}>
                {enCours === "ia" ? <IconeChargement size={16} /> : <Sparkles size={16} aria-hidden />}
                Brouillon IA
              </button>
              <button type="button" onClick={() => rediger(sujet, false)} disabled={enCours !== null} className={CONTOUR}>
                {enCours === "rediger" ? <IconeChargement size={16} /> : <PenLine size={16} aria-hidden />}
                Rédiger un article
              </button>
              <button type="button" onClick={() => ignorer(sujet)} disabled={enCours !== null} className={DISCRET}>
                {enCours === "statut" ? (
                  <IconeChargement size={16} />
                ) : etatSujet === "ignore" ? (
                  <RotateCcw size={16} aria-hidden />
                ) : (
                  <EyeOff size={16} aria-hidden />
                )}
                {etatSujet === "ignore" ? "Remettre à trier" : "Ignorer"}
              </button>
            </div>
          ) : (
            <p className="ecg-texte-doux mt-6 text-sm italic">Les articles de ce sujet ont été effacés du fil (plus de 3 jours).</p>
          )}
          {erreur && (
            <p role="alert" className="ecg-erreur mt-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
              {erreur}
            </p>
          )}
          <p className="ecg-texte-doux mt-6 hidden flex-wrap gap-x-4 gap-y-1 text-[13px] lg:flex">
            <span>
              <Touche>↑</Touche> <Touche>↓</Touche> sujet précédent / suivant
            </span>
            <span>
              <Touche>B</Touche> brouillon IA
            </span>
            <span>
              <Touche>R</Touche> rédiger
            </span>
            <span>
              <Touche>I</Touche> ignorer
            </span>
          </p>
        </div>
      </div>

      {/* Bandeau de confirmation, avec annulation. */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-1/2 z-40 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-4 rounded-2xl bg-militant-charbon py-2.5 pl-5 pr-3 font-semibold text-white shadow-[0_14px_30px_-14px_rgba(34,34,34,0.5)] transition-[opacity,transform] duration-200 motion-reduce:transition-none ${
          toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <span>{toast?.texte}</span>
        {toast?.annuler && (
          <button
            type="button"
            onClick={toast.annuler}
            className="min-h-[40px] rounded-[10px] border border-white/60 px-3 text-sm font-semibold hover:bg-white/10"
          >
            Annuler
          </button>
        )}
      </div>
    </section>
  );
}

function Touche({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}
