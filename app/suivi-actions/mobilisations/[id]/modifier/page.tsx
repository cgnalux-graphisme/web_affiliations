import type { Metadata } from "next";
import FormulaireMobilisation from "../../FormulaireMobilisation";
import { chargerMobilisationAdmin } from "../charger";

export const metadata: Metadata = {
  title: "Modifier une mobilisation — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

export default async function ModifierMobilisationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await chargerMobilisationAdmin(id, `/suivi-actions/mobilisations/${id}/modifier`);
  return <FormulaireMobilisation key={m.updated_at} mobilisation={m} />;
}
