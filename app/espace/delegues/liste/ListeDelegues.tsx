"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleSlash, Clock, Flag, GitCompare, Search, UserX } from "lucide-react";
import type { EntrepriseChoix, LigneDelegue } from "../../../../lib/delegues/donnees-serveur";
import { LIBELLES_COMPTE } from "../../../../lib/delegues/delegue";
import { LIBELLES_ORGANES } from "../../../../lib/delegues/mandats";
import { ORGANES, type EtatCompte } from "../../../../lib/delegues/types";
import { CHAMP, LIBELLE, Panneau, Statut, Vide } from "../../_partage/ui";

const ICONE_COMPTE = { actif: CircleCheck, invite: Clock, bloque: CircleSlash, sans_compte: UserX, introuvable: UserX };
const TON_COMPTE = { actif: "ok", invite: "attente", bloque: "erreur", sans_compte: undefined, introuvable: "erreur" } as const;
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function ListeDelegues({ lignes, entreprises }: { lignes: LigneDelegue[]; entreprises: EntrepriseChoix[] }) {
  const [q, setQ] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [organe, setOrgane] = useState("");
  const [compte, setCompte] = useState("");
  const [aVerifier, setAVerifier] = useState(false);
  const [avecEcarts, setAvecEcarts] = useState(false);

  const visibles = useMemo(() => lignes.filter((l) =>
    (!q || sansAccents(`${l.prenom ?? ""} ${l.nom} ${l.entrepriseNom}`).includes(sansAccents(q.trim()))) &&
    (!entreprise || l.entrepriseId === entreprise) &&
    (!organe || l.organes.includes(organe as LigneDelegue["organes"][number])) &&
    (!compte || l.compte === compte) &&
    (!aVerifier || l.aVerifier) &&
    (!avecEcarts || l.ecarts > 0)
  ), [lignes, q, entreprise, organe, compte, aVerifier, avecEcarts]);

  return (
    <Panneau corps={false}>
      <div className="grid gap-3 px-5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="q" className={LIBELLE}>Rechercher</label>
          <div className="relative">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className={`${CHAMP} pl-9`} placeholder="Nom, entreprise…" autoComplete="off" />
          </div>
        </div>
        <div>
          <label htmlFor="entreprise" className={LIBELLE}>Entreprise</label>
          <select id="entreprise" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} className={CHAMP}>
            <option value="">Toutes</option>
            {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="organe" className={LIBELLE}>Mandat</label>
          <select id="organe" value={organe} onChange={(e) => setOrgane(e.target.value)} className={CHAMP}>
            <option value="">Tous</option>
            {ORGANES.map((o) => <option key={o} value={o}>{LIBELLES_ORGANES[o]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="compte" className={LIBELLE}>Compte CG Link</label>
          <select id="compte" value={compte} onChange={(e) => setCompte(e.target.value)} className={CHAMP}>
            <option value="">Tous</option>
            {(Object.keys(LIBELLES_COMPTE) as EtatCompte[]).map((k) => <option key={k} value={k}>{LIBELLES_COMPTE[k]}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-3">
          <input type="checkbox" className="h-5 w-5" checked={aVerifier} onChange={(e) => setAVerifier(e.target.checked)} />
          À vérifier seulement
        </label>
        <label className="flex items-center gap-2 self-end pb-3">
          <input type="checkbox" className="h-5 w-5" checked={avecEcarts} onChange={(e) => setAvecEcarts(e.target.checked)} />
          Écarts avec CG Link
        </label>
      </div>
      <p className="sr-only" aria-live="polite">{visibles.length} délégué(s) affiché(s)</p>
      {visibles.length === 0 ? (
        <div className="p-5"><Vide icone="id-card" titre="Aucun délégué ne correspond.">Modifiez la recherche ou les filtres, ou lancez l'import CG Link.</Vide></div>
      ) : (
        <div className="ecg-tableau-cadre mt-3">
          <table className="ecg-tableau">
            <thead><tr><th scope="col">Délégué</th><th scope="col">Entreprise</th><th scope="col">Mandats en cours</th><th scope="col">Compte CG Link</th></tr></thead>
            <tbody>
              {visibles.map((l) => {
                const Icone = ICONE_COMPTE[l.compte];
                return (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/espace/delegues/${l.id}`} className="ecg-lien font-semibold">{[l.prenom, l.nom].filter(Boolean).join(" ")}</Link>
                      {(l.aVerifier || l.ecarts > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {l.aVerifier && <Statut ton="attente" icone={Flag}>À vérifier</Statut>}
                          {l.ecarts > 0 && <Statut ton="info" icone={GitCompare}>{l.ecarts} écart{l.ecarts > 1 ? "s" : ""} CG Link</Statut>}
                        </div>
                      )}
                    </td>
                    <td>{l.entrepriseNom}</td>
                    <td>{l.mandats.join(" · ")}</td>
                    <td><Statut ton={TON_COMPTE[l.compte]} icone={Icone}>{LIBELLES_COMPTE[l.compte]}</Statut></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panneau>
  );
}
