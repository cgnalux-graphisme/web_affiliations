"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserCheck } from "lucide-react";
import { correspondances, filtrerTravailleurs, nissAffiche, type Travailleur } from "../../../lib/entreprises/travailleurs";
import { travailleursEntreprise } from "./actions";
import { PanneauLateral } from "../_partage/Fenetres";
import { IconeChargement } from "../../Chargement";
import { Alerte, BTN, BTN_PETIT, CHAMP, Vide } from "../_partage/ui";

/**
 * Choisir un travailleur de l'entreprise (table `workers` de CG Link) : pour créer un délégué à partir de la liste,
 * ou compléter son registre national. La liste est lue à l'ouverture du panneau, dans le périmètre de la personne.
 * `proche` : prénom et nom du délégué, pour proposer d'abord les travailleurs qui lui ressemblent.
 */
export default function ChoixTravailleur({
  entrepriseId,
  proche,
  titre = "Choisir parmi les travailleurs",
  onChoisir,
  onFermer,
}: {
  entrepriseId: string;
  proche?: { prenom: string | null; nom: string | null };
  titre?: string;
  onChoisir: (t: Travailleur) => void;
  onFermer: () => void;
}) {
  const [liste, setListe] = useState<Travailleur[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [actifsSeulement, setActifsSeulement] = useState(true);

  useEffect(() => {
    let annule = false;
    travailleursEntreprise(entrepriseId)
      .then((r) => {
        if (annule) return;
        if (r.ok) setListe(r.donnees?.travailleurs ?? []);
        else setErreur(r.erreur);
      })
      .catch(() => !annule && setErreur("La base n'a pas répondu. Réessayez."));
    return () => {
      annule = true;
    };
  }, [entrepriseId]);

  const suggestions = useMemo(() => (liste && proche ? correspondances(liste, proche.prenom, proche.nom) : []), [liste, proche]);
  const visibles = useMemo(
    () => (liste ? filtrerTravailleurs(liste, recherche, actifsSeulement ? "Actif" : null).slice(0, 200) : []),
    [liste, recherche, actifsSeulement]
  );

  const ligne = (t: Travailleur, fermer: () => void) => (
    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <p className="font-semibold">{t.nom} {t.prenom}</p>
        <p className="ecg-texte-doux text-sm tabular-nums">
          {[t.niss ? nissAffiche(t.niss) : "Registre national manquant", t.contrat, t.statut !== "Actif" ? t.statut : ""].filter(Boolean).join(" · ")}
        </p>
      </div>
      <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => { onChoisir(t); fermer(); }}
        aria-label={`Choisir ${t.prenom} ${t.nom}`}>
        <UserCheck size={15} aria-hidden /> Choisir
      </button>
    </li>
  );

  return (
    <PanneauLateral ouvert onFermer={onFermer} titre={titre} sousTitre="Travailleurs de l'entreprise dans CG Link.">
      {(fermer) => (
        <div className="grid gap-4">
          {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
          {!liste && !erreur && <p className="flex items-center gap-2"><IconeChargement size={16} /> Chargement des travailleurs…</p>}
          {liste && (
            <>
              {suggestions.length > 0 && (
                <div>
                  <p className="ecg-libelle mb-1">Correspond au délégué</p>
                  <ul className="ecg-lignes">{suggestions.map((t) => ligne(t, fermer))}</ul>
                </div>
              )}
              <div className="ecg-champ-groupe relative">
                <label htmlFor="recherche-choix-travailleur" className="sr-only">Rechercher un travailleur</label>
                <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
                <input id="recherche-choix-travailleur" name="recherche-choix-travailleur" type="search" autoComplete="off" spellCheck={false}
                  autoFocus className={`${CHAMP} pl-9`} placeholder="Nom, prénom ou registre national…"
                  value={recherche} onChange={(e) => setRecherche(e.target.value)} />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="h-5 w-5" checked={actifsSeulement} onChange={(e) => setActifsSeulement(e.target.checked)} />
                Actifs seulement
              </label>
              <p className="sr-only" aria-live="polite">{visibles.length} travailleur(s) affiché(s)</p>
              {visibles.length === 0 ? (
                <Vide icone="list" titre={liste.length ? "Aucun travailleur ne correspond." : "Aucun travailleur dans CG Link pour cette entreprise."}>
                  {liste.length ? "Modifiez la recherche, ou décochez « Actifs seulement »." : "Encodez le délégué à la main."}
                </Vide>
              ) : (
                <ul className="ecg-lignes">{visibles.map((t) => ligne(t, fermer))}</ul>
              )}
              {visibles.length === 200 && <p className="ecg-aide">Les 200 premiers : affinez la recherche pour trouver la personne.</p>}
            </>
          )}
        </div>
      )}
    </PanneauLateral>
  );
}
