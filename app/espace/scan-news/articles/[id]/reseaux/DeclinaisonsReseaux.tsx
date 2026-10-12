"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, PenLine, RefreshCw, Save, Sparkles } from "lucide-react";
import { Alerte, Statut, Vide } from "../../../../_partage/ui";
import { EcranChargement, IconeChargement } from "../../../../../Chargement";
import { getSupabaseAuth } from "../../../../../../lib/supabase";
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
} from "../../../../../../lib/reseaux";

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

const BOUTON_PRINCIPAL = "ecg-btn ecg-btn-principal";
const BOUTON_SECONDAIRE = "ecg-btn";

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
    <>
      <Alerte ton="attention" icone={AlertTriangle} role={null} titre="Textes proposés par l'IA : à relire, corriger et valider.">
        Rien n&apos;est publié automatiquement : copiez chaque version dans le réseau. Vérifiez chaque fait avec
        l&apos;article.
      </Alerte>

      {peutGenerer && (
        <div className="flex flex-wrap items-center gap-3">
          {confirmerTout ? (
            <div role="alertdialog" aria-labelledby="question-tout" className="ecg-alerte ecg-alerte-attention block p-3">
              <p id="question-tout" className="text-sm font-semibold">
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
              {enCours === "tous" ? <IconeChargement size={18} /> : <Sparkles size={18} aria-hidden />}
              {existe ? "Régénérer les 4 versions" : "Décliner pour les réseaux"}
            </button>
          )}
          <p className="ecg-aide m-0">Claude Sonnet 5, 1 à 3 centimes par génération</p>
        </div>
      )}

      <div aria-live="polite">
        {enCours === "tous" && (
          <div className="ecg-panneau">
            <EcranChargement compact texte="L'IA rédige les 4 versions…" />
            <p className="ecg-texte-doux -mt-6 pb-6 text-center text-sm">Comptez 20 secondes à 1 minute.</p>
          </div>
        )}
      </div>
      {erreur && (
        <Alerte ton="erreur">{erreur}</Alerte>
      )}
      {avertissement && (
        <Alerte ton="attention" role={null} titre="À vérifier, selon l'IA :">
          <p className="mt-1 whitespace-pre-line">{avertissement}</p>
        </Alerte>
      )}

      {!existe && enCours !== "tous" ? (
        peutGenerer && (
          <div className="ecg-panneau">
            <Vide icone="share" titre="Aucune version pour l'instant">
              Cliquez sur « Décliner pour les réseaux » : l&apos;IA propose un texte adapté à Facebook, Instagram, TikTok et
              YouTube.
            </Vide>
          </div>
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
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
    </>
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

  const champ = (depasse: boolean) => `ecg-champ leading-relaxed${depasse ? " ecg-champ-erreur" : ""}`;

  return (
    <section aria-labelledby={`nom-${reseau}`} className="flex flex-col ecg-panneau">
      <header className="ecg-panneau-tete">
        <div>
          <h2 id={`nom-${reseau}`}>{info.nom}</h2>
          <p>{info.aide}</p>
        </div>
        {aModifier && (
          <div className="ecg-panneau-tete-actions">
            <Statut ton="attente" icone={PenLine}>
              Non enregistré
            </Statut>
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        {regeneration && (
          <p role="status" className="flex items-center gap-2 text-sm font-bold">
            <IconeChargement size={18} /> Génération en cours…
          </p>
        )}

        {reseau === "youtube" && (
          <div>
            <div className="flex items-end justify-between gap-2">
              <label htmlFor={`titre-${reseau}`} className="ecg-libelle mb-0">
                Titre de la vidéo
              </label>
              <button
                type="button"
                onClick={() => copier("titre")}
                disabled={!carte.titre.trim()}
                aria-label="Copier le titre YouTube"
                className="ecg-btn ecg-btn-fantome ecg-btn-petit"
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
            <p className={`ecg-aide text-right tabular-nums ${nbTitre > YOUTUBE_TITRE_MAX ? "font-bold text-militant-bordeaux" : ""}`}>
              {nbTitre}/{YOUTUBE_TITRE_MAX} caractères · 70 conseillés
            </p>
          </div>
        )}

        <div className="flex flex-1 flex-col">
          {reseau === "youtube" && (
            <label htmlFor={idTexte} className="ecg-libelle">
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
            className={`${champ(trop)} flex-1`}
          />
          <p className={`ecg-aide text-right tabular-nums ${trop ? "font-bold text-militant-bordeaux" : ""}`}>
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
              className={message.type === "erreur" ? "ecg-erreur mt-0" : "text-sm font-semibold text-[#00785a]"}
            >
              {message.texte}
            </p>
          )}
        </div>

        {confirmer ? (
          <div role="alertdialog" aria-labelledby={`question-${reseau}`} className="ecg-alerte ecg-alerte-attention block p-3">
            <p id={`question-${reseau}`} className="text-sm font-semibold">
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
              {enregistrement ? <IconeChargement size={15} /> : <Save size={15} aria-hidden />}
              Enregistrer
            </button>
            {peutGenerer && (
              <button
                type="button"
                onClick={() => (vide ? regenerer() : setConfirmer(true))}
                disabled={occupe}
                className={BOUTON_SECONDAIRE}
              >
                {regeneration ? <IconeChargement size={15} /> : <RefreshCw size={15} aria-hidden />}
                {vide ? "Générer" : "Régénérer"}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
