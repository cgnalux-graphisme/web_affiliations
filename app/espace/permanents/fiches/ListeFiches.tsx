"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { LigneFiche } from "../../../../lib/fiches-suivi/types";
import LignesFiches from "../../_partage/LignesFiches";
import { CHAMP, LIBELLE, ONGLET, Panneau, Vide } from "../../_partage/ui";

const sansAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function ListeFiches({ lignes, secteurs, moi, mesParDefaut }: {
  lignes: LigneFiche[];
  secteurs: { id: string; nom: string }[];
  moi: string;
  mesParDefaut: boolean;
}) {
  const [q, setQ] = useState("");
  const [mes, setMes] = useState(mesParDefaut);
  const [type, setType] = useState("");
  const [statut, setStatut] = useState("");
  const [secteur, setSecteur] = useState("");

  const visibles = useMemo(() => lignes.filter((l) =>
    (!mes || l.auteurId === moi) &&
    (!type || l.type === type) &&
    (!statut || l.statut === statut) &&
    (!secteur || l.secteurId === secteur) &&
    (!q.trim() || sansAccents(`${l.titre ?? ""} ${l.entreprise ?? ""} ${l.secteur ?? ""} ${l.auteur ?? ""}`).includes(sansAccents(q.trim())))
  ), [lignes, mes, moi, type, statut, secteur, q]);

  return (
    <Panneau corps={false}>
      <div className="flex flex-wrap gap-2 px-5 pt-4" role="group" aria-label="Fiches affichées">
        <button type="button" className={ONGLET} aria-pressed={!mes} onClick={() => setMes(false)}>Toutes ({lignes.length})</button>
        <button type="button" className={ONGLET} aria-pressed={mes} onClick={() => setMes(true)}>
          Mes fiches ({lignes.filter((l) => l.auteurId === moi).length})
        </button>
      </div>
      <div className="grid gap-3 px-5 pt-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="q" className={LIBELLE}>Rechercher</label>
          <div className="relative">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className={`${CHAMP} pl-9`}
              placeholder="Titre, entreprise, permanent…" autoComplete="off" />
          </div>
        </div>
        <div>
          <label htmlFor="type" className={LIBELLE}>Type</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)} className={CHAMP}>
            <option value="">Tous</option>
            <option value="usine">Événement en usine</option>
            <option value="sectoriel">Événement sectoriel</option>
          </select>
        </div>
        <div>
          <label htmlFor="statut" className={LIBELLE}>Statut</label>
          <select id="statut" value={statut} onChange={(e) => setStatut(e.target.value)} className={CHAMP}>
            <option value="">Tous</option>
            <option value="brouillon">Brouillon</option>
            <option value="terminee">Terminée</option>
          </select>
        </div>
        <div>
          <label htmlFor="secteur" className={LIBELLE}>Secteur</label>
          <select id="secteur" value={secteur} onChange={(e) => setSecteur(e.target.value)} className={CHAMP}>
            <option value="">Tous</option>
            {secteurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{visibles.length} fiche(s) affichée(s)</p>
      <div className="px-5 pb-2 pt-2">
        {visibles.length ? <LignesFiches lignes={visibles} /> : (
          <Vide icone="clipboard" titre="Aucune fiche ne correspond.">Modifiez la recherche ou les filtres.</Vide>
        )}
      </div>
    </Panneau>
  );
}
