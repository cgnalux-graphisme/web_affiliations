import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { slugValide } from "../../../lib/articles";
import { dateMobilisation } from "../../../lib/mobilisations";
import { chargerMobilisationActive } from "../../../lib/mobilisations-public";
import VueMobilisation from "../VueMobilisation";

// Une modification depuis l'espace admin est visible en moins d'une minute.
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

/** Seule la mobilisation mise en avant (vue site_accueil_mobilisation) a une page publique. */
async function charger(slug: string) {
  if (!slugValide(slug)) return null;
  const m = await chargerMobilisationActive();
  return m && m.slug === slug ? m : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await charger((await params).slug);
  if (!m) return { title: "Mobilisation introuvable — Centrale Générale FGTB Namur-Luxembourg" };
  const quand = [dateMobilisation(m.date_evenement), m.lieu].filter(Boolean).join(", ");
  const description = [quand, m.chapo].filter(Boolean).join(" — ") || undefined;
  return {
    title: `${m.titre} — Centrale Générale FGTB Namur-Luxembourg`,
    description,
    openGraph: {
      type: "website",
      title: m.titre,
      description,
      images: m.image_hero ? [m.image_hero] : undefined,
    },
  };
}

export default async function MobilisationPage({ params }: Props) {
  const m = await charger((await params).slug);
  if (!m) notFound();
  return <VueMobilisation m={m} />;
}
