"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Lock, Search, X } from "lucide-react";
import { EcranChargement, IconeChargement } from "../../../Chargement";
import { dateFrToIso, formatDateFr } from "../../../../lib/dates";
import {
  DEMANDES,
  LIBELLES_TRI,
  TRIS,
  TYPES_DEMANDE,
  dateHeureBruxelles,
  type ReponseListe,
  type Tri,
  type TypeDemande,
} from "../../../../lib/demandes";

import { Alerte, EnteteEcran, Vide } from "../../_partage/ui";
type Filtres = { type: TypeDemande; q: string; du: string; au: string; tri: Tri; page: number };

/** Paramètres d'URL des filtres (valeurs par défaut omises, dates incomplètes ignorées). */
function chaineFiltres(f: Filtres): string {
  const p = new URLSearchParams();
  p.set("type", f.type);
  if (f.q.trim()) p.set("q", f.q.trim());
  if (dateFrToIso(f.du)) p.set("du", f.du);
  if (dateFrToIso(f.au)) p.set("au", f.au);
  if (f.tri !== "date_desc") p.set("tri", f.tri);
  if (f.page > 1) p.set("page", String(f.page));
  return p.toString();
}

const CHAMP = "ecg-champ";
const BOUTON_SECONDAIRE = "ecg-btn";

export default function ListeDemandes({ initial }: { initial: Filtres }) {
  const [filtres, setFiltres] = useState<Filtres>(initial);
  // La recherche part 300 ms après la dernière frappe.
  const [recherche, setRecherche] = useState(initial.q);
  const [reponse, setReponse] = useState<ReponseListe | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const requeteEnCours = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setFiltres((f) => (f.q === recherche ? f : { ...f, q: recherche, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [recherche]);

  const dateFausse = (d: string) => d.length === 10 && !dateFrToIso(d);
  const chaine = chaineFiltres(filtres);

  useEffect(() => {
    // Garde les filtres dans l'adresse (retour depuis une demande, lien partageable entre admins).
    window.history.replaceState(null, "", `?${chaine}`);
    requeteEnCours.current?.abort();
    const ctrl = new AbortController();
    requeteEnCours.current = ctrl;
    setChargement(true);
    setErreur("");
    fetch(`/api/admin/demandes?${chaine}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as ReponseListe & { erreur?: string };
        if (!res.ok) throw new Error(data.erreur ?? `Erreur ${res.status}. Rechargez la page.`);
        setReponse(data);
        setChargement(false);
        // Page hors limites : le serveur a servi la dernière page existante.
        if (data.page !== filtres.page) setFiltres((f) => ({ ...f, page: data.page }));
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setErreur(e instanceof Error ? e.message : "La liste ne peut pas être chargée. Rechargez la page.");
        setChargement(false);
      });
    return () => ctrl.abort();
  }, [chaine]);

  function maj(champ: Partial<Filtres>) {
    setFiltres((f) => ({ ...f, ...champ, page: champ.page ?? 1 }));
  }

  const config = DEMANDES[filtres.type];
  const pages = reponse ? Math.max(1, Math.ceil(reponse.total / reponse.parPage)) : 1;
  const filtresActifs = Boolean(filtres.q || filtres.du || filtres.au || filtres.tri !== "date_desc");

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone="folder"
        titre="Démarches des affiliés"
        description="Historique des formulaires en ligne. Ouvrez une demande pour tout voir et régénérer son PDF."
      />
      <Alerte ton="info" icone={Lock} role={null}>
        Données personnelles d&apos;affiliés : à consulter ici, à ne pas recopier ailleurs sans nécessité.
      </Alerte>

      <nav aria-label="Types de demande">
        <ul className="ecg-onglets">
          {TYPES_DEMANDE.map((t) => {
            const n = reponse?.compteurs[t];
            return (
              <li key={t}>
                <button type="button" onClick={() => maj({ type: t })} aria-pressed={t === filtres.type} className="ecg-onglet">
                  {DEMANDES[t].libelle}
                  {n !== undefined && <span className="ecg-compte">{n}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="ecg-panneau" aria-labelledby="titre-demandes">
        <div className="ecg-panneau-tete">
          <div>
            <h2 id="titre-demandes">{config.libelle}</h2>
            <p aria-live="polite">
              {chargement ? (
                <span className="inline-flex items-center gap-2">
                  <IconeChargement size={16} /> Chargement…
                </span>
              ) : reponse ? (
                <>
                  {reponse.total} demande{reponse.total > 1 ? "s" : ""}
                  {filtresActifs ? " correspondant aux filtres" : ""}
                </>
              ) : null}
            </p>
          </div>
          {filtresActifs && (
            <div className="ecg-panneau-tete-actions">
              <button
                type="button"
                onClick={() => {
                  setRecherche("");
                  setFiltres({ type: filtres.type, q: "", du: "", au: "", tri: "date_desc", page: 1 });
                }}
                className="ecg-btn ecg-btn-fantome ecg-btn-petit"
              >
                <X size={15} aria-hidden /> Effacer les filtres
              </button>
            </div>
          )}
        </div>

        <div className="ecg-panneau-corps grid gap-3 border-b border-[#dde2e7] md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_minmax(0,1.3fr)]">
          <div>
            <label htmlFor="recherche" className="ecg-libelle">
              Rechercher
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
              <input
                id="recherche"
                name="recherche"
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Nom, prénom ou e-mail…"
                autoComplete="off"
                spellCheck={false}
                className={`${CHAMP} pl-9`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="du" className="ecg-libelle">
              Reçues du
            </label>
            <input
              id="du"
              name="du"
              inputMode="numeric"
              autoComplete="off"
              value={filtres.du}
              onChange={(e) => maj({ du: formatDateFr(e.target.value) })}
              placeholder="jj/mm/aaaa"
              aria-invalid={dateFausse(filtres.du)}
              className={`${CHAMP} ecg-chiffre`}
            />
          </div>
          <div>
            <label htmlFor="au" className="ecg-libelle">
              au
            </label>
            <input
              id="au"
              name="au"
              inputMode="numeric"
              autoComplete="off"
              value={filtres.au}
              onChange={(e) => maj({ au: formatDateFr(e.target.value) })}
              placeholder="jj/mm/aaaa"
              aria-invalid={dateFausse(filtres.au)}
              className={`${CHAMP} ecg-chiffre`}
            />
          </div>
          <div>
            <label htmlFor="tri" className="ecg-libelle">
              Trier
            </label>
            <select id="tri" name="tri" value={filtres.tri} onChange={(e) => maj({ tri: e.target.value as Tri })} className={CHAMP}>
              {TRIS.map((t) => (
                <option key={t} value={t}>
                  {LIBELLES_TRI[t]}
                </option>
              ))}
            </select>
          </div>
          {(dateFausse(filtres.du) || dateFausse(filtres.au)) && (
            <p role="alert" className="ecg-erreur md:col-span-4">
              Date invalide, filtre ignoré : utilisez le format jj/mm/aaaa (ex. 24/09/2026).
            </p>
          )}
        </div>

        {!reponse && chargement && !erreur && (
          <div className="py-6">
            <EcranChargement compact texte="Chargement des demandes…" />
          </div>
        )}

        {erreur ? (
          <div className="ecg-panneau-corps">
            <Alerte ton="erreur">{erreur}</Alerte>
          </div>
        ) : reponse && reponse.lignes.length === 0 && !chargement ? (
          <Vide icone="folder" titre={filtresActifs ? "Aucune demande ne correspond à ces filtres" : "Aucune demande de ce type pour l'instant"} />
        ) : (
          reponse && (
            <div className={`ecg-tableau-cadre ${chargement ? "opacity-60" : ""}`}>
              <table className="ecg-tableau min-w-[640px]">
                <thead>
                  <tr>
                    <th scope="col">Reçue le</th>
                    <th scope="col">Demandeur</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">
                      <span className="sr-only">Ouvrir</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reponse.lignes.map((l) => {
                    const nom = [l.nom?.toUpperCase(), l.prenom].filter(Boolean).join(" ") || "(sans nom)";
                    const lien = `/espace/demarches/demandes/${filtres.type}/${l.id}?retour=${encodeURIComponent(chaine)}`;
                    return (
                      <tr key={l.id}>
                        <td className="ecg-chiffre whitespace-nowrap font-semibold">{dateHeureBruxelles(l.created_at)}</td>
                        <td>
                          <Link href={lien} className="font-semibold hover:underline">
                            {nom}
                          </Link>
                        </td>
                        <td className="max-w-[16rem] truncate">{l.email || <span className="ecg-texte-doux">Pas d&apos;e-mail</span>}</td>
                        <td className="text-right">
                          <Link href={lien} aria-label={`Ouvrir la demande de ${nom}`} className="ecg-btn ecg-btn-petit">
                            Ouvrir <ChevronRight size={15} aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {reponse && pages > 1 && (
          <nav aria-label="Pages" className="ecg-panneau-pied items-center justify-center">
            <button
              type="button"
              onClick={() => maj({ page: filtres.page - 1 })}
              disabled={filtres.page <= 1 || chargement}
              className={`${BOUTON_SECONDAIRE} ecg-btn-petit`}
            >
              <ChevronLeft size={16} aria-hidden /> Précédente
            </button>
            <p className="ecg-chiffre text-sm font-semibold">
              Page {Math.min(filtres.page, pages)} sur {pages}
            </p>
            <button
              type="button"
              onClick={() => maj({ page: filtres.page + 1 })}
              disabled={filtres.page >= pages || chargement}
              className={`${BOUTON_SECONDAIRE} ecg-btn-petit`}
            >
              Suivante <ChevronRight size={16} aria-hidden />
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
