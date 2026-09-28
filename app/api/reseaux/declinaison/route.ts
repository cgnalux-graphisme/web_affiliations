import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import { messageErreurApi } from "../../../../lib/anthropic-erreurs";
import { STATUT_PUBLIE } from "../../../../lib/articles";
import { RESEAUX, estReseau, type Reseau, type VersionEnregistree } from "../../../../lib/reseaux";
import {
  MODELE_RESEAUX,
  SchemaDeclinaisons,
  consigneSysteme,
  finaliser,
  messageArticle,
  origineSite,
  schemaReseau,
  type ArticleSource,
  type ReponseDeclinaisons,
} from "../../../../lib/reseaux-ia";
import { getSuperAdmin, getSupabaseServer } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function erreur(message: string, status: number) {
  return NextResponse.json({ erreur: message }, { status });
}

/**
 * Décline un article publié en posts pour les réseaux avec Claude Sonnet 5, puis enregistre
 * chaque version dans site_publications_reseaux (mise à jour de la version existante, sinon ajout).
 * Entrée : { articleId, reseau? } — sans reseau, les 4 versions ; avec, une seule (régénération).
 * Rien n'est publié : Fred relit, corrige et copie-colle. Réservé aux super admins ; la clé API ne quitte
 * jamais le serveur.
 */
export async function POST(request: NextRequest) {
  if (!(await getSuperAdmin())) return erreur("Accès refusé. Reconnectez-vous.", 401);
  if (!process.env.ANTHROPIC_API_KEY) {
    return erreur("La déclinaison pour les réseaux n'est pas configurée : la variable ANTHROPIC_API_KEY manque sur le serveur.", 503);
  }

  const corps = (await request.json().catch(() => ({}))) as { articleId?: unknown; reseau?: unknown };
  const articleId = typeof corps.articleId === "string" && UUID.test(corps.articleId) ? corps.articleId : null;
  if (!articleId) return erreur("Article manquant.", 400);
  if (corps.reseau !== undefined && !estReseau(corps.reseau)) return erreur("Réseau inconnu.", 400);
  const reseaux: readonly Reseau[] = estReseau(corps.reseau) ? [corps.reseau] : RESEAUX;

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("site_articles")
    .select("titre, slug, statut, chapo, points_cles, contenu")
    .eq("id", articleId)
    .maybeSingle();
  if (error) return erreur("L'article ne peut pas être lu. Reconnectez-vous puis réessayez.", 500);
  if (!data) return erreur("Cet article n'existe plus.", 404);
  const article = data as ArticleSource & { slug: string; statut: string };
  if (article.statut !== STATUT_PUBLIE) {
    return erreur("Seul un article publié peut être décliné pour les réseaux. Publiez-le d'abord.", 409);
  }
  if (!article.contenu?.trim()) return erreur("L'article n'a pas de contenu à décliner.", 422);

  const lien = `${origineSite(request.nextUrl.origin)}/blog/${article.slug}`;
  const client = new Anthropic({ timeout: 180_000 });

  let reponse: Partial<ReponseDeclinaisons>;
  try {
    const schema = reseaux.length === 1 ? schemaReseau(reseaux[0]) : SchemaDeclinaisons;
    const resultat = await client.messages.parse({
      model: MODELE_RESEAUX,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: zodOutputFormat(schema) },
      system: consigneSysteme(reseaux),
      messages: [{ role: "user", content: messageArticle(article, lien, reseaux) }],
    });
    if (resultat.stop_reason === "refusal") {
      return erreur("L'IA a refusé de décliner cet article. Rédigez les posts vous-même.", 422);
    }
    if (resultat.stop_reason !== "end_turn" || !resultat.parsed_output) {
      console.error("déclinaison réseaux incomplète :", resultat.stop_reason);
      return erreur("L'IA a renvoyé une réponse vide ou incomplète. Réessayez.", 502);
    }
    reponse = resultat.parsed_output as Partial<ReponseDeclinaisons>;
  } catch (err) {
    console.error("déclinaison réseaux :", err);
    const { message, status } = messageErreurApi(err, "La génération des posts a échoué. Réessayez.");
    return erreur(message, status);
  }

  const contenus = Object.fromEntries(reseaux.map((r) => [r, finaliser(r, reponse, lien)])) as Partial<Record<Reseau, string>>;
  if (reseaux.some((r) => !contenus[r]?.trim())) {
    return erreur("L'IA a renvoyé une version vide. Réessayez.", 502);
  }

  // Enregistrement : une ligne par réseau et par article (la plus récente si plusieurs existent).
  const { data: existantes, error: errLecture } = await supabase
    .from("site_publications_reseaux")
    .select("id, reseau")
    .eq("article_id", articleId)
    .in("reseau", reseaux as Reseau[])
    .order("updated_at", { ascending: false });

  const versions: Partial<Record<Reseau, VersionEnregistree>> = {};
  let nonEnregistrees = Boolean(errLecture);
  for (const r of reseaux) {
    const contenu = contenus[r]!;
    versions[r] = { id: null, contenu };
    if (errLecture) continue;
    const id = (existantes ?? []).find((e) => e.reseau === r)?.id as string | undefined;
    const { data: ligne, error: errEcriture } = id
      ? await supabase
          .from("site_publications_reseaux")
          .update({ contenu, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("site_publications_reseaux")
          .insert({ article_id: articleId, reseau: r, contenu })
          .select("id")
          .maybeSingle();
    if (errEcriture || !ligne) {
      console.error("enregistrement déclinaison", r, errEcriture);
      nonEnregistrees = true;
    } else {
      versions[r] = { id: ligne.id as string, contenu };
    }
  }

  return NextResponse.json({
    versions,
    lien,
    avertissement: reponse.avertissement?.trim() ?? "",
    nonEnregistrees,
    modele: MODELE_RESEAUX,
  });
}
