import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { chargerListeDelegues } from "../../../../lib/delegues/donnees-serveur";
import { Alerte, BTN_PRINCIPAL, EnteteEcran } from "../../_partage/ui";
import ListeDelegues from "./ListeDelegues";

export const metadata: Metadata = { title: "Délégués — Espace CG", robots: { index: false, follow: false } };

export default async function ListePage() {
  await exigerSuperAdmin();
  const r = await chargerListeDelegues();
  return (
    <div className="ecg-ecran">
      <EnteteEcran icone="id-card" titre="Délégués"
        description={r.ok ? `${r.lignes.length} délégué${r.lignes.length > 1 ? "s" : ""}.` : undefined}
        actions={<Link href="/espace/delegues/nouveau" className={BTN_PRINCIPAL}><Plus size={18} aria-hidden /> Nouveau délégué</Link>} />
      {r.ok ? <ListeDelegues lignes={r.lignes} entreprises={r.entreprises} /> : <Alerte ton="erreur">{r.erreur}</Alerte>}
    </div>
  );
}
