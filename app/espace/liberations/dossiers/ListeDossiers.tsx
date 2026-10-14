"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Search, UserRound, Users } from "lucide-react";
import { isoToDateFr } from "../../../../lib/dates";
import { STATUTS, TYPES_LIBERATION, libelleType } from "../../../../lib/liberations/types";
import type { LigneDossier } from "../../../../lib/liberations/donnees-serveur";
import { CHAMP, LIBELLE, ONGLET, Panneau, Vide } from "../../_partage/ui";
import StatutDossier from "../StatutDossier";

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Dossiers actifs ou archivés, filtres par statut, type, année et secteur, recherche (objet, n°, participants, entreprises, permanent). */
export default function ListeDossiers({ lignes, secteurs, admin, statutInitial, archives: archivesInitial }: {
  lignes: LigneDossier[];
  secteurs: { id: string; nom: string }[];
  admin: boolean;
  statutInitial: string;
  archives: boolean;
}) {
  const [archives, setArchives] = useState(archivesInitial);
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState(STATUTS.some((s) => s.code === statutInitial) ? statutInitial : "");
  const [type, setType] = useState("");
  const [secteur, setSecteur] = useState("");
  const [annee, setAnnee] = useState("");

  const actifs = lignes.filter((l) => l.statut !== "archive");
  const annees = useMemo(() => [...new Set(lignes.map((l) => l.premiereDate?.slice(0, 4)).filter((x): x is string => Boolean(x)))].sort().reverse(), [lignes]);
  // Recherche : chaque mot doit se trouver dans le n°, l'objet, le permanent, le type, un participant ou son entreprise.
  const visibles = useMemo(() => {
    const mots = sansAccents(q).split(/\s+/).filter(Boolean);
    return lignes.filter((l) => {
      const texte = sansAccents(`${l.numero} ${l.objet ?? ""} ${l.demandeur} ${libelleType(l.type)} ${l.recherche}`);
      return (archives ? l.statut === "archive" : l.statut !== "archive") &&
        (archives || !statut || l.statut === statut) &&
        (!type || l.type === type) &&
        (!secteur || l.secteurId === secteur) &&
        (!annee || l.premiereDate?.startsWith(annee)) &&
        mots.every((m) => texte.includes(m));
    });
  }, [lignes, archives, statut, type, secteur, annee, q]);

  return (
    <Panneau corps={false}>
      <div className="flex flex-wrap gap-2 px-5 pt-4" role="group" aria-label="Dossiers affichés">
        <button type="button" className={ONGLET} aria-pressed={!archives} onClick={() => setArchives(false)}>Actifs ({actifs.length})</button>
        <button type="button" className={ONGLET} aria-pressed={archives} onClick={() => setArchives(true)}>
          Archivés ({lignes.length - actifs.length})
        </button>
      </div>
      <div className="grid gap-3 px-5 pt-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="q" className={LIBELLE}>Rechercher</label>
          <div className="relative">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className={`${CHAMP} pl-9`}
              placeholder={admin ? "Objet, n°, participant, entreprise, permanent…" : "Objet, n°, participant, entreprise…"} autoComplete="off" />
          </div>
        </div>
        {!archives && (
          <div>
            <label htmlFor="statut" className={LIBELLE}>Statut</label>
            <select id="statut" value={statut} onChange={(e) => setStatut(e.target.value)} className={CHAMP}>
              <option value="">Tous</option>
              {STATUTS.filter((s) => s.code !== "archive").map((s) => <option key={s.code} value={s.code}>{s.libelle}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="type" className={LIBELLE}>Type</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)} className={CHAMP}>
            <option value="">Tous</option>
            {TYPES_LIBERATION.map((t) => <option key={t.code} value={t.code}>{t.libelle}</option>)}
          </select>
        </div>
        {annees.length > 1 && (
          <div>
            <label htmlFor="annee" className={LIBELLE}>Année</label>
            <select id="annee" value={annee} onChange={(e) => setAnnee(e.target.value)} className={CHAMP}>
              <option value="">Toutes</option>
              {annees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="secteur" className={LIBELLE}>Secteur</label>
          <select id="secteur" value={secteur} onChange={(e) => setSecteur(e.target.value)} className={CHAMP}>
            <option value="">Tous</option>
            {secteurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{visibles.length} dossier(s) affiché(s)</p>
      <div className="px-5 pb-2 pt-2">
        {visibles.length ? (
          <ul className="ecg-lignes">
            {visibles.map((l) => (
              <li key={l.id} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <div className="grid min-w-0 gap-0.5">
                  <Link href={`/espace/liberations/${l.id}`} className="ecg-lien font-semibold">
                    <span className="tabular-nums">N° {l.numero}</span> · {l.objet?.trim() || "Demande sans objet"}
                  </Link>
                  <span className="ecg-texte-doux flex flex-wrap items-center gap-x-2 text-sm">
                    <span>{libelleType(l.type)}</span>
                    {l.premiereDate && (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        · <CalendarDays size={14} aria-hidden /> {isoToDateFr(l.premiereDate)}{l.nbDates > 1 ? ` (+${l.nbDates - 1})` : ""}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      · <Users size={14} aria-hidden /> {l.nbParticipants} participant{l.nbParticipants > 1 ? "s" : ""}
                    </span>
                    {admin && l.demandeur && <span className="inline-flex items-center gap-1">· <UserRound size={14} aria-hidden /> {l.demandeur}</span>}
                  </span>
                </div>
                <StatutDossier statut={l.statut} />
              </li>
            ))}
          </ul>
        ) : (
          <Vide icone="calendar-check" titre={lignes.length ? "Aucun dossier ne correspond." : "Aucun dossier pour le moment."}>
            {lignes.length ? "Modifiez la recherche ou les filtres." : "Créez une demande avec « Nouvelle demande »."}
          </Vide>
        )}
      </div>
    </Panneau>
  );
}
