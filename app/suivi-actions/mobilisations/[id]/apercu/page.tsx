import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import VueMobilisation from "../../../../mobilisation/VueMobilisation";
import { chargerMobilisationAdmin } from "../charger";

export const metadata: Metadata = {
  title: "Aperçu d'une mobilisation — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

/** La page campagne telle qu'elle apparaîtra, même si la mobilisation n'est pas (encore) mise en avant. */
export default async function ApercuMobilisationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await chargerMobilisationAdmin(id, `/suivi-actions/mobilisations/${id}/apercu`);
  const lien =
    "inline-flex items-center gap-1 text-sm font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux";
  return (
    <div className="-mx-4 -my-8 sm:-mx-6 lg:-mx-10">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-4 border-militant-rouge bg-white px-4 py-3 sm:px-6 lg:px-10">
        <p className="font-bold">
          Aperçu {m.actif ? "— mobilisation mise en avant" : "— pas encore mise en avant, invisible sur le site"}
        </p>
        <Link href="/suivi-actions/mobilisations" className={lien}>
          <ArrowLeft size={15} aria-hidden /> Toutes les mobilisations
        </Link>
        <Link href={`/suivi-actions/mobilisations/${m.id}/modifier`} className={lien}>
          <Pencil size={15} aria-hidden /> Modifier
        </Link>
      </div>
      <VueMobilisation m={m} apercu />
    </div>
  );
}
