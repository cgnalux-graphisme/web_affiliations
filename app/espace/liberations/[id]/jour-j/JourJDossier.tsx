"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, FileImage, PenLine, QrCode, RefreshCw, Save, Settings2, Trash2, UserRoundSearch } from "lucide-react";
import { euros, montantSaisie } from "../../../../../lib/liberations/montants";
import type { VueJourJ, VuePresence } from "../../../../../lib/liberations/jour-j-serveur";
import { corrigerKm, enregistrerTickets, recalculerKm, supprimerPresence, validerPresence } from "../../jour-j-actions";
import { IconeChargement } from "../../../../Chargement";
import { Confirmation, PanneauLateral } from "../../../_partage/Fenetres";
import { Alerte, BTN, BTN_PETIT, BTN_PRINCIPAL, CHAMP, LIBELLE, Panneau, Statut } from "../../../_partage/ui";
import BoutonQr from "./BoutonQr";

const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).replace(":", "h");
const km = (n: number | null) => (n === null ? "" : `${n.toFixed(1).replace(".", ",")} km`);

/**
 * Jour J d'un dossier : QR code (admin ou permanent demandeur), présences signées par date, trajets, kilomètres
 * remboursés, tickets de train, totaux des frais. Gestion (valider, corriger, supprimer) : admins.
 */
export default function JourJDossier({ vue, admin, peutQr, googleOk }: { vue: VueJourJ; admin: boolean; peutQr: boolean; googleOk: boolean }) {
  return (
    <Panneau titre="Jour J : présences et frais" id="jour-j"
      sousTitre="Chaque participant signe avec son téléphone en scannant le QR code, de 08h00 à 18h00, chaque jour de la réunion.">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {vue.qr ? (
            <Link href={`/espace/liberations/${vue.dossierId}/qr`} className={BTN_PRINCIPAL}><QrCode size={16} aria-hidden /> Afficher le QR code</Link>
          ) : peutQr && vue.qrActif ? (
            <BoutonQr dossierId={vue.dossierId} existe={false} />
          ) : (
            <span className="ecg-texte-doux">Pas de QR code.</span>
          )}
        </div>
        {admin && !googleOk && <Alerte ton="attention">Le calcul automatique des kilomètres n&apos;est pas encore configuré (clé Google Maps) : saisissez les kilomètres à la main.</Alerte>}
        {vue.tauxManquant && <Alerte ton="attention">Aucun taux kilométrique pour une date du dossier : ajoutez-le dans Paramètres.</Alerte>}

        {vue.dates.map((d) => (
          <section key={d.id} className="grid gap-2" aria-labelledby={`date-${d.id}`}>
            <h3 id={`date-${d.id}`} className="font-semibold tabular-nums">
              {d.libelle} · {d.presences.length} signature{d.presences.length > 1 ? "s" : ""}
            </h3>
            {d.presences.length > 0 && (
              <ul className="ecg-lignes">
                {d.presences.map((p) => <LignePresence key={p.id} p={p} admin={admin} />)}
              </ul>
            )}
            {d.absents.length > 0 && <p className="ecg-texte-doux text-sm">Pas de signature : {d.absents.join(", ")}.</p>}
          </section>
        ))}

        {vue.totaux.length > 0 && (
          <div className="ecg-tableau-cadre">
            <table className="ecg-tableau">
              <caption className="sr-only">Frais de déplacement par participant</caption>
              <thead>
                <tr><th scope="col">Participant</th><th scope="col">Km remboursés</th><th scope="col">Montant km</th><th scope="col">Tickets</th><th scope="col">Total</th></tr>
              </thead>
              <tbody>
                {vue.totaux.map((t) => (
                  <tr key={t.nom}>
                    <td>{t.nom}</td><td className="tabular-nums">{km(t.km)}</td><td className="tabular-nums">{euros(t.montantKm)}</td>
                    <td className="tabular-nums">{euros(t.tickets)}</td><td className="font-semibold tabular-nums">{euros(Math.round((t.montantKm + t.tickets) * 100) / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panneau>
  );
}

function LignePresence({ p, admin }: { p: VuePresence; admin: boolean }) {
  const t = p.trajet;
  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4">
      <div className="grid min-w-0 gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <b>{p.nom}</b>
          <span className="ecg-texte-doux text-sm">signé à {heure(p.signeLe)}</span>
          {p.horsListe && <Statut ton="attente" icone={UserRoundSearch}>Pas dans la liste{p.entrepriseSaisie ? ` · ${p.entrepriseSaisie}` : ""}</Statut>}
          {p.aVerifier && !p.horsListe && <Statut ton="attente" icone={CircleAlert}>À vérifier (carte sans n° de registre national)</Statut>}
        </span>
        {t && (
          <span className="ecg-texte-doux text-sm">
            {t.libelleMode}
            {t.mode !== "covoit_passager" && t.mode !== "train" ? ` · départ : ${t.depart}` : ""}
            {t.etape ? ` · ${t.mode === "voiture_train" ? "gare" : "rendez-vous"} : ${t.etape}` : ""}
            {t.conducteur ? ` · conducteur : ${t.conducteur}` : ""}
          </span>
        )}
        {t && (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            {t.km !== null && <span className="tabular-nums">{km(t.km)}{t.kmManuel ? " (corrigé)" : ""}{t.montantKm !== null ? ` · ${euros(t.montantKm)}` : ""}</span>}
            {t.kmErreur && <Statut ton="erreur" icone={CircleAlert}>{t.kmErreur}</Statut>}
            {t.tickets.map((x, i) => x.url && (
              <a key={x.id} href={x.url} target="_blank" rel="noreferrer" className="ecg-lien inline-flex items-center gap-1">
                <FileImage size={14} aria-hidden /> Ticket {i + 1}<span className="sr-only"> de {p.nom}</span>
              </a>
            ))}
            {t.montantTickets !== null && <span className="tabular-nums">tickets : {euros(t.montantTickets)}</span>}
            {t.ticketsVerifies && <Statut ton="ok" icone={CircleCheck}>Tickets vérifiés</Statut>}
          </span>
        )}
      </div>
      <div className="flex items-start gap-2">
        {p.signatureUrl && (
          // Lien signé temporaire du bucket privé : pas de next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.signatureUrl} alt={`Signature de ${p.nom}`} className="h-12 w-28 rounded border border-[var(--ecg-trait)] bg-white object-contain" />
        )}
        {admin && <GererPresence p={p} />}
      </div>
    </li>
  );
}

function GererPresence({ p }: { p: VuePresence }) {
  const router = useRouter();
  const t = p.trajet;
  const [ouvert, setOuvert] = useState(false);
  const [kmSaisi, setKmSaisi] = useState(t?.km !== null && t?.km !== undefined ? montantSaisie(t.km).replace(/0$/, "") : "");
  const [montant, setMontant] = useState(montantSaisie(t?.montantTickets ?? null));
  const [verifies, setVerifies] = useState(Boolean(t?.ticketsVerifies));
  const [enCours, setEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);
  const [supprimer, setSupprimer] = useState(false);

  async function agir(cle: string, action: () => Promise<{ ok: true; message?: string } | { ok: false; erreur: string }>, fermer?: () => void) {
    setEnCours(cle);
    setMessage(null);
    const r = await action().catch(() => ({ ok: false as const, erreur: "Le serveur n'a pas répondu. Réessayez." }));
    setEnCours(null);
    setMessage(r.ok ? { ton: "ok", texte: r.message ?? "C'est fait." } : { ton: "erreur", texte: r.erreur });
    if (r.ok && fermer) fermer();
    router.refresh();
  }

  return (
    <>
      <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => setOuvert(true)}>
        <Settings2 size={15} aria-hidden /> Gérer<span className="sr-only"> la présence de {p.nom}</span>
      </button>
      <PanneauLateral ouvert={ouvert} onFermer={() => setOuvert(false)} titre={p.nom} sousTitre={`Signé à ${heure(p.signeLe)}`}>
        {(fermer) => (
          <div className="grid gap-5">
            {p.aVerifier && (
              <div className="grid gap-2">
                <Alerte ton="attention">{p.horsListe ? "Cette personne n'était pas dans la liste des participants." : "La carte du délégué n'a pas de n° de registre national : l'identité n'a pas pu être vérifiée."}</Alerte>
                <div>
                  <button type="button" className={BTN_PRINCIPAL} disabled={enCours !== null} onClick={() => agir("valider", () => validerPresence(p.id))}>
                    {enCours === "valider" ? <IconeChargement size={16} /> : <CircleCheck size={16} aria-hidden />} Confirmer la présence
                  </button>
                </div>
              </div>
            )}
            {t && (
              <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); agir("km", () => corrigerKm(t.id, kmSaisi)); }}>
                <label htmlFor={`km-${p.id}`} className={LIBELLE}>Kilomètres remboursés (aller-retour)</label>
                <div className="flex flex-wrap gap-2">
                  <input id={`km-${p.id}`} className={`${CHAMP} ecg-chiffre w-32`} inputMode="decimal" value={kmSaisi} onChange={(e) => setKmSaisi(e.target.value)} />
                  <button type="submit" className={BTN} disabled={enCours !== null}>{enCours === "km" ? <IconeChargement size={16} /> : <PenLine size={16} aria-hidden />} Corriger</button>
                  <button type="button" className={BTN} disabled={enCours !== null} onClick={() => agir("calcul", () => recalculerKm(t.id))}>
                    {enCours === "calcul" ? <IconeChargement size={16} /> : <RefreshCw size={16} aria-hidden />} Recalculer
                  </button>
                </div>
              </form>
            )}
            {t && (t.mode === "train" || t.mode === "voiture_train" || t.tickets.length > 0) && (
              <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); agir("tickets", () => enregistrerTickets(t.id, montant, verifies)); }}>
                <label htmlFor={`tickets-${p.id}`} className={LIBELLE}>Montant des tickets de train (€)</label>
                <input id={`tickets-${p.id}`} className={`${CHAMP} ecg-chiffre w-32`} inputMode="decimal" placeholder="0,00" value={montant} onChange={(e) => setMontant(e.target.value)} />
                <label className={`ecg-choix${verifies ? " ecg-choix-actif" : ""}`}>
                  <input type="checkbox" checked={verifies} onChange={(e) => setVerifies(e.target.checked)} /> Tickets vérifiés
                </label>
                <div><button type="submit" className={BTN} disabled={enCours !== null}>{enCours === "tickets" ? <IconeChargement size={16} /> : <Save size={16} aria-hidden />} Enregistrer</button></div>
              </form>
            )}
            {message && <p role={message.ton === "erreur" ? "alert" : "status"} className={message.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>{message.texte}</p>}
            <div className="border-t border-[var(--ecg-trait)] pt-4">
              <button type="button" className={`${BTN} ecg-btn-fantome ecg-btn-fantome-danger`} onClick={() => setSupprimer(true)}>
                <Trash2 size={16} aria-hidden /> Supprimer cette présence
              </button>
            </div>
            <Confirmation ouverte={supprimer} danger titre="Supprimer cette présence ?" libelleConfirmer="Supprimer"
              onAnnuler={() => setSupprimer(false)} onConfirmer={() => { setSupprimer(false); agir("supprimer", () => supprimerPresence(p.id), fermer); }}>
              <p>La signature, le trajet et les tickets de {p.nom} pour ce jour seront supprimés. C&apos;est définitif.</p>
            </Confirmation>
          </div>
        )}
      </PanneauLateral>
    </>
  );
}
