import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { chargerCarte } from "../../../../lib/delegues/donnees-serveur";
import { LIBELLES_COMPTE } from "../../../../lib/delegues/delegue";
import { isoToDateFr } from "../../../../lib/dates";
import { Alerte, EnteteEcran, Panneau } from "../../_partage/ui";
import PanneauIdentite from "./PanneauIdentite";
import PanneauMandats from "./PanneauMandats";

export const metadata: Metadata = { title: "Délégué — Espace CG", robots: { index: false, follow: false } };

const dateHeure = (iso: string) => `${isoToDateFr(iso.slice(0, 10))} ${new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" })}`;

export default async function CartePage({ params }: { params: Promise<{ id: string }> }) {
  await exigerSuperAdmin();
  const { id } = await params;
  const carte = await chargerCarte(id);
  if (!carte) notFound();
  const { delegue: d, compte } = carte;
  const nom = [d.prenom, d.nom].filter(Boolean).join(" ");

  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="id-card" titre={nom} description={carte.entrepriseNom} />
      {d.a_verifier && <Alerte ton="attention" titre="À vérifier">{d.a_verifier}</Alerte>}
      <div className="flex flex-wrap gap-4">
        {d.email && <a className="ecg-lien inline-flex items-center gap-1" href={`mailto:${d.email}`}><Mail size={16} aria-hidden /> {d.email}</a>}
        {d.telephone && <a className="ecg-lien inline-flex items-center gap-1" href={`tel:${d.telephone.replace(/\s/g, "")}`}><Phone size={16} aria-hidden /> {d.telephone}</a>}
      </div>
      <PanneauIdentite carte={carte} />
      <PanneauMandats carte={carte} />
      <Panneau titre="Compte CG Link" sousTitre="Lecture seule : l'invitation et le blocage arrivent avec le plan 2b.">
        <p><b>{LIBELLES_COMPTE[compte.etat]}</b></p>
        {compte.invitedAt && <p className="text-sm">Invité le {isoToDateFr(new Date(compte.invitedAt).toISOString().slice(0, 10))}</p>}
        {compte.derniereConnexion && <p className="text-sm">Dernière connexion : {dateHeure(compte.derniereConnexion)}</p>}
      </Panneau>
      {carte.journal.length > 0 && (
        <Panneau titre="Historique">
          <ul className="grid gap-1 text-sm">
            {carte.journal.map((j) => <li key={j.id}><span className="ecg-texte-doux">{dateHeure(j.created_at)}</span> · {j.phrase}</li>)}
          </ul>
        </Panneau>
      )}
    </div>
  );
}
