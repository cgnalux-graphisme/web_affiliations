import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CalendarDays, CircleCheck, Factory, FileText, Network, PencilLine, Tag, UserRound } from "lucide-react";
import { exigerApp } from "../../../../../lib/espace/acces";
import { chargerFicheSuivi } from "../../../../../lib/fiches-suivi/donnees-serveur";
import { libelleDate, paragraphes } from "../../../../../lib/fiches-suivi/regles";
import { QUESTIONS, libelleNature, libelleStatut, libelleType } from "../../../../../lib/fiches-suivi/types";
import { BTN, BTN_PRINCIPAL, EnteteEcran, Panneau, Statut, Vide } from "../../../_partage/ui";
import BoutonPdf from "./BoutonPdf";
import SupprimerFiche from "./SupprimerFiche";

export const metadata: Metadata = { title: "Fiche de suivi — Espace CG", robots: { index: false, follow: false } };

export default async function FichePage({ params }: { params: Promise<{ id: string }> }) {
  await exigerApp("permanents");
  const { id } = await params;
  const lue = await chargerFicheSuivi(id);
  if (!lue) notFound();
  const { fiche: f, modifiable } = lue;
  const texte = paragraphes(f.texte);
  const reponses = QUESTIONS.filter((q) => f[q.cle]?.trim());

  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="clipboard" titre={f.titre?.trim() || "Fiche sans titre"}
        description={f.auteur ? `Fiche de ${f.auteur}` : undefined}
        actions={
          <>
            <BoutonPdf fiche={f} />
            {modifiable && (
              <Link href={`/espace/permanents/fiches/${f.id}/modifier`} className={BTN_PRINCIPAL}>
                <PencilLine size={18} aria-hidden /> Modifier
              </Link>
            )}
          </>
        } />

      <div className="ecg-puces">
        <span className="ecg-puce">{f.type === "usine" ? <Factory size={14} aria-hidden /> : <Network size={14} aria-hidden />} {libelleType(f.type)}</span>
        {f.date_debut && <span className="ecg-puce"><CalendarDays size={14} aria-hidden /> {libelleDate(f.date_debut, f.date_fin)}</span>}
        {f.type === "usine" && f.entreprise && (
          <Link className="ecg-puce" href={`/espace/entreprises/${f.entrepriseCle}`}>
            <Building2 size={14} aria-hidden /> {f.entreprise}{f.site ? ` · ${f.site}` : ""}
          </Link>
        )}
        {f.secteur && <span className="ecg-puce"><Tag size={14} aria-hidden /> {f.secteur}</span>}
        {f.auteur && <span className="ecg-puce"><UserRound size={14} aria-hidden /> {f.auteur}</span>}
        <Statut ton={f.statut === "terminee" ? "ok" : "attente"} icone={f.statut === "terminee" ? CircleCheck : PencilLine}>{libelleStatut(f.statut)}</Statut>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <Panneau titre="Le suivi">
            {texte.length ? (
              <div className="grid max-w-[72ch] gap-3 leading-relaxed">{texte.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>
            ) : (
              <Vide icone="pen" titre="Le texte de la fiche n'est pas encore rédigé.">
                {modifiable ? "Répondez aux questions du suivi, puis utilisez « Rédiger avec l'IA »." : undefined}
              </Vide>
            )}
          </Panneau>
          {reponses.length > 0 && (
            <Panneau titre="En bref" sousTitre="Les réponses du permanent.">
              <dl className="grid gap-3">
                {reponses.map((q) => (
                  <div key={q.cle} className="grid gap-0.5 border-b border-[var(--ecg-trait)] pb-3 last:border-0 last:pb-0 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
                    <dt className="font-semibold">{q.libelle}</dt>
                    <dd className="whitespace-pre-line">{f[q.cle]}</dd>
                  </div>
                ))}
              </dl>
            </Panneau>
          )}
          {f.photos.length > 0 && (
            <Panneau titre={`Photos (${f.photos.length})`}>
              <ul className="grid gap-4 sm:grid-cols-2">
                {f.photos.map((p, i) => (
                  <li key={p.id} className="grid gap-1">
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
                        {/* Lien signé temporaire du bucket privé : pas de next/image. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={p.legende ?? `Photo ${i + 1}`} className="aspect-[3/2] w-full object-cover" />
                      </a>
                    )}
                    {p.legende && <p className="ecg-texte-doux text-sm">{p.legende}</p>}
                  </li>
                ))}
              </ul>
            </Panneau>
          )}
        </div>
        <aside className="grid gap-6" aria-label="Pièces et actions">
          <Panneau titre={`Documents (${f.documents.length})`}>
            {f.documents.length ? (
              <ul className="grid gap-3">
                {f.documents.map((d) => (
                  <li key={d.id} className="grid gap-0.5">
                    <span className="ecg-texte-doux text-xs font-semibold uppercase tracking-wide">{libelleNature(d.nature, d.nature_autre)}</span>
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer" className="ecg-lien inline-flex items-center gap-1 break-all">
                        <FileText size={15} aria-hidden className="flex-none" /> {d.nom_origine}
                        <span className="sr-only">(ouvre le document dans un nouvel onglet)</span>
                      </a>
                    ) : <span>{d.nom_origine}</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="ecg-texte-doux">Aucun document joint.</p>}
          </Panneau>
          {modifiable && (
            <Panneau titre="Gérer">
              <div className="grid gap-3">
                <Link href={`/espace/permanents/fiches/${f.id}/modifier`} className={BTN}><PencilLine size={16} aria-hidden /> Modifier la fiche</Link>
                <SupprimerFiche id={f.id} />
              </div>
            </Panneau>
          )}
        </aside>
      </div>
    </div>
  );
}
