import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Pencil } from "lucide-react";
import { Alerte, BTN, BTN_PETIT } from "../../../../_partage/ui";
import VueMobilisation from "../../../../../mobilisation/VueMobilisation";
import { chargerMobilisationAdmin } from "../charger";

export const metadata: Metadata = {
  title: "Aperçu d'une mobilisation — Espace CG",
  robots: { index: false, follow: false },
};

/** La page campagne telle qu'elle apparaîtra, même si la mobilisation n'est pas (encore) mise en avant. */
export default async function ApercuMobilisationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await chargerMobilisationAdmin(id, `/espace/actions/mobilisations/${id}/apercu`);
  return (
    <div className="ecg-ecran">
      <Alerte ton={m.actif ? "info" : "attention"} icone={m.actif ? Eye : EyeOff} role={null}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <b className="mr-auto">
            Aperçu : {m.actif ? "mobilisation mise en avant" : "pas encore mise en avant, invisible sur le site"}
          </b>
          <Link href="/espace/actions/mobilisations" className={`${BTN} ${BTN_PETIT}`}>
            <ArrowLeft size={15} aria-hidden /> Toutes les mobilisations
          </Link>
          <Link href={`/espace/actions/mobilisations/${m.id}/modifier`} className={`${BTN} ${BTN_PETIT}`}>
            <Pencil size={15} aria-hidden /> Modifier
          </Link>
        </div>
      </Alerte>
      {/* La page publique telle quelle, posée dans un cadre. */}
      <div className="ecg-panneau">
        <VueMobilisation m={m} apercu />
      </div>
    </div>
  );
}
