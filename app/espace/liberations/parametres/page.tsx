import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { exigerAdminLiberations, lieux, tauxKm } from "../../../../lib/liberations/donnees-serveur";
import { equipe } from "../../../../lib/liberations/courriers-serveur";
import { Alerte, BTN, EnteteEcran } from "../../_partage/ui";
import Lieux from "./Lieux";
import TauxKm from "./TauxKm";
import Equipe from "./Equipe";

export const metadata: Metadata = { title: "Paramètres des libérations — Espace CG", robots: { index: false, follow: false } };

/** Paramètres de l'app Libérations : lieux, taux kilométrique, équipe (signatures, correspondants). Admins (ADMIN_OP, SUPER_ADMIN). */
export default async function ParametresPage() {
  await exigerAdminLiberations();
  const [listeLieux, listeTaux, membres] = await Promise.all([lieux(), tauxKm(), equipe()]);
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="sliders" titre="Paramètres des libérations"
        description="Les lieux proposés dans les demandes, le taux kilométrique et les signatures des courriers."
        actions={<Link href="/espace/liberations/parametres/modeles" className={BTN}><Mail size={18} aria-hidden /> Modèles de courriers</Link>} />
      {listeLieux && listeTaux ? (
        <>
          <Lieux lieux={listeLieux} />
          <TauxKm taux={listeTaux} />
        </>
      ) : (
        <Alerte ton="erreur" titre="Paramètres indisponibles">
          La base n&apos;a pas répondu, ou les tables des libérations ne sont pas encore créées (migration 20261013130000).
        </Alerte>
      )}
      {membres ? <Equipe membres={membres} /> : <Alerte ton="erreur">La liste de l&apos;équipe n&apos;a pas pu être lue. Rechargez la page.</Alerte>}
    </div>
  );
}
