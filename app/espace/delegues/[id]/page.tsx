import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { formaterTelephone } from "../../../../lib/telephone";
import { exigerAccesDelegues } from "../../../../lib/permanents/perimetre-serveur";
import { chargerCarte } from "../../../../lib/delegues/donnees-serveur";
import { isoToDateFr } from "../../../../lib/dates";
import { Alerte, EnteteEcran, Panneau } from "../../_partage/ui";
import PanneauIdentite from "./PanneauIdentite";
import PanneauMandats from "./PanneauMandats";
import PanneauCompte from "./PanneauCompte";
import PanneauEcarts from "./PanneauEcarts";

export const metadata: Metadata = { title: "Délégué — Espace CG", robots: { index: false, follow: false } };

const dateHeure = (iso: string) => `${isoToDateFr(iso.slice(0, 10))} ${new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" })}`;

export default async function CartePage({ params }: { params: Promise<{ id: string }> }) {
  const acces = await exigerAccesDelegues();
  const { id } = await params;
  const carte = await chargerCarte(id, acces);
  if (!carte) notFound();
  const { delegue: d } = carte;
  const nom = [d.prenom, d.nom].filter(Boolean).join(" ");
  const adresse = [
    [d.adresse_rue, d.adresse_numero].filter(Boolean).join(" ") + (d.adresse_boite ? ` bte ${d.adresse_boite}` : ""),
    [d.adresse_code_postal, d.adresse_localite].filter(Boolean).join(" "),
    d.adresse_pays && !/^belgique$/i.test(d.adresse_pays) ? d.adresse_pays : "",
  ].filter((x) => x.trim()).join(", ");

  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="id-card" titre={nom} description={carte.entrepriseNom} />
      {d.a_verifier && <Alerte ton="attention" titre="À vérifier">{d.a_verifier}</Alerte>}
      <div className="flex flex-wrap gap-4">
        {d.email && <a className="ecg-lien inline-flex items-center gap-1" href={`mailto:${d.email}`}><Mail size={16} aria-hidden /> {d.email}</a>}
        {d.telephone && (
          <a className="ecg-lien inline-flex items-center gap-1" href={`tel:${formaterTelephone(d.telephone).replace(/\s|\(0\)/g, "")}`}>
            <Phone size={16} aria-hidden /> {formaterTelephone(d.telephone)}
          </a>
        )}
        {adresse && <span className="inline-flex items-center gap-1"><MapPin size={16} aria-hidden /> {adresse}</span>}
      </div>
      <PanneauIdentite carte={carte} />
      <PanneauMandats carte={carte} />
      <PanneauEcarts carte={carte} />
      {/* Paramètres de connexion (compte CG Link) : SUPER_ADMIN uniquement, jamais affichés aux autres. */}
      {acces.tout && <PanneauCompte carte={carte} />}
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
