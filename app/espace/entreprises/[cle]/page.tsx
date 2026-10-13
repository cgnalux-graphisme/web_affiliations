import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Users } from "lucide-react";
import { exigerApp, monProfil } from "../../../../lib/espace/acces";
import { chargerFiche, type Affilies } from "../../../../lib/entreprises/donnees-serveur";
import { nomAffiche } from "../../../../lib/entreprises/regles";
import { Alerte, Panneau } from "../../_partage/ui";
import EnTeteFiche from "./EnTeteFiche";
import PanneauCourrier from "./PanneauCourrier";
import PanneauIdentite from "./PanneauIdentite";
import PanneauSites from "./PanneauSites";
import PanneauUnites from "./PanneauUnites";
import PanneauOnss from "./PanneauOnss";

/** La lecture de la BCE peut prendre jusqu'à 45 s (deux lectures pour un enregistrement). */
export const maxDuration = 120;

export const metadata: Metadata = { title: "Entreprise — Espace CG", robots: { index: false, follow: false } };

/** Affiliés actifs : total et répartition par type de contrat (barres doublées du nombre, jamais la couleur seule). */
function CarteAffilies({ affilies }: { affilies: Affilies }) {
  const max = Math.max(1, ...affilies.parContrat.map((p) => p.nombre));
  return (
    <Panneau id="affilies" className="ecg-section" titre="Affiliés" sousTitre="Actifs dans CG Link, lus à l'ouverture de la page.">
      <p className="flex items-center gap-3">
        <span className="ecg-stat-ico bg-[var(--app-pale)]" aria-hidden><Users size={18} /></span>
        <span className="font-condensed text-4xl font-bold tabular-nums">{affilies.total}</span>
      </p>
      {affilies.parContrat.length > 0 && (
        <ul className="mt-4 grid gap-2.5 text-sm">
          {affilies.parContrat.map((p) => (
            <li key={p.type}>
              <div className="flex justify-between gap-2"><span>{p.type}</span><b className="tabular-nums">{p.nombre}</b></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--ecg-fond)]" aria-hidden>
                <div className="h-full rounded-full bg-[var(--app)]" style={{ width: `${Math.round((p.nombre / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panneau>
  );
}

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
  // Une entreprise CG Link qui a déjà sa fiche s'ouvre toujours à l'adresse de la fiche.
  if (cle.startsWith("c-") && f.fiche) redirect(`/espace/entreprises/${f.fiche.id}`);
  const nom = nomAffiche(f.fiche, f.company);
  const superAdmin = profil?.role === "SUPER_ADMIN";

  return (
    <div className="ecg-ecran">
      <EnTeteFiche fiche={f} nom={nom} cle={cle} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-6">
          <PanneauSites fiche={f} superAdmin={superAdmin} />
          <PanneauUnites fiche={f} />
          <PanneauOnss fiche={f} />
          <PanneauIdentite fiche={f} />
        </div>
        <aside className="grid gap-6 lg:sticky lg:top-6" aria-label="Courrier et affiliés">
          <PanneauCourrier fiche={f} />
          {f.affilies && <CarteAffilies affilies={f.affilies} />}
        </aside>
      </div>
    </div>
  );
}
