"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, EyeOff, PenLine, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { IconeChargement } from "../../Chargement";
import { getSupabaseAuth } from "../../../lib/supabase";
import {
  LIBELLES_STATUT,
  STATUTS_VEILLE,
  VEILLE_IGNORE,
  VEILLE_NOUVEAU,
  VEILLE_TRAITE,
  type StatutVeille,
} from "../../../lib/veille";
import type { BilanRamassage } from "../../../lib/veille-ramassage";

const BOUTON =
  "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border-2 px-3.5 py-1.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50";
const BOUTON_PRINCIPAL = `${BOUTON} border-militant-bordeaux bg-militant-bordeaux text-white hover:border-militant-charbon hover:bg-militant-charbon`;
const BOUTON_SECONDAIRE = `${BOUTON} border-militant-charbon hover:bg-militant-charbon hover:text-white`;

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
    <div className="mt-6 space-y-4" aria-busy={enCours}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-militant-ardoise px-4 py-3">
        <div role="group" aria-label="Pertinence" className="flex rounded-xl border-2 border-militant-charbon p-0.5">
          {[
            { valeur: false, label: "Pertinents" },
            { valeur: true, label: "Tous" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={tous === o.valeur}
              onClick={() => aller({ tous: o.valeur })}
              className={`min-h-[36px] rounded-lg px-4 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
                tous === o.valeur ? "bg-militant-bordeaux text-white" : "hover:bg-militant-charbon hover:text-white"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[15px]">
          <span className="font-condensed text-2xl font-extrabold tabular-nums text-militant-rouge">{nbPertinents}</span>{" "}
          <span className="font-semibold">
            pertinent{nbPertinents > 1 ? "s" : ""} sur {nbTotal}
          </span>
          {statut || source ? " (selon les filtres ci-dessous)" : ""}
        </p>
        <Link
          href="/suivi-actions/themes"
          className="ml-auto text-sm font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
        >
          Gérer les mots-clés
        </Link>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-1.5">
        {onglets.map((o) => {
          const actif = statut === o.valeur;
          return (
            <button
              key={o.valeur || "tous"}
              type="button"
              aria-pressed={actif}
              onClick={() => aller({ statut: o.valeur })}
              className={`min-h-[40px] rounded-xl border-2 px-3.5 py-1.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
                actif ? "border-militant-bordeaux bg-militant-bordeaux text-white" : "border-militant-ardoise hover:border-militant-charbon"
              }`}
            >
              {o.label}
              {"n" in o && <span className="ml-1.5 tabular-nums">{o.n}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        {enCours && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <IconeChargement size={18} className="text-militant-rouge" /> Filtrage…
          </span>
        )}
        <label htmlFor="filtre-source" className="text-sm font-semibold">
          Source
        </label>
        <select
          id="filtre-source"
          value={source}
          onChange={(e) => aller({ source: e.target.value })}
          className="min-h-[40px] rounded-xl border border-militant-ardoise bg-white px-3 text-sm focus:border-militant-charbon focus:outline-none focus:ring-2 focus:ring-militant-rouge"
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
    if (statut === VEILLE_TRAITE || (await changerStatut(VEILLE_TRAITE))) {
      router.push(`/suivi-actions/articles/nouveau?veille=${id}${avecIA ? "&ia=1" : ""}`);
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
            className={`${BOUTON} border-transparent hover:border-militant-charbon`}
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
      <button type="button" onClick={lancer} disabled={enCours} className={BOUTON_PRINCIPAL}>
        {enCours ? <IconeChargement size={16} /> : <RefreshCw size={15} aria-hidden />}
        {enCours ? "Lecture des flux…" : "Rafraîchir maintenant"}
      </button>
      <div aria-live="polite" className="text-sm sm:text-right">
        {bilan && (
          <p className="flex items-start gap-1.5 font-semibold sm:justify-end">
            <CheckCircle size={15} className="mt-0.5 shrink-0 text-militant-rouge" aria-hidden />
            {bilan.sources.length === 0
              ? "Aucune source active à lire."
              : `${bilan.ajoutes} nouvel${bilan.ajoutes > 1 ? "s" : ""} article${bilan.ajoutes > 1 ? "s" : ""} (${bilan.sources.length} source${bilan.sources.length > 1 ? "s" : ""} lue${bilan.sources.length > 1 ? "s" : ""}).`}
          </p>
        )}
        {enErreur.map((s) => (
          <p key={s.source} className="mt-1 font-semibold text-militant-bordeaux">
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
