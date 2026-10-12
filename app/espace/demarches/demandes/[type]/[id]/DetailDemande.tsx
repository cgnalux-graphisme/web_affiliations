"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle, Download, FileText, Link2, Lock, Mail, RefreshCw } from "lucide-react";
import { EcranChargement, IconeChargement } from "../../../../../Chargement";
import { DEMANDES, dateHeureBruxelles, nomFichierPdf, type TypeDemande } from "../../../../../../lib/demandes";
import { detailDemande } from "../../../../../../lib/demandes-affichage";
import type { DemandeLiee } from "../../../../../../lib/demandes-liees";
import { LIBELLES_ENVOI_JOURNAL, type EnvoiMail } from "../../../../../../lib/envois";
import { LIBELLES_TRANSFERT, MESSAGES_TRANSFERT } from "../../../../../../lib/modification";

import { Alerte, EnteteEcran, Panneau, Statut } from "../../../../_partage/ui";
const BOUTON_PRINCIPAL = "ecg-btn ecg-btn-principal";
const BOUTON_SECONDAIRE = "ecg-btn";

/**
 * Reproduit le PDF d'une demande avec le code des formulaires :
 * - affiliation, mandat SEPA, changement de compte, changement de situation : document react-pdf, dans le navigateur ;
 * - C1, C3.2 : formulaire ONEM rempli par le serveur (/api/admin/demandes/…/pdf).
 */
async function produirePdf(type: TypeDemande, id: string, ligne: Record<string, unknown>): Promise<Blob> {
  if (type === "affiliation") {
    const { genererPdfAffiliationEnregistree } = await import("../../../../../../FormulaireWebIndependant");
    return genererPdfAffiliationEnregistree(ligne);
  }
  if (type === "sepa" || type === "changement") {
    const { genererPdfMandatEnregistre } = await import("../../../../../../FormulaireChangementCompte");
    return genererPdfMandatEnregistre(ligne);
  }
  if (type === "modification") {
    const { genererPdfModificationEnregistree } = await import("../../../../../../FormulaireModification");
    return genererPdfModificationEnregistree(ligne);
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
  const [envois, setEnvois] = useState<{ envois: EnvoiMail[]; tableAbsente: boolean } | null>(null);
  const [erreurEnvois, setErreurEnvois] = useState("");

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
    // Historique des e-mails envoyés pour cette demande.
    fetch(`/api/admin/demandes/${type}/${id}/envois`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { envois?: EnvoiMail[]; tableAbsente?: boolean; erreur?: string };
        if (!res.ok || !data.envois) throw new Error(data.erreur ?? `Erreur ${res.status}.`);
        setEnvois({ envois: data.envois, tableAbsente: Boolean(data.tableAbsente) });
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setErreurEnvois(e instanceof Error ? e.message : "L'historique ne peut pas être chargé.");
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
    <div className="ecg-ecran">
      <EnteteEcran
        icone="folder"
        titre={nom || "Demande"}
        description={
          <>
            {config.singulier}
            {ligne ? `, reçue le ${dateHeureBruxelles(String(ligne.created_at ?? ""))}` : ""}
          </>
        }
        actions={
          <Link href={retour} className={BOUTON_SECONDAIRE}>
            <ArrowLeft size={16} aria-hidden /> Toutes les demandes
          </Link>
        }
      />

      {type === "modification" && (ligne?.transfert === "a_organiser" || ligne?.transfert === "a_verifier") && (
        <Alerte ton={ligne.transfert === "a_organiser" ? "erreur" : "attention"} role={null} titre={LIBELLES_TRANSFERT[ligne.transfert]}>
          {ligne.transfert === "a_organiser"
            ? "Commission paritaire « Autre » : la nouvelle profession relève d'une autre centrale. À organiser par nos services."
            : "Commission paritaire inconnue de l'affilié : vérifiez son secteur."}{" "}
          Message reçu par l&apos;affilié : « {MESSAGES_TRANSFERT[ligne.transfert]} »
        </Alerte>
      )}

      {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
      {!ligne && !erreur && <EcranChargement compact texte="Chargement de la demande…" />}

      {ligne && detail && (
        <>
          {liees && liees.length > 0 && (
            <Panneau
              id="liees"
              titre={
                <span className="inline-flex items-center gap-2">
                  <Link2 size={18} aria-hidden /> Autres demandes de la même personne
                </span>
              }
              sousTitre="Retrouvées par le même NISS ou le même e-mail : c'est une déduction, vérifiez l'identité avant de les rapprocher."
              corps={false}
            >
              <ul className="ecg-lignes">
                {liees.map((l) => (
                  <li key={`${l.type}-${l.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="ecg-chiffre font-semibold">{dateHeureBruxelles(l.created_at)}</span>
                    <Link
                      href={`/espace/demarches/demandes/${l.type}/${l.id}?retour=${encodeURIComponent(new URL(retour, "http://x").search.slice(1))}`}
                      className="ecg-lien"
                    >
                      {DEMANDES[l.type].singulier}
                    </Link>
                    <span>{[l.nom?.toUpperCase(), l.prenom].filter(Boolean).join(" ")}</span>
                    <span className="ecg-texte-doux text-sm">{l.raison === "niss" ? "même NISS" : "même e-mail"}</span>
                    {l.memeDossier && (
                      <Statut ton="info" icone={Link2}>
                        Même dossier probable (moins de 24 h d&apos;écart)
                      </Statut>
                    )}
                  </li>
                ))}
              </ul>
            </Panneau>
          )}

          {pdfUrl && (
            <Panneau titre="Aperçu du PDF" corps={false}>
              <iframe src={pdfUrl} title={`Aperçu du PDF, ${nomFichier}`} className="block h-[75vh] w-full" />
            </Panneau>
          )}

          <div className="ecg-grille-2">
            <div className="ecg-pile">
              {detail.sections.map((s) => (
                <Panneau key={s.titre} titre={s.titre}>
                  <dl className={`grid gap-x-6 ${s.champs.length > 12 ? "lg:grid-cols-2" : ""}`}>
                    {s.champs.map((c) => (
                      <div
                        key={c.cle}
                        className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-3 border-b border-[#eef1f3] py-2 last:border-b-0"
                      >
                        <dt className="ecg-texte-doux text-[13.5px] font-semibold">{c.libelle}</dt>
                        <dd className="break-words text-[15px]">
                          {c.liste && c.liste.length ? (
                            <ol className="list-decimal space-y-1 pl-5">
                              {c.liste.map((el, i) => (
                                <li key={i}>{el.length ? el.join(", ") : "Non renseigné"}</li>
                              ))}
                            </ol>
                          ) : (
                            c.valeur
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Panneau>
              ))}
            </div>

            <div className="ecg-pile">
              <Panneau
                titre={
                  <span className="inline-flex items-center gap-2">
                    <FileText size={18} aria-hidden /> PDF de la demande
                  </span>
                }
                sousTitre={`Même document que celui produit au moment de la demande, recréé à partir des données enregistrées${
                  config.pdf === "navigateur" ? " (daté du jour de la demande)" : ""
                }.`}
              >
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={regenerer} className={BOUTON_PRINCIPAL}>
                    {generation ? <IconeChargement size={18} /> : <RefreshCw size={18} aria-hidden />}
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
                    <p role="alert" className="ecg-erreur mt-3">
                      {erreurPdf}
                    </p>
                  )}
                  {pdfUrl && !generation && <p className="ecg-aide mt-3">PDF prêt : aperçu en haut de la page.</p>}
                </div>
              </Panneau>

              <Panneau
                titre={
                  <span className="inline-flex items-center gap-2">
                    <Mail size={18} aria-hidden /> Historique des envois
                  </span>
                }
                corps={Boolean(erreurEnvois || !envois || envois.tableAbsente || envois.envois.length === 0)}
              >
                {erreurEnvois ? (
                  <p role="alert" className="ecg-erreur mt-0">
                    {erreurEnvois}
                  </p>
                ) : !envois ? (
                  <p role="status" className="flex items-center gap-2 text-sm">
                    <IconeChargement size={18} /> Chargement…
                  </p>
                ) : envois.tableAbsente ? (
                  <p className="text-sm">
                    L&apos;historique n&apos;est pas encore activé : la migration <code>site_envois_mails</code> doit être
                    exécutée dans Supabase.
                  </p>
                ) : envois.envois.length === 0 ? (
                  <p className="ecg-texte-doux text-sm">
                    Aucun envoi enregistré pour cette demande. L&apos;historique ne couvre que les demandes reçues depuis
                    sa mise en ligne.
                  </p>
                ) : (
                  <ul className="ecg-lignes">
                    {envois.envois.map((e) => (
                      <li key={e.id} className="grid gap-1 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">{LIBELLES_ENVOI_JOURNAL[e.envoi] ?? e.envoi}</span>
                          {e.statut === "envoye" ? (
                            <Statut ton="ok" icone={CheckCircle}>
                              Envoyé
                            </Statut>
                          ) : (
                            <Statut ton="erreur" icone={AlertTriangle}>
                              Échec
                            </Statut>
                          )}
                        </div>
                        <span className="break-all">{e.destinataire}</span>
                        <span className="ecg-texte-doux ecg-chiffre">{dateHeureBruxelles(e.created_at)}</span>
                        {e.statut !== "envoye" && e.erreur && <span className="ecg-erreur mt-0">{e.erreur}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Panneau>

              <Panneau titre="Signature">
                {detail.signature ? (
                  // eslint-disable-next-line @next/next/no-img-element -- image en data URL, pas d'optimisation possible
                  <img src={detail.signature} alt={`Signature de ${nom}`} className="max-h-40 w-auto max-w-full" />
                ) : (
                  <p className="ecg-texte-doux">Aucune signature enregistrée.</p>
                )}
              </Panneau>

              <Alerte ton="info" icone={Lock} role={null}>
                Données personnelles : réservées au traitement de la demande.
              </Alerte>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
