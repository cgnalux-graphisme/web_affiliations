"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Clock, FileText, Mail, Printer, Send, Undo2 } from "lucide-react";
import { isoToDateFr } from "../../../../../lib/dates";
import { GENRES_COURRIER, type GenreCourrier } from "../../../../../lib/liberations/courriers";
import type { VueCourrier, VueCourriers, VueParticipantCourriers } from "../../../../../lib/liberations/courriers-serveur";
import { envoyerCourrier, envoyerTous, marquerImprime } from "../../courriers-actions";
import { enregistrerDossier } from "../../actions";
import { IconeChargement } from "../../../../Chargement";
import { Alerte, BTN, BTN_PETIT, CHAMP, LIBELLE, Panneau, Statut } from "../../../_partage/ui";
import TexteCourrier from "./TexteCourrier";
import PaiementParticipant from "./PaiementParticipant";

const dateHeure = (iso: string) => isoToDateFr(new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" }));

function EtatCourrier({ c }: { c: VueCourrier }) {
  if (c.statut === "envoye") return <Statut ton="ok" icone={CircleCheck}>Envoyé{c.envoye_le ? ` le ${dateHeure(c.envoye_le)}` : ""}{c.destinataire ? ` à ${c.destinataire}` : ""}</Statut>;
  if (c.statut === "imprime") return <Statut ton="ok" icone={Printer}>Imprimé{c.envoye_le ? ` le ${dateHeure(c.envoye_le)}` : ""}</Statut>;
  if (c.statut === "echec") return <Statut ton="erreur" icone={CircleAlert}>Échec de l&apos;envoi{c.erreur ? ` : ${c.erreur}` : ""}</Statut>;
  return <Statut ton="attente" icone={Clock}>À envoyer</Statut>;
}

/**
 * Courriers d'un dossier pris en charge (admins) : pour chaque participant, la lettre à l'employeur, la convocation et
 * l'attestation de présence (PDF, texte retouchable, envoi par e-mail ou « imprimé ») ; si la CG fédérale paie la perte
 * de salaire : l'attestation de perte de salaire, le paiement et la fiche de paiement.
 */
export default function CourriersDossier({ vue }: { vue: VueCourriers }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);
  const [conseil, setConseil] = useState(vue.conseil);
  const pdf = (doc: string, participant: string) => `/api/liberations/${vue.dossierId}/pdf?doc=${doc}&participant=${participant}`;

  async function agir(cle: string, action: () => Promise<{ ok: true; message?: string } | { ok: false; erreur: string }>) {
    setEnCours(cle);
    setMessage(null);
    const r = await action().catch(() => ({ ok: false as const, erreur: "Le serveur n'a pas répondu. Réessayez." }));
    setEnCours(null);
    setMessage(r.ok ? { ton: "ok", texte: r.message ?? "C'est fait." } : { ton: "erreur", texte: r.erreur });
    router.refresh();
  }

  const aEnvoyer = (g: "lettre_employeur" | "convocation") =>
    vue.participants.filter((p) => !["envoye", "imprime"].includes(p.courriers[g].statut) && p.courriers[g].email).length;

  const groupe = (g: "lettre_employeur" | "convocation", libelle: string) => (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={BTN} disabled={enCours !== null || !aEnvoyer(g)}
        onClick={() => agir(`tous-${g}`, () => envoyerTous(vue.dossierId, g))}>
        {enCours === `tous-${g}` ? <IconeChargement size={16} /> : <Send size={16} aria-hidden />} Envoyer les {libelle} par e-mail ({aEnvoyer(g)})
      </button>
      <a className={BTN} href={pdf(g, "tous")} target="_blank" rel="noreferrer">
        <Printer size={16} aria-hidden /> Imprimer toutes les {libelle}<span className="sr-only"> (PDF, nouvel onglet)</span>
      </a>
    </div>
  );

  return (
    <Panneau titre="Courriers" id="courriers"
      sousTitre={vue.enAttente
        ? `${vue.enAttente} courrier${vue.enAttente > 1 ? "s" : ""} (lettres et convocations) encore à envoyer ou à imprimer.`
        : "Lettres et convocations envoyées ou imprimées : le dossier peut passer à « Libération envoyée »."}>
      <div className="grid gap-4">
        {vue.alertes.map((a) => <Alerte key={a} ton="attention">{a}</Alerte>)}
        {groupe("lettre_employeur", "lettres")}
        {groupe("convocation", "convocations")}
        <div className="flex flex-wrap gap-2">
          <a className={BTN} href={pdf("attestation_presence", "tous")} target="_blank" rel="noreferrer">
            <FileText size={16} aria-hidden /> Toutes les attestations de présence
          </a>
          {vue.cgFederale && (
            <a className={BTN} href={pdf("attestation_perte", "tous")} target="_blank" rel="noreferrer">
              <FileText size={16} aria-hidden /> Toutes les attestations de perte de salaire
            </a>
          )}
        </div>

        {vue.cgFederale && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); agir("conseil", () => enregistrerDossier(vue.dossierId, { conseil })); }}>
            <div className="min-w-[240px] flex-1">
              <label htmlFor="conseil" className={LIBELLE}>Conseil (fiche de paiement)</label>
              <input id="conseil" className={CHAMP} value={conseil} maxLength={300} onChange={(e) => setConseil(e.target.value)} />
            </div>
            <button type="submit" className={BTN} disabled={enCours !== null || conseil === vue.conseil}>
              {enCours === "conseil" && <IconeChargement size={16} />} Enregistrer
            </button>
          </form>
        )}

        {message && <p role={message.ton === "erreur" ? "alert" : "status"} className={message.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>{message.texte}</p>}

        <ul className="grid gap-3">
          {vue.participants.map((p) => (
            <li key={p.id} className="rounded-xl border border-[var(--ecg-trait)] p-3">
              <p className="mb-2"><b>{p.nom}</b> <span className="ecg-texte-doux">· {p.entreprise}</span></p>
              <ul className="ecg-lignes">
                {GENRES_COURRIER.map((g) => (
                  <LigneCourrier key={g.code} p={p} genre={g.code} libelle={g.libelle} enCours={enCours} pdf={pdf(g.code, p.id)} agir={agir} />
                ))}
                {vue.cgFederale && p.paiement && (
                  <li className="grid gap-2 py-2 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center">
                    <span className="font-semibold">Perte de salaire</span>
                    <span>
                      {p.paiement.recue
                        ? <Statut ton="ok" icone={CircleCheck}>Attestation reçue</Statut>
                        : <Statut ton="attente" icone={Clock}>Attestation attendue</Statut>}
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <a className={`${BTN} ${BTN_PETIT}`} href={pdf("attestation_perte", p.id)} target="_blank" rel="noreferrer">
                        <FileText size={15} aria-hidden /> Attestation<span className="sr-only"> de perte de salaire de {p.nom}</span>
                      </a>
                      <PaiementParticipant participant={p} dates={vue.dates} />
                      <a className={`${BTN} ${BTN_PETIT}`} href={pdf("fiche_paiement", p.id)} target="_blank" rel="noreferrer">
                        <FileText size={15} aria-hidden /> Fiche de paiement<span className="sr-only"> de {p.nom}</span>
                      </a>
                    </span>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </Panneau>
  );
}

function LigneCourrier({ p, genre, libelle, enCours, pdf, agir }: {
  p: VueParticipantCourriers;
  genre: GenreCourrier;
  libelle: string;
  enCours: string | null;
  pdf: string;
  agir: (cle: string, action: () => Promise<{ ok: true; message?: string } | { ok: false; erreur: string }>) => void;
}) {
  const c = p.courriers[genre];
  const fait = c.statut === "envoye" || c.statut === "imprime";
  const cle = `${p.id}-${genre}`;
  const envoyable = genre !== "attestation_presence";
  return (
    <li className="grid gap-2 py-2 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center">
      <span className="font-semibold">{libelle}</span>
      <span className="min-w-0">{envoyable ? <EtatCourrier c={c} /> : <span className="ecg-texte-doux text-sm">Après la réunion</span>}</span>
      <span className="flex flex-wrap gap-2">
        <a className={`${BTN} ${BTN_PETIT}`} href={pdf} target="_blank" rel="noreferrer">
          <FileText size={15} aria-hidden /> PDF<span className="sr-only"> : {libelle}, {p.nom}</span>
        </a>
        <TexteCourrier participantId={p.id} nom={p.nom} genre={genre} libelle={libelle} texte={c.texte} retouche={c.retouche} />
        {envoyable && !fait && (
          c.email ? (
            <button type="button" className={`${BTN} ${BTN_PETIT}`} disabled={enCours !== null} title={`Envoyer à ${c.email}`}
              onClick={() => agir(`e-${cle}`, () => envoyerCourrier(p.id, genre))}>
              {enCours === `e-${cle}` ? <IconeChargement size={15} /> : <Mail size={15} aria-hidden />} Envoyer
              <span className="sr-only"> à {c.email}</span>
            </button>
          ) : <span className="ecg-texte-doux self-center text-sm">Pas d&apos;e-mail</span>
        )}
        {envoyable && !fait && (
          <button type="button" className={`${BTN} ${BTN_PETIT}`} disabled={enCours !== null} onClick={() => agir(`i-${cle}`, () => marquerImprime(p.id, genre, true))}>
            {enCours === `i-${cle}` ? <IconeChargement size={15} /> : <Printer size={15} aria-hidden />} Imprimé
          </button>
        )}
        {envoyable && c.statut === "imprime" && (
          <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome`} disabled={enCours !== null} onClick={() => agir(`a-${cle}`, () => marquerImprime(p.id, genre, false))}>
            <Undo2 size={15} aria-hidden /> Annuler « imprimé »
          </button>
        )}
      </span>
    </li>
  );
}
