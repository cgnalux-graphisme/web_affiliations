import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSuperAdmin, getSupabaseServer } from "../../../lib/supabase-server";
import GestionThemes, { type Theme } from "./GestionThemes";
import RepereSection from "../RepereSection";

export const metadata: Metadata = {
  title: "Thématiques — Scan News — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

export default async function ThemesPage() {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/themes");

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from("site_themes").select("id, mot_cle, actif").order("mot_cle");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="border-b-[6px] border-militant-charbon pb-5">
        <RepereSection />
        <h1 className="font-condensed text-5xl font-extrabold leading-none tracking-tight">Thématiques</h1>
        <p className="mt-2 max-w-2xl text-base">
          Les mots-clés qui rendent un article du{" "}
          <Link
            href="/suivi-actions/veille"
            className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
          >
            fil
          </Link>{" "}
          pertinent. Un article est retenu s&apos;il contient au moins un mot-clé actif dans son titre ou son résumé.
          Rien n&apos;est effacé : un changement ici re-filtre le fil tout de suite.
        </p>
      </div>
      {error ? (
        <p role="alert" className="mt-8 border-l-[6px] border-militant-bordeaux py-2 pl-4 text-lg">
          La liste des mots-clés ne peut pas être chargée. Rechargez la page ; si le problème persiste, reconnectez-vous.
        </p>
      ) : (
        <GestionThemes themes={(data ?? []) as Theme[]} />
      )}
    </div>
  );
}
