import Link from "next/link";
import { Clock, ExternalLink, Eye, FileText, FileUp, Globe, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { CATEGORIE_EXPLICATION, RUBRIQUES, STATUT_PUBLIE, cheminPublic, dateArticle, type Categorie } from "../../../../lib/articles";
import { getSupabaseServer } from "../../../../lib/supabase-server";
import { exigerApp } from "../../../../lib/espace/acces";
import { BoutonPublication, SuppressionArticle } from "./BoutonsArticle";

import { Alerte, EnteteEcran, Panneau, Statut, Vide } from "../../_partage/ui";
type LigneArticle = {
  id: string;
  titre: string;
  slug: string;
  statut: string;
  date_publication: string | null;
  image_couverture: string | null;
  contenu: string | null;
};

/**
 * Liste de gestion d'une rubrique : le blog (« article ») ou « On vous explique » (« explication »).
 * Les deux partagent site_articles, distingués par la colonne categorie.
 */
export default async function ListePublications({
  categorie,
  enregistre,
  supprime,
}: {
  categorie: Categorie;
  enregistre?: string;
  supprime?: string;
}) {
  const rubrique = RUBRIQUES[categorie];
  const explication = categorie === CATEGORIE_EXPLICATION;
  await exigerApp("scan-news");

  const supabase = await getSupabaseServer();
  // Brouillons sans date en tête (travail en cours), puis du plus récent au plus ancien.
  const { data, error } = await supabase
    .from("site_articles")
    .select("id, titre, slug, statut, date_publication, image_couverture, contenu")
    .eq("categorie", categorie)
    .order("date_publication", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });

  const articles = (data ?? []) as LigneArticle[];
  const publies = articles.filter((a) => a.statut === STATUT_PUBLIE).length;
  const articleEnregistre = enregistre ? articles.find((a) => a.id === enregistre) : undefined;
  const maintenant = Date.now();
  const mot = explication ? "explication" : "article";

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone={explication ? "lightbulb" : "newspaper"}
        titre={explication ? "On vous explique" : "Articles"}
        description={
          !error &&
          `${articles.length} ${mot}${articles.length > 1 ? "s" : ""}, dont ${publies} publié${explication ? "e" : ""}${
            publies > 1 ? "s" : ""
          } dans ${rubrique.nom}.`
        }
        actions={
          explication ? (
            <Link href="/espace/scan-news/explications/nouvelle" className="ecg-btn ecg-btn-principal">
              <FileUp size={18} aria-hidden /> Importer une note
            </Link>
          ) : (
            <Link href="/espace/scan-news/articles/nouveau" className="ecg-btn ecg-btn-principal">
              <Plus size={18} aria-hidden /> Écrire un article
            </Link>
          )
        }
      />

      {articleEnregistre && (
        <Alerte ton="succes">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="min-w-0 flex-1">
              {explication ? "Explication enregistrée" : "Article enregistré"} : <b>{articleEnregistre.titre}</b>
            </span>
            {articleEnregistre.statut === STATUT_PUBLIE && (
              <Link href={cheminPublic(categorie, articleEnregistre.slug)} className="ecg-lien inline-flex items-center gap-1.5">
                Voir sur le site <ExternalLink size={15} aria-hidden />
              </Link>
            )}
          </span>
        </Alerte>
      )}

      {supprime && (
        <Alerte ton="succes" icone={Trash2}>
          {explication ? "Explication supprimée" : "Article supprimé"} : <b>{supprime}</b>
        </Alerte>
      )}

      {error ? (
        <Alerte ton="erreur">La liste ne peut pas être chargée. Rechargez la page ; si le problème persiste, reconnectez-vous.</Alerte>
      ) : articles.length === 0 ? (
        <Panneau>
          <Vide
            icone={explication ? "lightbulb" : "newspaper"}
            titre={explication ? "Aucune explication pour l'instant" : "Aucun article pour l'instant"}
          >
            {explication
              ? "Importez une note FGTB : l'IA la vulgarise, vous relisez, puis vous publiez."
              : "Écrivez le premier : il restera en brouillon tant que vous ne le publiez pas."}
          </Vide>
        </Panneau>
      ) : (
        <Panneau titre={explication ? "Explications" : "Articles"} sousTitre="Brouillons sans date en tête, puis du plus récent au plus ancien" corps={false}>
          <div className="ecg-tableau-cadre">
            <table className="ecg-tableau min-w-[760px]">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">{explication ? "Explication" : "Article"}</th>
                  <th scope="col">Statut</th>
                  <th scope="col" className="text-right">
                    Gestion
                  </th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => {
                  const publie = a.statut === STATUT_PUBLIE;
                  const programme =
                    publie && a.date_publication !== null && new Date(a.date_publication).getTime() > maintenant;
                  const cible = {
                    id: a.id,
                    titre: a.titre,
                    slug: a.slug,
                    statut: a.statut,
                    image_couverture: a.image_couverture,
                    date_publication: a.date_publication,
                    aContenu: Boolean(a.contenu?.trim()),
                    categorie,
                  };
                  return (
                    <tr key={a.id} className={a.id === articleEnregistre?.id ? "bg-[var(--app-pale)]" : undefined}>
                      <td className="ecg-chiffre whitespace-nowrap font-semibold">
                        {dateArticle(a.date_publication) || <span className="ecg-texte-doux font-normal">Sans date</span>}
                      </td>
                      <td className="min-w-[260px]">
                        <p className="break-words font-semibold leading-snug">{a.titre}</p>
                        {publie ? (
                          <Link
                            href={cheminPublic(categorie, a.slug)}
                            className="ecg-texte-doux mt-0.5 inline-flex max-w-full items-center gap-1 text-[13px] hover:underline"
                          >
                            <span className="truncate">{cheminPublic(categorie, a.slug)}</span>
                            <ExternalLink size={12} className="shrink-0" aria-hidden />
                          </Link>
                        ) : (
                          <Link
                            href={`/espace/scan-news/articles/${a.id}/apercu`}
                            className="ecg-texte-doux mt-0.5 inline-flex items-center gap-1 text-[13px] hover:underline"
                          >
                            <Eye size={12} aria-hidden /> Aperçu du brouillon
                          </Link>
                        )}
                      </td>
                      <td>
                        {publie ? (
                          <Statut ton={programme ? "info" : "ok"} icone={programme ? Clock : Globe}>
                            {programme ? "Programmé" : "Publié"}
                            {explication ? "e" : ""}
                          </Statut>
                        ) : (
                          <Statut icone={FileText}>Brouillon</Statut>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-start justify-end gap-2">
                          <Link
                            href={`/espace/scan-news/articles/${a.id}/modifier`}
                            aria-label={`Modifier : ${a.titre}`}
                            className="ecg-btn ecg-btn-petit"
                          >
                            <Pencil size={14} aria-hidden /> Modifier
                          </Link>
                          {publie && (
                            <Link
                              href={`/espace/scan-news/articles/${a.id}/reseaux`}
                              aria-label={`Décliner pour les réseaux : ${a.titre}`}
                              title="Décliner pour les réseaux"
                              className="ecg-btn ecg-btn-petit"
                            >
                              <Share2 size={14} aria-hidden /> Réseaux
                            </Link>
                          )}
                          <BoutonPublication article={cible} />
                          <SuppressionArticle article={cible} compact />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panneau>
      )}
    </div>
  );
}
