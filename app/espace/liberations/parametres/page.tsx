import type { Metadata } from "next";
import { exigerAdminLiberations, lieux, tauxKm } from "../../../../lib/liberations/donnees-serveur";
import { Alerte, EnteteEcran } from "../../_partage/ui";
import Lieux from "./Lieux";
import TauxKm from "./TauxKm";

export const metadata: Metadata = { title: "Paramètres des libérations — Espace CG", robots: { index: false, follow: false } };

/** Paramètres de l'app Libérations : lieux des réunions et taux kilométrique. Admins (ADMIN_OP, SUPER_ADMIN). */
export default async function ParametresPage() {
  await exigerAdminLiberations();
  const [listeLieux, listeTaux] = await Promise.all([lieux(), tauxKm()]);
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="sliders" titre="Paramètres des libérations"
        description="Les lieux proposés dans les demandes et le taux kilométrique des frais de déplacement." />
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
    </div>
  );
}
