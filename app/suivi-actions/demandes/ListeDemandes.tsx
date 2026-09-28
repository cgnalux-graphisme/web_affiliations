"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Lock, Search, X } from "lucide-react";
import { dateFrToIso, formatDateFr } from "../../../lib/dates";
import {
  DEMANDES,
  LIBELLES_TRI,
  TRIS,
  TYPES_DEMANDE,
  dateHeureBruxelles,
  type ReponseListe,
  type Tri,
  type TypeDemande,
} from "../../../lib/demandes";

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

const CHAMP =
  "min-h-[44px] w-full rounded-xl border border-militant-ardoise bg-white px-3 py-2 text-[15px] focus:border-militant-charbon focus:outline-none focus:ring-2 focus:ring-militant-rouge";
const BOUTON_SECONDAIRE =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-militant-charbon bg-white px-3.5 py-2 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-militant-charbon";

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
    <div className="mx-auto max-w-6xl">
      <div className="border-b-[6px] border-militant-charbon pb-5">
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-none tracking-tight">Demandes</h1>
        <p className="mt-2 text-base">
          Historique des formulaires en ligne. Ouvrez une demande pour tout voir et régénérer son PDF.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
          <Lock size={14} className="shrink-0 text-militant-bordeaux" aria-hidden />
          Données personnelles d&apos;affiliés : à consulter ici, à ne pas recopier ailleurs sans nécessité.
        </p>
      </div>

      <nav aria-label="Types de demande" className="mt-6 flex flex-wrap gap-2">
        {TYPES_DEMANDE.map((t) => {
          const actif = t === filtres.type;
          const n = reponse?.compteurs[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => maj({ type: t })}
              aria-pressed={actif}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-4 py-2 text-[15px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 ${
                actif ? "border-militant-bordeaux bg-militant-bordeaux text-white" : "border-militant-ardoise bg-white hover:border-militant-charbon"
              }`}
            >
              {DEMANDES[t].libelle}
              {n !== undefined && (
                <span
                  className={`rounded-full px-2 text-sm tabular-nums ${actif ? "bg-white text-militant-bordeaux" : "border border-militant-ardoise"}`}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-5 grid gap-3 rounded-2xl border border-militant-ardoise p-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_minmax(0,1.3fr)]">
        <div>
          <label htmlFor="recherche" className="mb-1 block text-sm font-bold">
            Rechercher
          </label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input
              id="recherche"
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom, prénom ou e-mail"
              autoComplete="off"
              className={`${CHAMP} pl-9`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="du" className="mb-1 block text-sm font-bold">
            Reçues du
          </label>
          <input
            id="du"
            inputMode="numeric"
            value={filtres.du}
            onChange={(e) => maj({ du: formatDateFr(e.target.value) })}
            placeholder="jj/mm/aaaa"
            aria-invalid={dateFausse(filtres.du)}
            className={CHAMP}
          />
        </div>
        <div>
          <label htmlFor="au" className="mb-1 block text-sm font-bold">
            au
          </label>
          <input
            id="au"
            inputMode="numeric"
            value={filtres.au}
            onChange={(e) => maj({ au: formatDateFr(e.target.value) })}
            placeholder="jj/mm/aaaa"
            aria-invalid={dateFausse(filtres.au)}
            className={CHAMP}
          />
        </div>
        <div>
          <label htmlFor="tri" className="mb-1 block text-sm font-bold">
            Trier
          </label>
          <select id="tri" value={filtres.tri} onChange={(e) => maj({ tri: e.target.value as Tri })} className={CHAMP}>
            {TRIS.map((t) => (
              <option key={t} value={t}>
                {LIBELLES_TRI[t]}
              </option>
            ))}
          </select>
        </div>
        {(dateFausse(filtres.du) || dateFausse(filtres.au)) && (
          <p role="alert" className="text-sm font-semibold text-militant-bordeaux md:col-span-4">
            Date invalide, filtre ignoré : utilisez le format jj/mm/aaaa (ex. 24/09/2026).
          </p>
        )}
      </div>

      <div className="mt-5 flex min-h-[44px] flex-wrap items-center justify-between gap-3" aria-live="polite">
        <p className="text-base">
          {chargement ? (
            <span className="inline-flex items-center gap-2 font-semibold">
              <Loader2 size={16} className="animate-spin text-militant-rouge" aria-hidden /> Chargement…
            </span>
          ) : reponse ? (
            <>
              <span className="font-bold">{reponse.total}</span> demande{reponse.total > 1 ? "s" : ""} « {config.libelle} »
              {filtresActifs ? " correspondant aux filtres" : ""}
            </>
          ) : null}
        </p>
        {filtresActifs && (
          <button
            type="button"
            onClick={() => {
              setRecherche("");
              setFiltres({ type: filtres.type, q: "", du: "", au: "", tri: "date_desc", page: 1 });
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-sm font-bold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
          >
            <X size={15} aria-hidden /> Effacer les filtres
          </button>
        )}
      </div>

      {erreur ? (
        <p role="alert" className="mt-4 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          {erreur}
        </p>
      ) : reponse && reponse.lignes.length === 0 && !chargement ? (
        <p className="mt-6 border-l-[6px] border-militant-rouge py-2 pl-5 text-lg">
          {filtresActifs ? "Aucune demande ne correspond à ces filtres." : "Aucune demande de ce type pour l'instant."}
        </p>
      ) : (
        reponse && (
          <div className={`mt-3 overflow-x-auto ${chargement ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-militant-charbon text-sm">
                  <th scope="col" className="px-3 py-2 font-bold">
                    Reçue le
                  </th>
                  <th scope="col" className="px-3 py-2 font-bold">
                    Demandeur
                  </th>
                  <th scope="col" className="px-3 py-2 font-bold">
                    E-mail
                  </th>
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">Ouvrir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-militant-ardoise">
                {reponse.lignes.map((l) => {
                  const nom = [l.nom?.toUpperCase(), l.prenom].filter(Boolean).join(" ") || "(sans nom)";
                  const lien = `/suivi-actions/demandes/${filtres.type}/${l.id}?retour=${encodeURIComponent(chaine)}`;
                  return (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap px-3 py-3 font-condensed text-lg font-bold tabular-nums">
                        {dateHeureBruxelles(l.created_at)}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={lien}
                          className="font-bold underline-offset-4 hover:text-militant-bordeaux hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                        >
                          {nom}
                        </Link>
                      </td>
                      <td className="max-w-[16rem] truncate px-3 py-3 text-sm">{l.email || "—"}</td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={lien}
                          aria-label={`Ouvrir la demande de ${nom}`}
                          className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border-2 border-militant-charbon px-3 py-1.5 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                        >
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
        <nav aria-label="Pages" className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => maj({ page: filtres.page - 1 })}
            disabled={filtres.page <= 1 || chargement}
            className={BOUTON_SECONDAIRE}
          >
            <ChevronLeft size={16} aria-hidden /> Précédente
          </button>
          <p className="text-sm font-semibold tabular-nums">
            Page {Math.min(filtres.page, pages)} sur {pages}
          </p>
          <button
            type="button"
            onClick={() => maj({ page: filtres.page + 1 })}
            disabled={filtres.page >= pages || chargement}
            className={BOUTON_SECONDAIRE}
          >
            Suivante <ChevronRight size={16} aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}
