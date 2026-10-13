import type { Metadata } from "next";
import Link from "next/link";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { chargerAVerifier } from "../../../../lib/delegues/donnees-serveur";
import { EnteteEcran, Panneau, Vide } from "../../_partage/ui";
import BoutonConfirmer from "./BoutonConfirmer";

export const metadata: Metadata = { title: "À vérifier — Espace CG", robots: { index: false, follow: false } };

export default async function AVerifierPage() {
  await exigerSuperAdmin();
  const { delegues, mandats } = await chargerAVerifier();
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="flag" titre="À vérifier" description="Ce que l'import n'a pas pu trancher seul. Confirmez, ou corrigez sur la carte du délégué." />
      {delegues.length + mandats.length === 0 && <Vide icone="flag" titre="Rien à vérifier." />}
      {delegues.length > 0 && (
        <Panneau titre={`Délégués (${delegues.length})`} corps={false}>
          <ul className="ecg-lignes">
            {delegues.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-2">
                <Link className="ecg-lien font-semibold" href={`/espace/delegues/${d.id}`}>{d.nom}</Link>
                <span className="ecg-texte-doux">{d.entreprise}</span>
                <span className="min-w-0 flex-1 text-sm">{d.raison}</span>
                <BoutonConfirmer type="delegue" id={d.id} />
              </li>
            ))}
          </ul>
        </Panneau>
      )}
      {mandats.length > 0 && (
        <Panneau titre={`Mandats (${mandats.length})`} corps={false}>
          <ul className="ecg-lignes">
            {mandats.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2">
                <Link className="ecg-lien font-semibold" href={`/espace/delegues/${m.delegueId}`}>{m.delegue}</Link>
                <b>{m.mandat}</b>
                <span className="min-w-0 flex-1 text-sm">{m.raison}</span>
                <BoutonConfirmer type="mandat" id={m.id} />
              </li>
            ))}
          </ul>
        </Panneau>
      )}
    </div>
  );
}
