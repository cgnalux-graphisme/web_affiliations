"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Inbox, Mail, Trash2 } from "lucide-react";
import { LIBELLES_CATEGORIE, type Categorie } from "../../../lib/assistant";
import {
  STATUTS_DEMANDE_CHATBOT,
  dateHeureBruxelles,
  libelleStatut,
  type DemandeChatbot,
  type StatutDemandeChatbot,
} from "../../../lib/assistant-demandes";
import { IconeChargement } from "../../Chargement";
import { changerStatutDemande, lireRegistreNational, supprimerDemande } from "./actions";

type Filtre = "tous" | StatutDemandeChatbot;

/** Liste des demandes chatbot : filtre par statut, changement de statut, suppression, registre national masqué. */
export default function ListeDemandesChatbot({
  demandes,
  filtreInitial,
  ouverte,
}: {
  demandes: DemandeChatbot[];
  filtreInitial: Filtre;
  ouverte: string | null;
}) {
  const router = useRouter();
  const [filtre, setFiltre] = useState<Filtre>(filtreInitial);

  // Lien du courriel (?id=…) : la demande concernée est mise en évidence et amenée à l'écran.
  useEffect(() => {
    if (ouverte) document.getElementById(`demande-${ouverte}`)?.scrollIntoView({ block: "center" });
  }, [ouverte]);

  function choisir(f: Filtre) {
    setFiltre(f);
    const url = new URL(window.location.href);
    if (f === "tous") url.searchParams.delete("statut");
    else url.searchParams.set("statut", f);
    url.searchParams.delete("id");
    window.history.replaceState(null, "", url);
  }

  const compte = (f: Filtre) => (f === "tous" ? demandes.length : demandes.filter((d) => d.statut === f).length);
  const visibles = filtre === "tous" ? demandes : demandes.filter((d) => d.statut === filtre);
  const filtres: { valeur: Filtre; libelle: string }[] = [
    { valeur: "tous", libelle: "Toutes" },
    { valeur: "nouveau", libelle: "Nouvelles" },
    { valeur: "en_cours", libelle: "En cours" },
    { valeur: "traite", libelle: "Traitées" },
  ];

  return (
    <div className="mt-6">
      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
        {filtres.map((f) => (
          <button
            key={f.valeur}
            type="button"
            aria-pressed={filtre === f.valeur}
            onClick={() => choisir(f.valeur)}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-4 text-[15px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
              filtre === f.valeur
                ? "border-militant-bordeaux bg-militant-bordeaux text-white"
                : "border-militant-charbon bg-white hover:bg-militant-charbon hover:text-white"
            }`}
          >
            {f.libelle}
            <span className="tabular-nums">({compte(f.valeur)})</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-militant-ardoise p-6">
          <Inbox size={24} className="mt-0.5 shrink-0 text-militant-rouge" aria-hidden />
          <div>
            <p className="font-bold">{demandes.length ? "Aucune demande avec ce statut." : "Aucune demande pour l'instant."}</p>
            <p className="mt-1 text-[15px]">
              Les demandes arrivent ici quand une personne clique « Transmettre ma demande » dans l&apos;assistant du site.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {visibles.map((d) => (
            <CarteDemande key={d.id} d={d} enEvidence={d.id === ouverte} onChange={() => router.refresh()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CarteDemande({ d, enEvidence, onChange }: { d: DemandeChatbot; enEvidence: boolean; onChange: () => void }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const [registre, setRegistre] = useState<string | null>(null);
  const categorie = LIBELLES_CATEGORIE[d.categorie as Categorie] ?? d.categorie;

  function statut(s: StatutDemandeChatbot) {
    setErreur("");
    demarrer(async () => {
      const r = await changerStatutDemande(d.id, s);
      if (!r.ok) setErreur(r.erreur);
      else onChange();
    });
  }

  function supprimer() {
    if (!window.confirm(`Supprimer définitivement la demande de ${d.prenom} ${d.nom} ? Cette action est irréversible.`)) return;
    setErreur("");
    demarrer(async () => {
      const r = await supprimerDemande(d.id);
      if (!r.ok) setErreur(r.erreur);
      else onChange();
    });
  }

  function basculerRegistre() {
    if (registre !== null) return setRegistre(null);
    demarrer(async () => {
      const r = await lireRegistreNational(d.id);
      if (r.ok) setRegistre(r.valeur);
      else setErreur(r.erreur);
    });
  }

  return (
    <li
      id={`demande-${d.id}`}
      className={`scroll-mt-24 rounded-2xl border bg-white p-5 ${enEvidence ? "border-2 border-militant-rouge" : "border-militant-ardoise"} ${
        d.statut === "nouveau" ? "border-l-[6px] border-l-militant-bordeaux" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold">
            {dateHeureBruxelles(d.created_at)} · {categorie}
          </p>
          <h2 className="mt-1 font-condensed text-[26px] font-extrabold leading-tight">
            {d.prenom} {d.nom}
          </h2>
          <a
            href={`mailto:${d.email}`}
            className="inline-flex min-h-[32px] items-center gap-1.5 break-all text-[15px] font-semibold underline decoration-militant-rouge underline-offset-4 hover:text-militant-bordeaux"
          >
            <Mail size={15} aria-hidden /> {d.email}
          </a>
        </div>
        <span className="rounded-full border-2 border-militant-charbon px-3 py-1 text-[13px] font-bold">{libelleStatut(d.statut)}</span>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
        <div>
          <dt className="text-[13px] font-bold uppercase tracking-wide">Envoyée à</dt>
          <dd>
            {d.service_nom} <span className="break-all">({d.destinataire_email})</span>
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-bold uppercase tracking-wide">Code postal</dt>
          <dd>
            {d.code_postal} ({d.region})
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-bold uppercase tracking-wide">Commission paritaire</dt>
          <dd>{d.cp_code ?? "Non identifiée"}</dd>
        </div>
        <div>
          <dt className="text-[13px] font-bold uppercase tracking-wide">Affilié(e)</dt>
          <dd>{d.affilie === null ? "Non précisé" : d.affilie ? "Oui" : "Non"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[13px] font-bold uppercase tracking-wide">Registre national</dt>
          <dd className="flex flex-wrap items-center gap-3">
            {d.aRegistre ? (
              <>
                <span className="font-semibold tabular-nums" aria-live="polite">
                  {registre ?? "••••••••••••"}
                </span>
                <button
                  type="button"
                  onClick={basculerRegistre}
                  disabled={enCours}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-militant-charbon px-3 text-[14px] font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50"
                >
                  {registre !== null ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                  {registre !== null ? "Masquer" : "Afficher"}
                </button>
              </>
            ) : (
              "Non communiqué"
            )}
          </dd>
        </div>
      </dl>

      <p className="mt-4 whitespace-pre-wrap border-l-4 border-militant-bordeaux py-1 pl-4 text-[15px] leading-relaxed">{d.message}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-militant-ardoise pt-4">
        <label htmlFor={`statut-${d.id}`} className="text-[15px] font-bold">
          Statut
        </label>
        <select
          id={`statut-${d.id}`}
          value={d.statut}
          disabled={enCours}
          onChange={(e) => statut(e.target.value as StatutDemandeChatbot)}
          className="min-h-[44px] rounded-xl border border-militant-ardoise bg-white px-3 text-[15px] font-semibold text-militant-charbon focus:border-militant-charbon focus:outline-none focus:ring-2 focus:ring-militant-rouge"
        >
          {STATUTS_DEMANDE_CHATBOT.map((s) => (
            <option key={s.valeur} value={s.valeur}>
              {s.libelle}
            </option>
          ))}
        </select>
        {enCours && <IconeChargement className="text-militant-rouge" />}
        <button
          type="button"
          onClick={supprimer}
          disabled={enCours}
          className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[14px] font-bold text-militant-bordeaux underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50"
        >
          <Trash2 size={15} aria-hidden /> Supprimer
        </button>
      </div>
      {erreur && (
        <p role="alert" className="mt-3 font-semibold text-militant-bordeaux">
          {erreur}
        </p>
      )}
    </li>
  );
}
