"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, EyeOff, PenLine, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { IconeChargement } from "../../../Chargement";
import { getSupabaseAuth } from "../../../../lib/supabase";
import { avecDelai } from "../../../../lib/delai";
import {
  LIBELLES_STATUT,
  STATUTS_VEILLE,
  VEILLE_IGNORE,
  VEILLE_NOUVEAU,
  VEILLE_TRAITE,
  type StatutVeille,
} from "../../../../lib/veille";
import type { BilanRamassage } from "../../../../lib/veille-ramassage";

const BOUTON = "ecg-btn ecg-btn-petit";
const BOUTON_PRINCIPAL = `${BOUTON} ecg-btn-principal`;
const BOUTON_SECONDAIRE = `${BOUTON}`;

/** Filtres par statut (onglets) et par source (liste) : ils modifient l'adresse de la page. */
export function FiltresVeille({
  sources,
  source,
  statut,
  nombres,
  tous,
  nbPertinents,
  nbTotal,
}: {
  sources: { id: string; nom: string }[];
  source: string;
  statut: string;
  nombres: Record<StatutVeille, number>;
  tous: boolean;
  nbPertinents: number;
  nbTotal: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [enCours, demarrer] = useTransition();

  function aller(maj: { source?: string; statut?: string; tous?: boolean }) {
    const p = new URLSearchParams();
    const s = maj.source ?? source;
    const st = maj.statut ?? statut;
    if (s) p.set("source", s);
    if (st) p.set("statut", st);
    if (maj.tous ?? tous) p.set("pertinence", "tous");
    demarrer(() => router.push(p.size ? `${pathname}?${p}` : pathname));
  }

  const onglets = [{ valeur: "", label: "Tous" }, ...STATUTS_VEILLE.map((s) => ({ valeur: s, label: LIBELLES_STATUT[s], n: nombres[s] }))];

  return (
    <div className="ecg-panneau" aria-busy={enCours}>
      <div className="ecg-panneau-tete">
        <div role="group" aria-label="Pertinence" className="ecg-onglets">
          {[
            { valeur: false, label: "Pertinents" },
            { valeur: true, label: "Tous" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={tous === o.valeur}
              onClick={() => aller({ tous: o.valeur })}
              className="ecg-onglet"
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="m-0 text-[15px] text-[#222]">
          <b className="ecg-chiffre">{nbPertinents}</b> pertinent{nbPertinents > 1 ? "s" : ""} sur {nbTotal}
          {statut || source ? " (selon les filtres)" : ""}
        </p>
        <div className="ecg-panneau-tete-actions">
          <Link href="/espace/scan-news/themes" className="ecg-lien text-sm">
            Gérer les mots-clés
          </Link>
        </div>
      </div>
      <div className="ecg-panneau-corps flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Filtrer par statut" className="ecg-onglets">
          {onglets.map((o) => (
            <button
              key={o.valeur || "tous"}
              type="button"
              aria-pressed={statut === o.valeur}
              onClick={() => aller({ statut: o.valeur })}
              className="ecg-onglet"
            >
              {o.label}
              {"n" in o && <span className="ecg-compte">{o.n}</span>}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {enCours && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <IconeChargement size={18} /> Filtrage…
            </span>
          )}
          <label htmlFor="filtre-source" className="text-sm font-semibold">
            Source
          </label>
          <select
            id="filtre-source"
            name="filtre-source"
            value={source}
            onChange={(e) => aller({ source: e.target.value })}
            className="ecg-champ w-auto"
          >
            <option value="">Toutes les sources</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

/** « Rédiger un article », « Ignorer », « Remettre à trier » pour un item de la veille. */
export function ActionsItem({ id, titre, statut }: { id: string; titre: string; statut: StatutVeille }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<"rediger" | "ia" | "statut" | null>(null);
  const [erreur, setErreur] = useState("");

  async function changerStatut(nouveau: StatutVeille): Promise<boolean> {
    const { data, error } = await getSupabaseAuth().from("site_veille").update({ statut: nouveau }).eq("id", id).select("id");
    if (error || !data?.length) {
      console.error(error);
      setErreur("Modification impossible. Votre session a peut-être expiré : reconnectez-vous puis réessayez.");
      return false;
    }
    return true;
  }

  async function rediger(avecIA = false) {
    setEnCours(avecIA ? "ia" : "rediger");
    setErreur("");
    // L'item est marqué traité, puis le formulaire d'article s'ouvre pré-rempli
    // (avec l'IA : le panneau de rédaction assistée est prêt, on peut y coller un extrait avant de lancer).
    // Marquer « traité » est secondaire : si la base ne répond pas en 8 s (session du navigateur bloquée,
    // réseau), le formulaire s'ouvre quand même. Seul un refus explicite de la base l'empêche.
    const marque = statut === VEILLE_TRAITE ? true : await avecDelai(changerStatut(VEILLE_TRAITE), 8000).catch(() => false);
    if (marque !== false) {
      router.push(`/espace/scan-news/articles/nouveau?veille=${id}${avecIA ? "&ia=1" : ""}`);
      return;
    }
    setEnCours(null);
  }

  async function basculer(nouveau: StatutVeille) {
    setEnCours("statut");
    setErreur("");
    if (await changerStatut(nouveau)) router.refresh();
    setEnCours(null);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => rediger(true)}
          disabled={enCours !== null}
          aria-label={`Proposer un brouillon avec l'IA à partir de : ${titre}`}
          className={statut === VEILLE_NOUVEAU ? BOUTON_PRINCIPAL : BOUTON_SECONDAIRE}
        >
          {enCours === "ia" ? <IconeChargement size={15} /> : <Sparkles size={15} aria-hidden />}
          Brouillon IA
        </button>
        <button
          type="button"
          onClick={() => rediger()}
          disabled={enCours !== null}
          aria-label={`Rédiger un article à partir de : ${titre}`}
          className={BOUTON_SECONDAIRE}
        >
          {enCours === "rediger" ? <IconeChargement size={15} /> : <PenLine size={15} aria-hidden />}
          Rédiger un article
        </button>
        {statut === VEILLE_NOUVEAU ? (
          <button
            type="button"
            onClick={() => basculer(VEILLE_IGNORE)}
            disabled={enCours !== null}
            aria-label={`Ignorer : ${titre}`}
            className={BOUTON_SECONDAIRE}
          >
            {enCours === "statut" ? <IconeChargement size={15} /> : <EyeOff size={15} aria-hidden />}
            Ignorer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => basculer(VEILLE_NOUVEAU)}
            disabled={enCours !== null}
            aria-label={`Remettre à trier : ${titre}`}
            className={`${BOUTON} ecg-btn-fantome`}
          >
            {enCours === "statut" ? <IconeChargement size={15} /> : <RotateCcw size={15} aria-hidden />}
            Remettre à trier
          </button>
        )}
      </div>
      {erreur && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-militant-bordeaux">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          {erreur}
        </p>
      )}
    </div>
  );
}

/** Lance le ramassage des flux tout de suite (sans attendre le cron) et affiche le bilan. */
export function BoutonRamassage() {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [bilan, setBilan] = useState<BilanRamassage | null>(null);
  const [erreur, setErreur] = useState("");

  async function lancer() {
    setEnCours(true);
    setErreur("");
    setBilan(null);
    try {
      const reponse = await fetch("/api/veille/ramasser", { method: "POST" });
      const json = await reponse.json().catch(() => ({}));
      if (!reponse.ok) {
        setErreur(
          reponse.status === 401
            ? "Votre session a expiré. Reconnectez-vous puis réessayez."
            : json.erreur ?? "Le ramassage a échoué. Réessayez dans quelques minutes."
        );
        return;
      }
      setBilan(json as BilanRamassage);
      router.refresh();
    } catch {
      setErreur("Le serveur ne répond pas. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  const enErreur = bilan?.sources.filter((s) => s.erreur) ?? [];

  return (
    <div className="flex max-w-md flex-col items-start gap-2 sm:items-end">
      <button type="button" onClick={lancer} disabled={enCours} className="ecg-btn">
        {enCours ? <IconeChargement size={16} /> : <RefreshCw size={15} aria-hidden />}
        {enCours ? "Lecture des flux…" : "Rafraîchir maintenant"}
      </button>
      <div aria-live="polite" className="text-sm sm:text-right">
        {bilan && (
          <p className="flex items-start gap-1.5 font-semibold sm:justify-end">
            <CheckCircle size={15} className="mt-0.5 shrink-0 text-[#00785a]" aria-hidden />
            {bilan.sources.length === 0
              ? "Aucune source active à lire."
              : `${bilan.ajoutes} nouvel${bilan.ajoutes > 1 ? "s" : ""} article${bilan.ajoutes > 1 ? "s" : ""} (${bilan.sources.length} source${bilan.sources.length > 1 ? "s" : ""} lue${bilan.sources.length > 1 ? "s" : ""})${bilan.purges ? `, ${bilan.purges} de plus de 3 jours effacé${bilan.purges > 1 ? "s" : ""}` : ""}.`}
          </p>
        )}
        {enErreur.map((s) => (
          <p key={s.source} className="ecg-erreur mt-1">
            {s.source} : {s.erreur}
          </p>
        ))}
        {erreur && (
          <p role="alert" className="flex items-start gap-1.5 font-semibold text-militant-bordeaux">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
            {erreur}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * « Check IA » : classement des sujets des 48 dernières heures par l'IA (tier list).
 * Actif seulement sur un fil rafraîchi depuis moins de 2 h (contrôlé aussi par le serveur).
 */
export function BoutonCheckIA({ actif }: { actif: boolean }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function lancer() {
    setEnCours(true);
    setErreur("");
    try {
      const reponse = await fetch("/api/veille/analyse", { method: "POST" });
      const json = await reponse.json().catch(() => ({}));
      if (!reponse.ok) {
        setErreur(
          reponse.status === 401
            ? "Votre session a expiré. Reconnectez-vous puis réessayez."
            : json.erreur ?? "L'analyse a échoué. Réessayez dans quelques minutes."
        );
        return;
      }
      // Le nouveau classement s'ouvre dans la vue « Check IA ».
      router.push("/espace/scan-news/fil?vue=check");
      router.refresh();
    } catch {
      setErreur("Le serveur ne répond pas. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex max-w-xs flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={lancer}
        disabled={!actif || enCours}
        aria-describedby={!actif ? "aide-check-ia" : undefined}
        className="ecg-btn ecg-btn-principal"
      >
        {enCours ? <IconeChargement size={16} /> : <Sparkles size={15} aria-hidden />}
        {enCours ? "Analyse en cours…" : "Check IA"}
      </button>
      <div aria-live="polite" className="text-sm sm:text-right">
        {enCours && <p className="font-semibold">L&apos;IA lit le fil des 48 dernières heures (20 à 60 s).</p>}
        {!actif && !enCours && (
          <p id="aide-check-ia" className="ecg-texte-doux">
            Rafraîchissez d&apos;abord le fil.
          </p>
        )}
        {erreur && (
          <p role="alert" className="flex items-start gap-1.5 font-semibold text-militant-bordeaux">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
            {erreur}
          </p>
        )}
      </div>
    </div>
  );
}
