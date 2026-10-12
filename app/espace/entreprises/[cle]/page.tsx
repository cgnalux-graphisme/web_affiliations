import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Upload, Users } from "lucide-react";
import { exigerApp, monProfil } from "../../../../lib/espace/acces";
import { chargerFiche } from "../../../../lib/entreprises/donnees-serveur";
import { nomAffiche } from "../../../../lib/entreprises/regles";
import { isoToDateFr } from "../../../../lib/dates";
import { Alerte, BTN, EnteteEcran, Panneau } from "../../_partage/ui";
import PanneauIdentite from "./PanneauIdentite";
import PanneauSiege from "./PanneauSiege";
import PanneauSites from "./PanneauSites";
import PanneauUnites from "./PanneauUnites";
import PanneauOnss from "./PanneauOnss";

export const metadata: Metadata = { title: "Entreprise — Espace CG", robots: { index: false, follow: false } };

export default async function FichePage({ params }: { params: Promise<{ cle: string }> }) {
  await exigerApp("entreprises");
  const { cle } = await params;
  const [r, profil] = await Promise.all([chargerFiche(cle), monProfil()]);
  if (!r.ok && r.raison === "introuvable") notFound();
  if (!r.ok) {
    return (
      <div className="ecg-ecran">
        <Alerte ton="erreur" titre="Fiche indisponible">
          {r.raison === "tables" ? "Les tables de l'app ne sont pas encore créées (migration 20261012120000)." : "La base n'a pas répondu. Rechargez la page."}
        </Alerte>
      </div>
    );
  }
  const f = r.fiche;
  const nom = nomAffiche(f.fiche, f.company);
  const superAdmin = profil?.role === "SUPER_ADMIN";

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone="building"
        titre={nom}
        description={f.fiche?.denomination_bce ?? (f.fiche?.bce_importe_le ? undefined : "Dénomination BCE non importée.")}
        actions={
          <Link href={`/espace/entreprises/${cle}/bce`} className={BTN}>
            <Upload size={18} aria-hidden /> Importer depuis la BCE
          </Link>
        }
      />
      {f.fiche?.bce_importe_le && (
        <p className="ecg-texte-doux text-sm">Dernier import BCE : {isoToDateFr(f.fiche.bce_importe_le.slice(0, 10))}</p>
      )}
      <PanneauIdentite fiche={f} />
      <PanneauSiege fiche={f} />
      <PanneauSites fiche={f} superAdmin={superAdmin} />
      <PanneauUnites fiche={f} />
      <PanneauOnss fiche={f} />
      {f.affilies && (
        <Panneau titre="Affiliés" sousTitre="Affiliés actifs dans CG Link, lus à l'ouverture de la page.">
          <p className="flex items-center gap-2 text-2xl font-bold">
            <Users size={22} aria-hidden /> {f.affilies.total}
          </p>
          {f.affilies.parContrat.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {f.affilies.parContrat.map((p) => <li key={p.type}>{p.type} : <b>{p.nombre}</b></li>)}
            </ul>
          )}
        </Panneau>
      )}
    </div>
  );
}
