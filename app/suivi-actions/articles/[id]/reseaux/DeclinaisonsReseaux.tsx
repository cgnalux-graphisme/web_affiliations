"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { getSupabaseAuth } from "../../../../../lib/supabase";
import {
  INFOS_RESEAUX,
  INSTAGRAM_HASHTAGS_MAX,
  RESEAUX,
  YOUTUBE_TITRE_MAX,
  composerYoutube,
  compterCaracteres,
  compterHashtags,
  lireYoutube,
  type Reseau,
  type ReponseDeclinaison,
  type VersionEnregistree,
} from "../../../../../lib/reseaux";

type Carte = {
  id: string | null;
  /** Texte (Facebook, Instagram, TikTok) ou description (YouTube). */
  texte: string;
  /** Titre de la vidéo (YouTube seulement). */
  titre: string;
  /** Dernier contenu enregistré en base (pour savoir s'il reste des modifications). */
  enregistre: string;
};

type Etat = Record<Reseau, Carte>;

function carteDepuis(reseau: Reseau, v: VersionEnregistree | undefined): Carte {
  const contenu = v?.contenu ?? "";
  if (reseau === "youtube") {
    const y = lireYoutube(contenu);
    return { id: v?.id ?? null, texte: y.description, titre: y.titre, enregistre: contenu };
  }
  return { id: v?.id ?? null, texte: contenu, titre: "", enregistre: contenu };
}

function contenuDe(reseau: Reseau, c: Carte): string {
  return reseau === "youtube" ? composerYoutube(c.titre, c.texte) : c.texte;
}

function estVide(reseau: Reseau, c: Carte): boolean {
  return !c.texte.trim() && !(reseau === "youtube" && c.titre.trim());
}

function modifiee(reseau: Reseau, c: Carte): boolean {
  return !estVide(reseau, c) && contenuDe(reseau, c) !== c.enregistre;
}

async function appelerIA(articleId: string, reseau?: Reseau): Promise<ReponseDeclinaison> {
  const res = await fetch("/api/reseaux/declinaison", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articleId, ...(reseau ? { reseau } : {}) }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<ReponseDeclinaison> & { erreur?: string };
  if (!res.ok) {
    throw new Error(
      data.erreur ?? (res.status === 504 ? "Le serveur a mis trop de temps à répondre. Réessayez." : `Erreur ${res.status}. Réessayez.`)
    );
  }
  return data as ReponseDeclinaison;
}

const BOUTON_PRINCIPAL =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-militant-bordeaux px-5 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:opacity-50";
const BOUTON_SECONDAIRE =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-militant-charbon bg-white px-3.5 py-2 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50";

export default function DeclinaisonsReseaux({
  articleId,
  versionsInitiales,
  peutGenerer,
}: {
  articleId: string;
  versionsInitiales: Partial<Record<Reseau, VersionEnregistree>>;
  peutGenerer: boolean;
}) {
  const [cartes, setCartes] = useState<Etat>(
    () => Object.fromEntries(RESEAUX.map((r) => [r, carteDepuis(r, versionsInitiales[r])])) as Etat
  );
  const [enCours, setEnCours] = useState<"tous" | Reseau | null>(null);
  const [erreur, setErreur] = useState("");
  const [avertissement, setAvertissement] = useState("");
  const [confirmerTout, setConfirmerTout] = useState(false);

  const existe = RESEAUX.some((r) => !estVide(r, cartes[r]));
  const aModifier = RESEAUX.some((r) => modifiee(r, cartes[r]));

  // Prévient avant de quitter la page avec des modifications non enregistrées.
  useEffect(() => {
    if (!aModifier) return;
    const avertir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [aModifier]);

  function majCarte(reseau: Reseau, champ: Partial<Carte>) {
    setCartes((c) => ({ ...c, [reseau]: { ...c[reseau], ...champ } }));
  }

  /** Lance l'IA pour les 4 réseaux ou un seul ; renvoie un message d'erreur ou "". */
  async function generer(reseau?: Reseau): Promise<string> {
    setEnCours(reseau ?? "tous");
    setErreur("");
    try {
      const r = await appelerIA(articleId, reseau);
      setCartes((c) => {
        const suite = { ...c };
        for (const res of RESEAUX) {
          const v = r.versions[res];
          if (!v) continue;
          const carte = carteDepuis(res, v);
          // Version non enregistrée : on l'affiche, mais elle reste « à enregistrer ».
          suite[res] = v.id ? carte : { ...carte, id: c[res].id, enregistre: c[res].enregistre };
        }
        return suite;
      });
      setAvertissement(r.avertissement);
      if (r.nonEnregistrees) {
        return "Les textes sont générés mais pas enregistrés en base. Relisez-les puis cliquez sur « Enregistrer » ; si ça échoue, reconnectez-vous.";
      }
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "La génération a échoué. Réessayez.";
    } finally {
      setEnCours(null);
    }
  }

  async function genererTout() {
    setConfirmerTout(false);
    setErreur(await generer());
  }

  return (
    <div className="mt-6">
      <p className="flex items-start gap-2.5 rounded-xl border-2 border-militant-bordeaux px-4 py-3 text-sm">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
        <span>
          <span className="font-bold text-militant-bordeaux">Textes proposés par l&apos;IA — à relire, corriger et valider.</span>{" "}
          Rien n&apos;est publié automatiquement : copiez chaque version dans le réseau. Vérifiez chaque fait avec
          l&apos;article.
        </span>
      </p>

      {peutGenerer && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {confirmerTout ? (
            <div role="alertdialog" aria-labelledby="question-tout" className="rounded-xl border-2 border-militant-bordeaux p-3">
              <p id="question-tout" className="text-sm font-bold">
                Remplacer les 4 versions actuelles ?{aModifier ? " Vos modifications non enregistrées seront perdues." : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={genererTout} autoFocus className={BOUTON_PRINCIPAL}>
                  <Sparkles size={16} aria-hidden /> Oui, régénérer
                </button>
                <button type="button" onClick={() => setConfirmerTout(false)} className={BOUTON_SECONDAIRE}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (existe ? setConfirmerTout(true) : genererTout())}
              disabled={enCours !== null}
              className={BOUTON_PRINCIPAL}
            >
              {enCours === "tous" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Sparkles size={18} aria-hidden />}
              {existe ? "Régénérer les 4 versions" : "Décliner pour les réseaux"}
            </button>
          )}
          <p className="text-sm">Claude Sonnet 5 · 1 à 3 centimes par génération</p>
        </div>
      )}

      <div aria-live="polite">
        {enCours === "tous" && (
          <p role="status" className="mt-4 flex items-center gap-2 font-bold">
            <Loader2 size={18} className="animate-spin text-militant-rouge" aria-hidden />
            L&apos;IA rédige les 4 versions… comptez 20 secondes à 1 minute.
          </p>
        )}
      </div>
      {erreur && (
        <p role="alert" className="mt-4 flex items-start gap-2 border-l-[6px] border-militant-bordeaux py-2 pl-4 font-semibold">
          {erreur}
        </p>
      )}
      {avertissement && (
        <div className="mt-4 rounded-xl border-2 border-militant-ardoise px-4 py-3 text-sm">
          <p className="font-bold">À vérifier, selon l&apos;IA :</p>
          <p className="mt-1 whitespace-pre-line">{avertissement}</p>
        </div>
      )}

      {!existe && enCours !== "tous" ? (
        peutGenerer && (
          <p className="mt-8 border-l-[6px] border-militant-rouge py-2 pl-5 text-lg">
            Aucune version pour l&apos;instant. Cliquez sur « Décliner pour les réseaux » : l&apos;IA propose un texte adapté à
            Facebook, Instagram, TikTok et YouTube.
          </p>
        )
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {RESEAUX.map((r) => (
            <CarteReseau
              key={r}
              reseau={r}
              carte={cartes[r]}
              occupe={enCours !== null}
              regeneration={enCours === r || enCours === "tous"}
              peutGenerer={peutGenerer}
              articleId={articleId}
              onChange={(champ) => majCarte(r, champ)}
              onRegenerer={() => generer(r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CarteReseau({
  reseau,
  carte,
  occupe,
  regeneration,
  peutGenerer,
  articleId,
  onChange,
  onRegenerer,
}: {
  reseau: Reseau;
  carte: Carte;
  occupe: boolean;
  regeneration: boolean;
  peutGenerer: boolean;
  articleId: string;
  onChange: (champ: Partial<Carte>) => void;
  onRegenerer: () => Promise<string>;
}) {
  const info = INFOS_RESEAUX[reseau];
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [copie, setCopie] = useState<"texte" | "titre" | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(minuterie.current), []);

  const aModifier = modifiee(reseau, carte);
  const vide = estVide(reseau, carte);
  const nb = compterCaracteres(carte.texte);
  const trop = nb > info.max;
  const hashtags = reseau === "instagram" ? compterHashtags(carte.texte) : 0;
  const nbTitre = compterCaracteres(carte.titre);
  const idTexte = `texte-${reseau}`;

  async function copier(quoi: "texte" | "titre") {
    const valeur = quoi === "titre" ? carte.titre : carte.texte;
    try {
      await navigator.clipboard.writeText(valeur);
    } catch {
      // Presse-papiers refusé (onglet non sécurisé…) : on sélectionne le texte pour Ctrl+C.
      const champ = document.getElementById(quoi === "titre" ? `titre-${reseau}` : idTexte) as HTMLTextAreaElement | null;
      champ?.focus();
      champ?.select();
      setMessage({ type: "erreur", texte: "Copie automatique impossible : le texte est sélectionné, faites Ctrl+C." });
      return;
    }
    setCopie(quoi);
    clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setCopie(null), 2000);
  }

  async function enregistrer() {
    setEnregistrement(true);
    setMessage(null);
    const contenu = contenuDe(reseau, carte);
    const supabase = getSupabaseAuth();
    const { data, error } = carte.id
      ? await supabase
          .from("site_publications_reseaux")
          .update({ contenu, updated_at: new Date().toISOString() })
          .eq("id", carte.id)
          .select("id")
      : await supabase.from("site_publications_reseaux").insert({ article_id: articleId, reseau, contenu }).select("id");
    setEnregistrement(false);
    if (error || !data?.length) {
      console.error(error);
      setMessage({ type: "erreur", texte: "Enregistrement impossible. Votre session a peut-être expiré : reconnectez-vous puis réessayez." });
      return;
    }
    onChange({ id: data[0].id as string, enregistre: contenu });
    setMessage({ type: "ok", texte: "Version enregistrée." });
  }

  async function regenerer() {
    setConfirmer(false);
    setMessage(null);
    const err = await onRegenerer();
    setMessage(err ? { type: "erreur", texte: err } : { type: "ok", texte: "Nouvelle version générée et enregistrée." });
  }

  const champ = (depasse: boolean) =>
    `w-full rounded-xl border bg-white px-3 py-2.5 text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-militant-rouge disabled:opacity-60 ${
      depasse ? "border-2 border-militant-bordeaux" : "border-militant-ardoise focus:border-militant-charbon"
    }`;

  return (
    <section aria-labelledby={`nom-${reseau}`} className="flex flex-col rounded-2xl border border-militant-ardoise bg-white">
      <header className="border-b-2 border-militant-charbon px-5 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={`nom-${reseau}`} className="font-condensed text-2xl font-extrabold uppercase leading-none">
            {info.nom}
          </h2>
          {aModifier && (
            <span className="rounded-full border-2 border-militant-rouge px-2.5 py-0.5 text-xs font-bold">Non enregistré</span>
          )}
        </div>
        <p className="mt-1 text-sm">{info.aide}</p>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        {regeneration && (
          <p role="status" className="flex items-center gap-2 text-sm font-bold">
            <Loader2 size={16} className="animate-spin text-militant-rouge" aria-hidden /> Génération en cours…
          </p>
        )}

        {reseau === "youtube" && (
          <div>
            <div className="flex items-end justify-between gap-2">
              <label htmlFor={`titre-${reseau}`} className="text-sm font-bold">
                Titre de la vidéo
              </label>
              <button
                type="button"
                onClick={() => copier("titre")}
                disabled={!carte.titre.trim()}
                aria-label="Copier le titre YouTube"
                className="inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-bold hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50"
              >
                {copie === "titre" ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                {copie === "titre" ? "Copié" : "Copier"}
              </button>
            </div>
            <input
              id={`titre-${reseau}`}
              type="text"
              value={carte.titre}
              onChange={(e) => onChange({ titre: e.target.value.replace(/\n/g, " ") })}
              disabled={regeneration}
              className={champ(nbTitre > YOUTUBE_TITRE_MAX)}
            />
            <p className={`mt-1 text-right text-xs tabular-nums ${nbTitre > YOUTUBE_TITRE_MAX ? "font-bold text-militant-bordeaux" : ""}`}>
              {nbTitre}/{YOUTUBE_TITRE_MAX} caractères · 70 conseillés
            </p>
          </div>
        )}

        <div className="flex flex-1 flex-col">
          {reseau === "youtube" && (
            <label htmlFor={idTexte} className="mb-1 text-sm font-bold">
              Description
            </label>
          )}
          <textarea
            id={idTexte}
            aria-label={reseau === "youtube" ? undefined : `Texte ${info.nom}`}
            value={carte.texte}
            onChange={(e) => onChange({ texte: e.target.value })}
            disabled={regeneration}
            rows={reseau === "tiktok" ? 6 : 14}
            className={`${champ(trop)} flex-1 resize-y`}
          />
          <p className={`mt-1 text-right text-xs tabular-nums ${trop ? "font-bold text-militant-bordeaux" : ""}`}>
            {nb.toLocaleString("fr-BE")}/{info.max.toLocaleString("fr-BE")} caractères
            {reseau === "instagram" && (
              <span className={hashtags > INSTAGRAM_HASHTAGS_MAX ? "font-bold text-militant-bordeaux" : ""}>
                {" "}
                · {hashtags}/{INSTAGRAM_HASHTAGS_MAX} hashtags
              </span>
            )}
            {reseau !== "youtube" && <span className="block">{info.conseil}</span>}
          </p>
        </div>

        <div aria-live="polite">
          {message && (
            <p
              role={message.type === "erreur" ? "alert" : undefined}
              className={`text-sm font-semibold ${message.type === "erreur" ? "text-militant-bordeaux" : ""}`}
            >
              {message.texte}
            </p>
          )}
        </div>

        {confirmer ? (
          <div role="alertdialog" aria-labelledby={`question-${reseau}`} className="rounded-xl border-2 border-militant-bordeaux p-3">
            <p id={`question-${reseau}`} className="text-sm font-bold">
              Remplacer la version {info.nom} ?{aModifier ? " Vos modifications non enregistrées seront perdues." : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={regenerer} autoFocus className={BOUTON_PRINCIPAL}>
                <RefreshCw size={15} aria-hidden /> Oui, régénérer
              </button>
              <button type="button" onClick={() => setConfirmer(false)} className={BOUTON_SECONDAIRE}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copier("texte")}
              disabled={!carte.texte.trim()}
              aria-label={reseau === "youtube" ? "Copier la description YouTube" : `Copier le texte ${info.nom}`}
              className={BOUTON_PRINCIPAL}
            >
              {copie === "texte" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copie === "texte" ? "Copié" : reseau === "youtube" ? "Copier la description" : "Copier"}
            </button>
            <button
              type="button"
              onClick={enregistrer}
              disabled={!aModifier || enregistrement || regeneration}
              className={BOUTON_SECONDAIRE}
            >
              {enregistrement ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Save size={15} aria-hidden />}
              Enregistrer
            </button>
            {peutGenerer && (
              <button
                type="button"
                onClick={() => (vide ? regenerer() : setConfirmer(true))}
                disabled={occupe}
                className={BOUTON_SECONDAIRE}
              >
                <RefreshCw size={15} className={regeneration ? "animate-spin" : ""} aria-hidden />
                {vide ? "Générer" : "Régénérer"}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
