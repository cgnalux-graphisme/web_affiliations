"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Clock, Eye, EyeOff, Mail, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import { Alerte, Panneau, Statut, Vide } from "../../_partage/ui";
import { LIBELLES_CATEGORIE, type Categorie } from "../../../../lib/assistant";
import {
  STATUTS_DEMANDE_CHATBOT,
  dateHeureBruxelles,
  libelleStatut,
  type DemandeChatbot,
  type StatutDemandeChatbot,
} from "../../../../lib/assistant-demandes";
import { suppressionPrevue } from "../../../../lib/assistant-purge";
import { DUREE_DEMANDES } from "../../../../lib/vie-privee";
import { IconeChargement } from "../../../Chargement";
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
    <>
      <div className="ecg-chiffres">
        {filtres.slice(1).map((f) => (
          <div key={f.valeur} className="ecg-chiffre-carte">
            <b>{compte(f.valeur)}</b>
            <span>{f.libelle.toLowerCase()}</span>
          </div>
        ))}
      </div>

      <div role="group" aria-label="Filtrer par statut" className="ecg-onglets">
        {filtres.map((f) => (
          <button
            key={f.valeur}
            type="button"
            aria-pressed={filtre === f.valeur}
            onClick={() => choisir(f.valeur)}
            className="ecg-onglet"
          >
            {f.libelle}
            <span className="ecg-compte">{compte(f.valeur)}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <Panneau>
          <Vide icone="message" titre={demandes.length ? "Aucune demande avec ce statut" : "Aucune demande pour l'instant"}>
            Les demandes arrivent ici quand une personne clique « Transmettre ma demande » dans l&apos;assistant du site.
          </Vide>
        </Panneau>
      ) : (
        <ul className="ecg-pile">
          {visibles.map((d) => (
            <CarteDemande key={d.id} d={d} enEvidence={d.id === ouverte} onChange={() => router.refresh()} />
          ))}
        </ul>
      )}
    </>
  );
}

/** Statut affiché : toujours une icône et un texte. */
const STATUTS_AFFICHAGE: Record<string, { ton: "info" | "attente" | "ok"; icone: LucideIcon }> = {
  nouveau: { ton: "info", icone: Sparkles },
  en_cours: { ton: "attente", icone: Clock },
  traite: { ton: "ok", icone: CircleCheck },
};

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
      className={`ecg-panneau scroll-mt-24 ${enEvidence ? "ecg-media-principale" : ""}`}
    >
      <div className="ecg-panneau-tete">
        <div>
          <h2>
            {d.prenom} {d.nom}
          </h2>
          <p>
            {dateHeureBruxelles(d.created_at)}, {categorie}
          </p>
        </div>
        <div className="ecg-panneau-tete-actions">
          <Statut ton={STATUTS_AFFICHAGE[d.statut]?.ton} icone={STATUTS_AFFICHAGE[d.statut]?.icone ?? Clock}>
            {libelleStatut(d.statut)}
          </Statut>
        </div>
      </div>

      <div className="ecg-panneau-corps">
      <a href={`mailto:${d.email}`} className="ecg-lien inline-flex min-h-[32px] items-center gap-1.5 break-all">
        <Mail size={15} aria-hidden /> {d.email}
      </a>

      <dl className="ecg-recap mt-4">
        <div>
          <dt>Envoyée à</dt>
          <dd>
            {d.service_nom} <span className="break-all">({d.destinataire_email})</span>
          </dd>
        </div>
        <div>
          <dt>Code postal</dt>
          <dd>
            {d.code_postal} ({d.region})
          </dd>
        </div>
        <div>
          <dt>Commission paritaire</dt>
          <dd>{d.cp_code ?? "Non identifiée"}</dd>
        </div>
        <div>
          <dt>Affilié(e)</dt>
          <dd>{d.affilie === null ? "Non précisé" : d.affilie ? "Oui" : "Non"}</dd>
        </div>
        <div className="col-span-full">
          <dt>Registre national</dt>
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
                  className="ecg-btn ecg-btn-petit"
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

      <p className="mt-4 whitespace-pre-wrap rounded-xl border border-[#dde2e7] bg-[#fafbfc] px-4 py-3 text-[15px] leading-relaxed">{d.message}</p>

      {d.statut === "traite" && d.traite_le && (
        <p className="ecg-aide mt-3">
          Traitée le {dateHeureBruxelles(d.traite_le).slice(0, 10)}. Supprimée automatiquement le{" "}
          <strong className="tabular-nums">{dateHeureBruxelles(suppressionPrevue(d.traite_le).toISOString()).slice(0, 10)}</strong>{" "}
          ({DUREE_DEMANDES} après son traitement, comme l&apos;annonce la page Vie privée).
        </p>
      )}

      </div>

      <div className="ecg-panneau-pied items-center justify-start">
        <label htmlFor={`statut-${d.id}`} className="text-[14px] font-semibold">
          Statut
        </label>
        <select
          id={`statut-${d.id}`}
          value={d.statut}
          disabled={enCours}
          onChange={(e) => statut(e.target.value as StatutDemandeChatbot)}
          className="ecg-champ font-semibold w-auto"
        >
          {STATUTS_DEMANDE_CHATBOT.map((s) => (
            <option key={s.valeur} value={s.valeur}>
              {s.libelle}
            </option>
          ))}
        </select>
        {enCours && <IconeChargement />}
        <button
          type="button"
          onClick={supprimer}
          disabled={enCours}
          className="ecg-btn ecg-btn-fantome ecg-btn-fantome-danger ml-auto"
        >
          <Trash2 size={15} aria-hidden /> Supprimer
        </button>
      </div>
      {erreur && (
        <div className="px-5 pb-4">
          <Alerte ton="erreur">{erreur}</Alerte>
        </div>
      )}
    </li>
  );
}
