"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileText, Link2, Loader2, Lock, RefreshCw } from "lucide-react";
import { DEMANDES, dateHeureBruxelles, nomFichierPdf, type TypeDemande } from "../../../../../lib/demandes";
import { detailDemande } from "../../../../../lib/demandes-affichage";
import type { DemandeLiee } from "../../../../../lib/demandes-liees";

const BOUTON_PRINCIPAL =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-militant-bordeaux px-5 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:opacity-50";
const BOUTON_SECONDAIRE =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-militant-charbon bg-white px-4 py-2 text-[15px] font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-50";

/**
 * Reproduit le PDF d'une demande avec le code des formulaires :
 * - affiliation, mandat SEPA, changement de compte : document react-pdf, dans le navigateur ;
 * - C1, C3.2 : formulaire ONEM rempli par le serveur (/api/admin/demandes/…/pdf).
 */
async function produirePdf(type: TypeDemande, id: string, ligne: Record<string, unknown>): Promise<Blob> {
  if (type === "affiliation") {
    const { genererPdfAffiliationEnregistree } = await import("../../../../../FormulaireWebIndependant");
    return genererPdfAffiliationEnregistree(ligne);
  }
  if (type === "sepa" || type === "changement") {
    const { genererPdfMandatEnregistre } = await import("../../../../../FormulaireChangementCompte");
    return genererPdfMandatEnregistre(ligne);
  }
  const res = await fetch(`/api/admin/demandes/${type}/${id}/pdf`, { cache: "no-store" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { erreur?: string };
    throw new Error(data.erreur ?? `Erreur ${res.status}.`);
  }
  return res.blob();
}

export default function DetailDemande({ type, id, retour }: { type: TypeDemande; id: string; retour: string }) {
  const config = DEMANDES[type];
  const [ligne, setLigne] = useState<Record<string, unknown> | null>(null);
  const [erreur, setErreur] = useState("");
  const [liees, setLiees] = useState<DemandeLiee[] | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generation, setGeneration] = useState(false);
  const [erreurPdf, setErreurPdf] = useState("");
  const lienTelechargement = useRef<HTMLAnchorElement>(null);
  const urlCourante = useRef<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/admin/demandes/${type}/${id}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { demande?: Record<string, unknown>; erreur?: string };
        if (!res.ok || !data.demande) throw new Error(data.erreur ?? `Erreur ${res.status}. Rechargez la page.`);
        setLigne(data.demande);
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setErreur(e instanceof Error ? e.message : "La demande ne peut pas être chargée.");
      });
    // Demandes de la même personne (chargées à part : la fiche s'affiche sans les attendre).
    fetch(`/api/admin/demandes/${type}/${id}/liees`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => (res.ok ? ((await res.json()) as { liees: DemandeLiee[] }).liees : []))
      .then(setLiees)
      .catch(() => {
        if (!ctrl.signal.aborted) setLiees([]);
      });
    return () => ctrl.abort();
  }, [type, id]);

  // Libère le PDF en mémoire en quittant la page.
  useEffect(() => () => {
    if (urlCourante.current) URL.revokeObjectURL(urlCourante.current);
  }, []);

  const nomFichier = ligne
    ? nomFichierPdf(type, ligne.nom as string | null, ligne.prenom as string | null, String(ligne.created_at ?? ""))
    : "demande.pdf";

  async function regenerer(): Promise<string | null> {
    if (!ligne) return null;
    setGeneration(true);
    setErreurPdf("");
    try {
      const blob = await produirePdf(type, id, ligne);
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      if (urlCourante.current) URL.revokeObjectURL(urlCourante.current);
      urlCourante.current = url;
      setPdfUrl(url);
      return url;
    } catch (e) {
      console.error("PDF de la demande :", e instanceof Error ? e.message : "erreur");
      setErreurPdf(
        e instanceof Error && e.message
          ? `Le PDF n'a pas pu être régénéré : ${e.message}`
          : "Le PDF n'a pas pu être régénéré. Réessayez."
      );
      return null;
    } finally {
      setGeneration(false);
    }
  }

  async function telecharger() {
    const url = urlCourante.current ?? (await regenerer());
    if (!url || !lienTelechargement.current) return;
    lienTelechargement.current.href = url;
    lienTelechargement.current.click();
  }

  const nom = ligne ? [String(ligne.nom ?? "").toUpperCase(), String(ligne.prenom ?? "")].filter(Boolean).join(" ") : "";
  const detail = ligne ? detailDemande(type, ligne) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={retour}
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
      >
        <ArrowLeft size={16} aria-hidden /> Demandes
      </Link>

      <div className="mt-2 border-b-[6px] border-militant-charbon pb-5">
        <p className="font-condensed text-xl font-bold uppercase text-militant-bordeaux">{config.singulier}</p>
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-none tracking-tight">{nom || "Demande"}</h1>
        {ligne && <p className="mt-2 text-base">Reçue le {dateHeureBruxelles(String(ligne.created_at ?? ""))}</p>}
      </div>

      {erreur && (
        <p role="alert" className="mt-6 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          {erreur}
        </p>
      )}
      {!ligne && !erreur && (
        <p role="status" className="mt-6 flex items-center gap-2 font-semibold">
          <Loader2 size={18} className="animate-spin text-militant-rouge" aria-hidden /> Chargement de la demande…
        </p>
      )}

      {ligne && detail && (
        <>
          {liees && liees.length > 0 && (
            <section aria-labelledby="titre-liees" className="mt-6 rounded-2xl border-2 border-militant-bordeaux p-5">
              <h2 id="titre-liees" className="flex items-center gap-2 font-condensed text-2xl font-extrabold uppercase">
                <Link2 size={20} aria-hidden /> Autres demandes de la même personne
              </h2>
              <p className="mt-1 text-sm">
                Retrouvées par le même NISS ou le même e-mail : c'est une déduction, vérifiez l'identité avant de les rapprocher.
              </p>
              <ul className="mt-3 divide-y divide-militant-ardoise">
                {liees.map((l) => (
                  <li key={`${l.type}-${l.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                    <span className="font-condensed text-lg font-bold tabular-nums">{dateHeureBruxelles(l.created_at)}</span>
                    <Link
                      href={`/suivi-actions/demandes/${l.type}/${l.id}?retour=${encodeURIComponent(new URL(retour, "http://x").search.slice(1))}`}
                      className="font-bold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                    >
                      {DEMANDES[l.type].singulier}
                    </Link>
                    <span>{[l.nom?.toUpperCase(), l.prenom].filter(Boolean).join(" ")}</span>
                    <span className="text-sm">{l.raison === "niss" ? "même NISS" : "même e-mail"}</span>
                    {l.memeDossier && (
                      <span className="rounded-full bg-militant-bordeaux px-2.5 py-0.5 text-sm font-bold text-white">
                        Même dossier probable (moins de 24 h d'écart)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="titre-pdf" className="mt-6 rounded-2xl border border-militant-ardoise p-5">
            <h2 id="titre-pdf" className="flex items-center gap-2 font-condensed text-2xl font-extrabold uppercase">
              <FileText size={20} aria-hidden /> PDF de la demande
            </h2>
            <p className="mt-1 text-sm">
              Même document que celui produit au moment de la demande, recréé à partir des données enregistrées
              {config.pdf === "navigateur" ? " (daté du jour de la demande)" : ""}.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={regenerer} disabled={generation} className={BOUTON_PRINCIPAL}>
                {generation ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <RefreshCw size={18} aria-hidden />}
                {generation ? "Génération…" : "Régénérer le PDF"}
              </button>
              <button type="button" onClick={telecharger} disabled={generation} className={BOUTON_SECONDAIRE}>
                <Download size={18} aria-hidden /> Télécharger
              </button>
              {/* Lien caché utilisé par « Télécharger » (nom de fichier propre). */}
              <a ref={lienTelechargement} download={nomFichier} className="hidden" aria-hidden tabIndex={-1} />
            </div>
            <div aria-live="polite">
              {erreurPdf && (
                <p role="alert" className="mt-3 text-sm font-semibold text-militant-bordeaux">
                  {erreurPdf}
                </p>
              )}
              {pdfUrl && !generation && <p className="mt-3 text-sm font-semibold">PDF prêt : aperçu ci-dessous.</p>}
            </div>
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                title={`Aperçu du PDF — ${nomFichier}`}
                className="mt-4 h-[75vh] w-full rounded-xl border border-militant-ardoise"
              />
            )}
          </section>

          <p className="mt-6 flex items-center gap-1.5 text-sm font-semibold">
            <Lock size={14} className="shrink-0 text-militant-bordeaux" aria-hidden />
            Données personnelles : réservées au traitement de la demande.
          </p>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {detail.sections.map((s) => (
              <section
                key={s.titre}
                aria-label={s.titre}
                className={`rounded-2xl border border-militant-ardoise ${s.champs.length > 12 ? "md:col-span-2" : ""}`}
              >
                <h2 className="border-b-2 border-militant-charbon px-5 py-2.5 font-condensed text-xl font-extrabold uppercase">
                  {s.titre}
                </h2>
                <dl
                  className={`grid gap-x-6 px-5 py-3 ${s.champs.length > 12 ? "md:grid-cols-2" : ""}`}
                >
                  {s.champs.map((c) => (
                    <div key={c.cle} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-3 border-b border-militant-ardoise/40 py-1.5 last:border-b-0">
                      <dt className="text-sm font-semibold">{c.libelle}</dt>
                      <dd className="break-words text-[15px]">
                        {c.liste && c.liste.length ? (
                          <ol className="list-decimal space-y-1 pl-5">
                            {c.liste.map((el, i) => (
                              <li key={i}>{el.length ? el.join(" · ") : "—"}</li>
                            ))}
                          </ol>
                        ) : (
                          c.valeur
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            <section aria-label="Signature" className="rounded-2xl border border-militant-ardoise">
              <h2 className="border-b-2 border-militant-charbon px-5 py-2.5 font-condensed text-xl font-extrabold uppercase">
                Signature
              </h2>
              <div className="px-5 py-4">
                {detail.signature ? (
                  // eslint-disable-next-line @next/next/no-img-element -- image en data URL, pas d'optimisation possible
                  <img src={detail.signature} alt={`Signature de ${nom}`} className="max-h-40 w-auto max-w-full" />
                ) : (
                  <p>Aucune signature enregistrée.</p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
