import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, FileDown, FileText, PencilLine, Tag, UserRound, UserRoundCheck } from "lucide-react";
import { isoToDateFr } from "../../../../lib/dates";
import { adresseLieu, libelleDate } from "../../../../lib/liberations/regles";
import { libelleCharge, libelleStatut, libelleType } from "../../../../lib/liberations/types";
import { chargerDossier, exigerLiberations } from "../../../../lib/liberations/donnees-serveur";
import { preparerCourriers, vueCourriers } from "../../../../lib/liberations/courriers-serveur";
import { STATUTS_COURRIERS, STATUTS_JOUR_J, STATUTS_QR } from "../../../../lib/liberations/statuts";
import { chargerJourJ } from "../../../../lib/liberations/jour-j-serveur";
import { manquantsPourCloturer } from "../../../../lib/liberations/cloture";
import { origineSite } from "../../../../lib/liberations/origine-serveur";
import { cleGoogleConfiguree } from "../../../../lib/liberations/google-km";
import CourriersDossier from "./courriers/CourriersDossier";
import JourJDossier from "./jour-j/JourJDossier";
import { Alerte, BTN, BTN_PRINCIPAL, EnteteEcran, Panneau, Vide } from "../../_partage/ui";
import StatutDossier from "../StatutDossier";
import ActionsDossier from "./ActionsDossier";
import ParticipantsLecture from "./ParticipantsLecture";

export const metadata: Metadata = { title: "Dossier de libération — Espace CG", robots: { index: false, follow: false } };

const ouiNon = (b: boolean | null) => (b === null ? "Pas encore précisé" : b ? "Oui" : "Non");
const horodatage = (iso: string) => {
  const d = new Date(iso);
  const date = isoToDateFr(d.toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" }));
  const heure = d.toLocaleTimeString("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  return `${date} à ${heure}`;
};

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const c = await exigerLiberations();
  const { id } = await params;
  const lu = await chargerDossier(id, c);
  if (!lu) notFound();
  const { dossier: d, droits } = lu;
  // Courriers (lot 2) : admins, à partir de la prise en charge.
  const prep = c.admin && STATUTS_COURRIERS.includes(d.statut) ? await preparerCourriers(id, c) : null;
  // Jour J (lot 3) : admins et permanent demandeur (tickets compris, décision de Fred du 14/10/2026).
  const jourJ = STATUTS_JOUR_J.includes(d.statut) ? await chargerJourJ(id, await origineSite(), STATUTS_QR.includes(d.statut)) : null;
  // Clôture (lot 4) : ce qui manque encore, affiché dans la confirmation.
  const manquesCloture = droits.actions.includes("cloturer") && jourJ ? manquantsPourCloturer({
    participants: d.participants.map((p) => ({ id: p.id, nom: [p.prenom, p.nom].filter(Boolean).join(" "), attestationRecue: Boolean(p.attestation_recue_le) })),
    dates: d.dates,
    presences: jourJ.dates.flatMap((x) => x.presences.map((p) => ({ participantId: p.participantId, dateId: x.id, aVerifier: p.aVerifier }))),
    trajets: jourJ.dates.flatMap((x) => x.presences.flatMap((p) => (p.trajet ? [{ mode: p.trajet.mode, km: p.trajet.km, ticketsVerifies: p.trajet.ticketsVerifies, nom: p.nom }] : []))),
    cgFederale: d.perte_salaire === true && d.perte_salaire_charge === "cg_federale",
  }) : [];
  const lieu = adresseLieu(d);
  const lignesOdj = (d.ordre_du_jour ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="calendar-check" titre={d.objet?.trim() || "Demande sans objet"}
        description={`Dossier n° ${d.numero} · ${libelleType(d.type)}`}
        actions={
          <>
            {d.statut !== "brouillon" && (
              <a href={`/api/liberations/${d.id}/dossier`} target="_blank" rel="noreferrer" className={BTN}
                title="Demande, courriers, présences et signatures, frais, tickets et pièces jointes, en un seul PDF">
                <FileDown size={18} aria-hidden /> PDF complet<span className="sr-only"> du dossier (nouvel onglet, quelques secondes)</span>
              </a>
            )}
            {droits.modifiable && (
              <Link href={`/espace/liberations/${d.id}/modifier`} className={BTN_PRINCIPAL}><PencilLine size={18} aria-hidden /> Modifier</Link>
            )}
          </>
        } />

      <div className="ecg-puces">
        <StatutDossier statut={d.statut} />
        <span className="ecg-puce"><UserRound size={14} aria-hidden /> Demandé par {d.demandeur || "—"}</span>
        {d.traitePar && <span className="ecg-puce"><UserRoundCheck size={14} aria-hidden /> Traité par {d.traitePar}</span>}
        {d.secteur && <span className="ecg-puce"><Tag size={14} aria-hidden /> {d.secteur}</span>}
        {d.entreprise && <span className="ecg-puce"><Building2 size={14} aria-hidden /> {d.entreprise}</span>}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <Panneau titre="La réunion">
            <dl className="ecg-recap">
              <div><dt>Type de libération</dt><dd>{libelleType(d.type)}</dd></div>
              <div><dt>Objet</dt><dd>{d.objet || "Pas encore précisé"}</dd></div>
              <div>
                <dt>Date{d.dates.length > 1 ? "s" : ""}</dt>
                <dd>
                  {d.dates.length ? (
                    <ul className="grid gap-0.5 tabular-nums">{d.dates.map((x) => <li key={x.id}>{libelleDate(x)}</li>)}</ul>
                  ) : "Pas encore précisée"}
                </dd>
              </div>
              <div>
                <dt>Lieu</dt>
                <dd>
                  {d.lieu_nom && <b className="block">{d.lieu_nom}</b>}
                  {lieu || (!d.lieu_nom && "Pas encore précisé")}
                  {d.salle && <span className="block">{d.salle}</span>}
                </dd>
              </div>
              {d.commission && <div><dt>Commission paritaire</dt><dd>{d.commission}</dd></div>}
            </dl>
            {lignesOdj.length > 0 && (
              <div className="mt-4 border-t border-[var(--ecg-trait)] pt-4">
                <h3 className="mb-1 font-semibold">Ordre du jour</h3>
                <ul className="list-disc pl-5">{lignesOdj.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
          </Panneau>

          <Panneau titre="Prise en charge">
            <dl className="ecg-recap">
              <div>
                <dt>Perte de salaire</dt>
                <dd>{ouiNon(d.perte_salaire)}{d.perte_salaire && d.perte_salaire_charge ? `, prise en charge par ${libelleCharge(d.perte_salaire_charge).replace(/^L/, "l")}` : ""}</dd>
              </div>
              <div>
                <dt>Dépense introduite à la CG fédérale</dt>
                <dd>{ouiNon(d.introduire_cg_federale)}{d.introduire_cg_federale === false && d.regime_paiement ? ` (régime ${d.regime_paiement})` : ""}</dd>
              </div>
              <div><dt>Lunch prévu</dt><dd>{ouiNon(d.lunch)}</dd></div>
            </dl>
          </Panneau>

          <ParticipantsLecture dossier={d} />

          {prep && <CourriersDossier vue={vueCourriers(prep)} />}

          {jourJ && <JourJDossier vue={jourJ} admin={c.admin} peutQr={c.admin || d.demandeur_id === c.user.id} googleOk={cleGoogleConfiguree()} />}

          <Panneau titre={`Pièces jointes (${d.fichiers.length})`}>
            {d.fichiers.length ? (
              <ul className="grid gap-2">
                {d.fichiers.map((f) => (
                  <li key={f.id}>
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noreferrer" className="ecg-lien inline-flex items-center gap-1 break-all">
                        <FileText size={15} aria-hidden className="flex-none" /> {f.nom_origine}
                        <span className="sr-only">(ouvre le document dans un nouvel onglet)</span>
                      </a>
                    ) : <span>{f.nom_origine}</span>}
                  </li>
                ))}
              </ul>
            ) : <Vide icone="file-text" titre="Aucune pièce jointe." />}
          </Panneau>
        </div>

        <aside className="grid gap-6" aria-label="Suivi du dossier">
          {d.manques.length > 0 && (
            <Alerte ton="attention" titre="À compléter avant les courriers">
              <ul className="list-disc pl-5">{d.manques.map((m) => <li key={m}>{m}</li>)}</ul>
            </Alerte>
          )}
          {(droits.actions.length > 0 || droits.supprimable) && (
            <Panneau titre="Actions">
              <ActionsDossier id={d.id} actions={droits.actions} supprimable={droits.supprimable} manquesCloture={manquesCloture} />
            </Panneau>
          )}
          <Panneau titre="Historique">
            <ol className="grid gap-3">
              {d.historique.map((h) => (
                <li key={h.id} className="grid gap-0.5">
                  <span className="font-semibold">{libelleStatut(h.statut_apres)}</span>
                  <span className="ecg-texte-doux text-sm">{horodatage(h.created_at)}{h.auteur ? ` · ${h.auteur}` : ""}</span>
                </li>
              ))}
            </ol>
          </Panneau>
        </aside>
      </div>
    </div>
  );
}
