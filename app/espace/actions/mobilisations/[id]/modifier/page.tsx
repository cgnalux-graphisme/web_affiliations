import type { Metadata } from "next";
import FormulaireMobilisation from "../../FormulaireMobilisation";
import { chargerMobilisationAdmin } from "../charger";

export const metadata: Metadata = {
  title: "Modifier une mobilisation — Espace CG",
  robots: { index: false, follow: false },
};

export default async function ModifierMobilisationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await chargerMobilisationAdmin(id, `/espace/actions/mobilisations/${id}/modifier`);
  return <FormulaireMobilisation key={m.updated_at} mobilisation={m} />;
}
