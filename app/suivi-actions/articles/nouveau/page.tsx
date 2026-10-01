import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { compterMots } from "../../../../lib/matiere";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";
import type { AnalyseEnregistree } from "../../../../lib/veille-tri";
import FormulaireArticle, { type PreRemplissage } from "../FormulaireArticle";
import type { SourcePanneau } from "../PanneauRedaction";

export const metadata: Metadata = {
  title: "Nouvel article — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LigneVeille = { id: string; titre: string; lien: string; source_nom: string | null; resume: string | null };

const ligneSource = (nom: string | null, lien: string) => (nom ? `${nom} – ${lien}` : lien);

/**
 * Nouvel article.
 * - ?veille=<id> : pré-rempli depuis un article du fil (titre + lien en source) ;
 * - ?analyse=<id>&sujet=<n> : pré-rempli depuis un sujet du Check IA (intitulé, liens de toutes ses sources,
 *   angle en consignes) ; la rédaction assistée part de tous ses articles encore présents dans le fil.
 * &ia=1 : ouvert depuis « Brouillon IA », le panneau de rédaction assistée reçoit le focus.
 */
export default async function NouvelArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ veille?: string; analyse?: string; sujet?: string; ia?: string }>;
}) {
  const { veille, analyse, sujet, ia } = await searchParams;
  if (!(await getSuperAdmin())) {
    const requete = new URLSearchParams(Object.entries({ veille, analyse, sujet, ia }).filter(([, v]) => v) as [string, string][]);
    redirect(`/login?next=${encodeURIComponent(`/suivi-actions/articles/nouveau${requete.size ? `?${requete}` : ""}`)}`);
  }

  const supabase = await getSupabaseServer();
  let preRemplissage: PreRemplissage | undefined;
  let sourcesIA: SourcePanneau[] | undefined;
  let consignesIA: string | undefined;
  let origine: "fil" | "check-ia" | undefined;

  const index = Number(sujet);
  if (analyse && UUID.test(analyse) && Number.isInteger(index) && index >= 0) {
    const { data } = await supabase.from("site_veille_analyses").select("resultat").eq("id", analyse).maybeSingle();
    const s = (data?.resultat as AnalyseEnregistree["resultat"] | undefined)?.sujets?.[index];
    if (s) {
      origine = "check-ia";
      const ids = s.articles.map((a) => a.id);
      const { data: lignes } = await supabase.from("site_veille").select("id, titre, lien, source_nom, resume").in("id", ids);
      const presents = (lignes ?? []) as LigneVeille[];
      sourcesIA = s.articles
        .map((a): SourcePanneau | null => {
          const l = presents.find((p) => p.id === a.id);
          // L'adresse du classement : pour une alerte Google, celle du média, déjà retrouvée.
          return l ? { id: l.id, titre: l.titre, source: l.source_nom, lien: a.lien, resumeMots: compterMots(l.resume ?? ""), alerte: a.alerte } : null;
        })
        .filter((x): x is SourcePanneau => Boolean(x));
      preRemplissage = { titre: s.sujet, sources: s.articles.map((a) => ligneSource(a.source, a.lien)).join("\n") };
      consignesIA = s.angle ? `Angle à prendre : ${s.angle}` : undefined;
    }
  } else if (veille && UUID.test(veille)) {
    const { data } = await supabase.from("site_veille").select("id, titre, lien, source_nom, resume").eq("id", veille).maybeSingle();
    if (data) {
      const l = data as LigneVeille;
      origine = "fil";
      sourcesIA = [{ id: l.id, titre: l.titre, source: l.source_nom, lien: l.lien, resumeMots: compterMots(l.resume ?? "") }];
      preRemplissage = { titre: l.titre, sources: ligneSource(l.source_nom, l.lien) };
    }
  }

  return (
    <FormulaireArticle
      key={analyse ? `${analyse}-${sujet}` : (veille ?? "vide")}
      preRemplissage={preRemplissage}
      sourcesIA={sourcesIA}
      consignesIA={consignesIA}
      origine={origine}
      mettreEnAvantIA={Boolean(sourcesIA?.length) && ia === "1"}
    />
  );
}
