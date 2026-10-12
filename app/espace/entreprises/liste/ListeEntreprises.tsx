"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert, Link2Off, Search, TriangleAlert } from "lucide-react";
import { formaterNumeroBce } from "../../../../lib/bce/numero";
import { correspond, type LigneListe } from "../../../../lib/entreprises/regles";
import { CHAMP, LIBELLE, ONGLET, Panneau, Statut, Vide } from "../../_partage/ui";

type Filtre = "toutes" | "bce" | "hors" | "ecarts";
const FILTRES: { code: Filtre; libelle: string; garde: (l: LigneListe) => boolean }[] = [
  { code: "toutes", libelle: "Toutes", garde: () => true },
  { code: "bce", libelle: "BCE non renseignée", garde: (l) => l.bceManquant },
  { code: "hors", libelle: "Hors CG Link", garde: (l) => l.horsCgLink },
  { code: "ecarts", libelle: "Écarts CG Link", garde: (l) => l.ecartsOnss },
];

export default function ListeEntreprises({ lignes, secteurs }: { lignes: LigneListe[]; secteurs: string[] }) {
  const [recherche, setRecherche] = useState("");
  const [secteur, setSecteur] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("toutes");

  const visibles = useMemo(() => {
    const garde = FILTRES.find((f) => f.code === filtre)!.garde;
    return lignes.filter((l) => garde(l) && (!secteur || l.secteur === secteur) && correspond(l, recherche));
  }, [lignes, filtre, secteur, recherche]);

  return (
    <Panneau corps={false}>
      <div className="flex flex-wrap items-end gap-3 px-5 pt-4">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="recherche" className={LIBELLE}>Rechercher</label>
          <div className="relative">
            <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <input id="recherche" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom, n° BCE, ONSS, localité…" className={`${CHAMP} pl-9`} autoComplete="off" spellCheck={false} />
          </div>
        </div>
        <div>
          <label htmlFor="secteur" className={LIBELLE}>Secteur</label>
          <select id="secteur" value={secteur} onChange={(e) => setSecteur(e.target.value)} className={CHAMP}>
            <option value="">Tous les secteurs</option>
            {secteurs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-5 py-3" role="group" aria-label="Filtrer">
        {FILTRES.map((f) => (
          <button key={f.code} type="button" aria-pressed={filtre === f.code} onClick={() => setFiltre(f.code)} className={ONGLET}>
            {f.libelle} ({lignes.filter(f.garde).length})
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">{visibles.length} entreprise{visibles.length > 1 ? "s" : ""} affichée{visibles.length > 1 ? "s" : ""}</p>

      {visibles.length === 0 ? (
        <div className="px-5 pb-5"><Vide icone="building" titre="Aucune entreprise ne correspond.">Modifiez la recherche ou les filtres.</Vide></div>
      ) : (
        <div className="ecg-tableau-cadre">
          <table className="ecg-tableau">
            <thead>
              <tr>
                <th scope="col">Entreprise</th>
                <th scope="col">Secteur</th>
                <th scope="col" className="text-right">Affiliés</th>
                <th scope="col" className="text-right">Sites</th>
                <th scope="col" className="text-right">Délégués</th>
                <th scope="col">État</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((l) => (
                <tr key={l.cle}>
                  <td>
                    <Link href={`/espace/entreprises/${l.cle}`} className="font-semibold ecg-lien">{l.nom}</Link>
                    {(l.denomination || l.numeroBce) && (
                      <div className="ecg-texte-doux text-sm">
                        {[l.denomination, l.numeroBce && formaterNumeroBce(l.numeroBce)].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td>{l.secteur ?? ""}</td>
                  <td className="text-right tabular-nums">{l.horsCgLink ? "" : l.affilies}</td>
                  <td className="text-right tabular-nums">{l.sites || ""}</td>
                  <td className="text-right tabular-nums">{l.delegues || ""}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {l.bceManquant && <Statut ton="attente" icone={CircleAlert}>BCE non renseignée</Statut>}
                      {l.horsCgLink && <Statut ton="info" icone={Link2Off}>Hors CG Link</Statut>}
                      {l.ecartsOnss && <Statut ton="attente" icone={TriangleAlert}>Écarts CG Link</Statut>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panneau>
  );
}
